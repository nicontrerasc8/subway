import "server-only";

import { executiveDashboardRoles } from "@/lib/auth/roles";
import { requireRoleAccess } from "@/lib/auth/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/types/database";
import {
  getPayloadCliente,
  getPayloadEjecutivo,
  getPayloadNegocio,
  getPayloadPipeline,
  getPayloadPipelineMonto,
  getPayloadYear,
  isRecord,
  normalizeComparableText,
  normalizeSituation,
  normalizeText,
  parseMonthIndex,
} from "@/modules/dashboard/services/import-payload";

export type BacklogMatrixSummary = {
  years: number[];
  negocios: string[];
  situaciones: string[];
  etapas: string[];
  ejecutivos: string[];
  lineas: string[];
  debugPayloadRows?: Array<{
    importId: string | null;
    fileName: string | null;
    rowNumber: number | null;
    parseStatus: string | null;
    tipoPipeline: string | null;
    pipelineMonto: number | null;
    ventasMonto: number | null;
    proyeccionMonto: number | null;
    situacion: string | null;
    payload: Record<string, unknown>;
  }>;
  rows: Array<{
    importYear: number | null;
    negocio: string | null;
    linea: string | null;
    cliente: string | null;
    etapa: string | null;
    situacion: string | null;
    ejecutivo: string | null;
    monthIndex: number | null;
    ventasMonto: number;
  }>;
};

export async function getBacklogMatrixSummary(): Promise<BacklogMatrixSummary> {
  await requireRoleAccess([...executiveDashboardRoles] as AppRole[]);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("imports_subway")
    .select("data, status")
    .eq("status", "processed");

  if (error || !data) {
    return {
      negocios: [],
      years: [],
      situaciones: [],
      etapas: [],
      ejecutivos: [],
      lineas: [],
      rows: [],
    };
  }

  const candidateRows: BacklogMatrixSummary["rows"] = [];
  const explicitBacklogRows: BacklogMatrixSummary["rows"] = [];

  for (const item of data as Array<{ data?: unknown }>) {
    if (!isRecord(item.data) || !Array.isArray(item.data.rows)) continue;

    for (const rawRow of item.data.rows) {
      if (!isRecord(rawRow) || !isRecord(rawRow.payload)) continue;

      const payload = rawRow.payload;
      const tipoPipeline = getPayloadPipeline(payload);
      const negocio = getPayloadNegocio(payload);
      const importYear = getPayloadYear(payload.anio);
      const linea = normalizeText(payload.linea);
      const cliente = getPayloadCliente(payload);
      const etapa = normalizeComparableText(payload.etapa);
      const situacion = normalizeSituation(payload.situacion);
      const ejecutivo = getPayloadEjecutivo(payload);
      const monthIndex = parseMonthIndex(payload.mes);
      const ventasMonto = getPayloadPipelineMonto(payload);

      if (ventasMonto === null) continue;

      const row = {
        importYear,
        negocio,
        linea,
        cliente,
        etapa,
        situacion,
        ejecutivo,
        monthIndex,
        ventasMonto,
      };

      candidateRows.push(row);
      if (tipoPipeline === "backlog") explicitBacklogRows.push(row);
    }
  }

  const rows = explicitBacklogRows.length > 0 ? explicitBacklogRows : candidateRows;
  const negocioSet = new Set<string>();
  const yearSet = new Set<number>();
  const situacionSet = new Set<string>();
  const etapaSet = new Set<string>();
  const ejecutivoSet = new Set<string>();
  const lineaSet = new Set<string>();

  for (const row of rows) {
    if (row.importYear !== null) yearSet.add(row.importYear);
    if (row.negocio) negocioSet.add(row.negocio);
    if (row.etapa) etapaSet.add(row.etapa);
    if (row.situacion) situacionSet.add(row.situacion);
    if (row.ejecutivo) ejecutivoSet.add(row.ejecutivo);
    if (row.linea) lineaSet.add(row.linea);
  }

  return {
    years: [...yearSet].sort((a, b) => b - a),
    negocios: [...negocioSet].sort((a, b) => a.localeCompare(b)),
    situaciones: [...situacionSet].sort((a, b) => a.localeCompare(b)),
    etapas: [...etapaSet].sort((a, b) => a.localeCompare(b)),
    ejecutivos: [...ejecutivoSet].sort((a, b) => a.localeCompare(b)),
    lineas: [...lineaSet].sort((a, b) => a.localeCompare(b)),
    rows,
  };
}

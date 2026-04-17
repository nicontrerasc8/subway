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

export type ProjectionMatrixSummary = {
  years: number[];
  negocios: string[];
  situaciones: string[];
  etapas: string[];
  ejecutivos: string[];
  lineas: string[];
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

export async function getProjectionMatrixSummary(): Promise<ProjectionMatrixSummary> {
  await requireRoleAccess([...executiveDashboardRoles] as AppRole[]);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("imports_subway")
    .select("data, status")
    .eq("status", "processed");

  if (error || !data) {
    return { years: [], negocios: [], situaciones: [], etapas: [], ejecutivos: [], lineas: [], rows: [] };
  }

  const negocioSet = new Set<string>();
  const yearSet = new Set<number>();
  const situacionSet = new Set<string>();
  const etapaSet = new Set<string>();
  const ejecutivoSet = new Set<string>();
  const lineaSet = new Set<string>();
  const rows: ProjectionMatrixSummary["rows"] = [];

  for (const item of data as Array<{ data?: unknown }>) {
    if (!isRecord(item.data) || !Array.isArray(item.data.rows)) continue;

    for (const rawRow of item.data.rows) {
      if (!isRecord(rawRow) || !isRecord(rawRow.payload)) continue;

      const payload = rawRow.payload;
      const tipoPipeline = getPayloadPipeline(payload);
      const pipelineMonto = getPayloadPipelineMonto(payload);

      if (tipoPipeline === "backlog") continue;

      const negocio = getPayloadNegocio(payload);
      const importYear = getPayloadYear(payload.anio);
      const linea = normalizeText(payload.linea);
      const cliente = getPayloadCliente(payload);
      const etapa = normalizeComparableText(payload.etapa);
      const situacion = normalizeSituation(payload.situacion);
      const ejecutivo = getPayloadEjecutivo(payload);
      const monthIndex = parseMonthIndex(payload.mes);
      const ventasMonto = pipelineMonto;

      if (ventasMonto === null) continue;
      if (importYear !== null) yearSet.add(importYear);
      if (negocio) negocioSet.add(negocio);
      if (etapa) etapaSet.add(etapa);
      if (situacion) situacionSet.add(situacion);
      if (ejecutivo) ejecutivoSet.add(ejecutivo);
      if (linea) lineaSet.add(linea);

      rows.push({
        importYear,
        negocio,
        linea,
        cliente,
        etapa,
        situacion,
        ejecutivo,
        monthIndex,
        ventasMonto,
      });
    }
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

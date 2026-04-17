import "server-only";

import { executiveDashboardRoles } from "@/lib/auth/roles";
import { requireRoleAccess } from "@/lib/auth/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/types/database";
import {
  getPayloadCliente,
  getPayloadEjecutivo,
  getPayloadNegocio,
  getPayloadVentasMonto,
  getPayloadYear,
  isRecord,
  normalizeText,
} from "@/modules/dashboard/services/import-payload";

export type SalesByClientRow = {
  importYear: number | null;
  cliente: string;
  negocio: string | null;
  linea: string | null;
  ejecutivo: string | null;
  ventasMonto: number;
};

export type SalesByClientSummary = {
  years: number[];
  negocios: string[];
  lineas: string[];
  ejecutivos: string[];
  rows: SalesByClientRow[];
};

export async function getSalesByClientSummary(): Promise<SalesByClientSummary> {
  await requireRoleAccess([...executiveDashboardRoles] as AppRole[]);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("imports_subway")
    .select("data, status")
    .eq("status", "processed")
    .order("uploaded_at", { ascending: false });

  if (error || !data) {
    return {
      years: [],
      negocios: [],
      lineas: [],
      ejecutivos: [],
      rows: [],
    };
  }

  const rows: SalesByClientRow[] = [];
  const yearSet = new Set<number>();
  const negocioSet = new Set<string>();
  const lineaSet = new Set<string>();
  const ejecutivoSet = new Set<string>();

  for (const item of data as Array<{ data?: unknown }>) {
    if (!isRecord(item.data) || !Array.isArray(item.data.rows)) continue;

    for (const rawRow of item.data.rows) {
      if (!isRecord(rawRow) || !isRecord(rawRow.payload)) continue;

      const payload = rawRow.payload;
      const cliente = getPayloadCliente(payload);
      const ventasMonto = getPayloadVentasMonto(payload);
      const negocio = getPayloadNegocio(payload);
      const linea = normalizeText(payload.linea);
      const ejecutivo = getPayloadEjecutivo(payload);
      const importYear = getPayloadYear(payload.anio);

      if (!cliente || ventasMonto === null) continue;

      if (importYear !== null) yearSet.add(importYear);
      if (negocio) negocioSet.add(negocio);
      if (linea) lineaSet.add(linea);
      if (ejecutivo) ejecutivoSet.add(ejecutivo);

      rows.push({
        importYear,
        cliente,
        negocio,
        linea,
        ejecutivo,
        ventasMonto,
      });
    }
  }

  return {
    years: [...yearSet].sort((a, b) => b - a),
    negocios: [...negocioSet].sort((a, b) => a.localeCompare(b)),
    lineas: [...lineaSet].sort((a, b) => a.localeCompare(b)),
    ejecutivos: [...ejecutivoSet].sort((a, b) => a.localeCompare(b)),
    rows,
  };
}

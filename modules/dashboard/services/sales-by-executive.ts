import "server-only";

import { executiveDashboardRoles } from "@/lib/auth/roles";
import { requireRoleAccess } from "@/lib/auth/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/types/database";
import {
  getPayloadNegocio,
  getPayloadVentasMonto,
  getPayloadYear,
  hasFacturacion,
  isRecord,
  normalizeText,
  parseMonthIndex,
} from "@/modules/dashboard/services/import-payload";

export type SalesByExecutiveRow = {
  importYear: number | null;
  monthIndex: number | null;
  negocio: string | null;
  linea: string | null;
  ejecutivo: string;
  ventasMonto: number;
};

export type SalesByExecutiveSummary = {
  years: number[];
  negocios: string[];
  lineas: string[];
  ejecutivos: string[];
  rows: SalesByExecutiveRow[];
};

export async function getSalesByExecutiveSummary(): Promise<SalesByExecutiveSummary> {
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

  const rows: SalesByExecutiveRow[] = [];
  const yearSet = new Set<number>();
  const negocioSet = new Set<string>();
  const lineaSet = new Set<string>();
  const ejecutivoSet = new Set<string>();

  for (const item of data as Array<{ data?: unknown }>) {
    if (!isRecord(item.data) || !Array.isArray(item.data.rows)) continue;

    for (const rawRow of item.data.rows) {
      if (!isRecord(rawRow) || !isRecord(rawRow.payload)) continue;

      const payload = rawRow.payload;
      if (!hasFacturacion(payload)) continue;

      const ejecutivo = normalizeText(payload.ejecutivo);
      const ventasMonto = getPayloadVentasMonto(payload);
      const negocio = getPayloadNegocio(payload);
      const linea = normalizeText(payload.linea);
      const monthIndex = parseMonthIndex(payload.mes);
      const importYear = getPayloadYear(payload.anio);

      if (!ejecutivo || ventasMonto === null) continue;

      if (importYear !== null) yearSet.add(importYear);
      ejecutivoSet.add(ejecutivo);
      if (negocio) negocioSet.add(negocio);
      if (linea) lineaSet.add(linea);

      rows.push({
        importYear,
        monthIndex,
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

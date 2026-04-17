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
} from "@/modules/dashboard/services/import-payload";

export type BillingByLineRow = {
  importYear: number | null;
  linea: string;
  negocio: string | null;
  ventasMonto: number;
};

export type BillingByLineSummary = {
  years: number[];
  negocios: string[];
  rows: BillingByLineRow[];
};

export async function getBillingByLineSummary(): Promise<BillingByLineSummary> {
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
      rows: [],
    };
  }

  const rows: BillingByLineRow[] = [];
  const yearSet = new Set<number>();
  const negocioSet = new Set<string>();

  for (const item of data as Array<{ data?: unknown }>) {
    if (!isRecord(item.data) || !Array.isArray(item.data.rows)) continue;

    for (const rawRow of item.data.rows) {
      if (!isRecord(rawRow) || !isRecord(rawRow.payload)) continue;

      const payload = rawRow.payload;
      if (!hasFacturacion(payload)) continue;

      const linea = normalizeText(payload.linea);
      const negocio = getPayloadNegocio(payload);
      const ventasMonto = getPayloadVentasMonto(payload);
      const importYear = getPayloadYear(payload.anio);

      if (!linea || ventasMonto === null) continue;

      if (importYear !== null) yearSet.add(importYear);
      if (negocio) negocioSet.add(negocio);

      rows.push({
        importYear,
        linea,
        negocio,
        ventasMonto,
      });
    }
  }

  return {
    years: [...yearSet].sort((a, b) => b - a),
    negocios: [...negocioSet].sort((a, b) => a.localeCompare(b)),
    rows,
  };
}

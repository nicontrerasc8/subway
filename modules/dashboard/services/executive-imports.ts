import "server-only";

import { requireRoleAccess } from "@/lib/auth/authorization";
import { sellerDashboardRoles } from "@/lib/auth/roles";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getPayloadCliente,
  getPayloadNegocio,
  getPayloadPipeline,
  getPayloadPipelineMonto,
  getPayloadVentasMonto,
  getPayloadYear,
  isRecord,
  normalizeComparableText,
  normalizeSituation,
  normalizeText,
  parseMonthIndex,
} from "@/modules/dashboard/services/import-payload";

type ImportRow = {
  anio: number | null;
  data?: unknown;
};

export type ExecutiveImportRow = {
  importYear: number | null;
  cliente: string | null;
  negocio: string | null;
  linea: string | null;
  etapa: string | null;
  situacion: string | null;
  monthIndex: number | null;
  tipoPipeline: string | null;
  ventasMonto: number | null;
  pipelineMonto: number | null;
  fechaFacturacion: string | null;
  ejecutivo: string | null;
};

export async function getExecutiveImportRows() {
  const user = await requireRoleAccess([...sellerDashboardRoles]);
  const normalizedUserName = normalizeComparableText(user.fullName);

  if (!normalizedUserName) {
    return [] as ExecutiveImportRow[];
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("imports_subway")
    .select("anio, data, status")
    .eq("status", "processed")
    .order("anio", { ascending: false });

  if (error || !data) {
    return [] as ExecutiveImportRow[];
  }

  const rows: ExecutiveImportRow[] = [];

  for (const item of data as ImportRow[]) {
    if (!isRecord(item.data) || !Array.isArray(item.data.rows)) continue;

    for (const rawRow of item.data.rows) {
      if (!isRecord(rawRow) || !isRecord(rawRow.payload)) continue;

      const payload = rawRow.payload;
      const ejecutivo = normalizeComparableText(payload.ejecutivo);

      if (ejecutivo !== normalizedUserName) continue;

      rows.push({
        importYear: getPayloadYear(payload.anio) ?? item.anio,
        cliente: getPayloadCliente(payload),
        negocio: getPayloadNegocio(payload),
        linea: normalizeText(payload.linea),
        etapa: normalizeComparableText(payload.etapa),
        situacion: normalizeSituation(payload.situacion),
        monthIndex: parseMonthIndex(payload.mes),
        tipoPipeline: getPayloadPipeline(payload),
        ventasMonto: getPayloadVentasMonto(payload),
        pipelineMonto: getPayloadPipelineMonto(payload),
        fechaFacturacion: normalizeText(payload.fecha_facturacion),
        ejecutivo: normalizeText(payload.ejecutivo),
      });
    }
  }

  return rows;
}

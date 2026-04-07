import "server-only";

import type { SalesByClientSummary } from "@/modules/dashboard/services/sales-by-client";
import { getExecutiveImportRows } from "@/modules/dashboard/services/executive-imports";

export async function getExecutiveSalesByClientSummary(): Promise<SalesByClientSummary> {
  const importRows = await getExecutiveImportRows();

  const rows: SalesByClientSummary["rows"] = [];
  const yearSet = new Set<number>();
  const negocioSet = new Set<string>();
  const lineaSet = new Set<string>();
  const ejecutivoSet = new Set<string>();

  for (const row of importRows) {
    if (!row.cliente || row.ventasMonto === null) continue;

    if (row.importYear !== null) yearSet.add(row.importYear);
    if (row.negocio) negocioSet.add(row.negocio);
    if (row.linea) lineaSet.add(row.linea);
    if (row.ejecutivo) ejecutivoSet.add(row.ejecutivo);

    rows.push({
      importYear: row.importYear,
      cliente: row.cliente,
      negocio: row.negocio,
      linea: row.linea,
      ejecutivo: row.ejecutivo,
      ventasMonto: row.ventasMonto,
    });
  }

  return {
    years: [...yearSet].sort((a, b) => b - a),
    negocios: [...negocioSet].sort((a, b) => a.localeCompare(b)),
    lineas: [...lineaSet].sort((a, b) => a.localeCompare(b)),
    ejecutivos: [...ejecutivoSet].sort((a, b) => a.localeCompare(b)),
    rows,
  };
}

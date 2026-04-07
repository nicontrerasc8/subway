import "server-only";

import { getExecutiveImportRows } from "@/modules/dashboard/services/executive-imports";

export type SellerDashboardRow = {
  anio: number | null;
  cliente: string;
  negocio: string | null;
  linea: string | null;
  situacion: string | null;
  ventasMonto: number;
  fechaFacturacion: string | null;
};

export type SellerDashboardSummary = {
  years: number[];
  negocios: string[];
  lineas: string[];
  totalVentas: number;
  totalFacturado: number;
  registros: number;
  clientesActivos: number;
  rows: SellerDashboardRow[];
};

export async function getSellerDashboardSummary(): Promise<SellerDashboardSummary> {
  const importRows = await getExecutiveImportRows();

  const years = new Set<number>();
  const negocioSet = new Set<string>();
  const lineaSet = new Set<string>();
  const clientSet = new Set<string>();

  const rows = importRows.map((row) => {
    const cliente = row.cliente ?? "Cliente sin nombre";
    const ventasMonto = row.ventasMonto ?? 0;

    if (row.importYear !== null) years.add(row.importYear);
    if (row.negocio) negocioSet.add(row.negocio);
    if (row.linea) lineaSet.add(row.linea);
    clientSet.add(cliente);

    return {
      anio: row.importYear,
      cliente,
      negocio: row.negocio,
      linea: row.linea,
      situacion: row.situacion,
      ventasMonto,
      fechaFacturacion: row.fechaFacturacion,
    } satisfies SellerDashboardRow;
  });

  return {
    years: [...years].sort((a, b) => b - a),
    negocios: [...negocioSet].sort((a, b) => a.localeCompare(b)),
    lineas: [...lineaSet].sort((a, b) => a.localeCompare(b)),
    totalVentas: rows.reduce((sum, row) => sum + row.ventasMonto, 0),
    totalFacturado: rows
      .filter((row) => row.fechaFacturacion)
      .reduce((sum, row) => sum + row.ventasMonto, 0),
    registros: rows.length,
    clientesActivos: clientSet.size,
    rows: rows.sort((a, b) => b.ventasMonto - a.ventasMonto),
  };
}

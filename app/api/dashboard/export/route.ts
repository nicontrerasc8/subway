import ExcelJS from "exceljs";

import { getDashboardCommercialInsights } from "@/modules/dashboard/services/dashboard-commercial-insights";
import { getDashboardBranches } from "@/modules/dashboard/services/dashboard-branches";
import { getDashboardMix } from "@/modules/dashboard/services/dashboard-mix";
import { getDashboardOverview, type DashboardOverviewSearchParams } from "@/modules/dashboard/services/dashboard-overview";
import { getDashboardPayments } from "@/modules/dashboard/services/dashboard-payments";

export const runtime = "nodejs";

type ExportCellValue = string | number | null;
type ExportRow = Record<string, ExportCellValue>;

function getParam(request: Request, key: string) {
  return new URL(request.url).searchParams.get(key);
}

function getDashboardSearchParams(request: Request): DashboardOverviewSearchParams {
  const params = new URL(request.url).searchParams;

  return {
    year: params.getAll("year"),
    month: params.getAll("month"),
    yearFrom: params.get("yearFrom") ?? undefined,
    yearTo: params.get("yearTo") ?? undefined,
    monthFrom: params.get("monthFrom") ?? undefined,
    monthTo: params.get("monthTo") ?? undefined,
    branch: params.get("branch") ?? undefined,
  };
}

function isWithinDateRange(row: { fecha: string }, dateFrom: string | null, dateTo: string | null) {
  const start = dateFrom && dateTo && dateFrom > dateTo ? dateTo : dateFrom;
  const end = dateFrom && dateTo && dateFrom > dateTo ? dateFrom : dateTo;

  if (start && row.fecha < start) return false;
  if (end && row.fecha > end) return false;
  return true;
}

function addWorksheet(workbook: ExcelJS.Workbook, name: string, rows: ExportRow[]) {
  const worksheet = workbook.addWorksheet(name.slice(0, 31));
  const headers = Object.keys(rows[0] ?? { Estado: "" });

  worksheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: Math.min(Math.max(header.length + 6, 16), 42),
  }));
  worksheet.addRows(rows.length ? rows : [{ Estado: "Sin datos para la vista actual" }]);

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF123524" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, rows.length + 1), column: headers.length },
  };
}

function getYear(value: string) {
  return value.slice(0, 4);
}

function summarizeByBranch(rows: Array<{ branchId: number | null; branch: string; sales: number; units: number; operations: number; products: number }>) {
  return Array.from(
    rows.reduce((map, row) => {
      const key = String(row.branchId ?? row.branch);
      const current = map.get(key) ?? {
        branchId: row.branchId,
        branch: row.branch,
        sales: 0,
        units: 0,
        operations: 0,
        products: 0,
        days: 0,
      };
      current.sales += row.sales;
      current.units += row.units;
      current.operations += row.operations;
      current.products += row.products;
      current.days += 1;
      map.set(key, current);
      return map;
    }, new Map<string, { branchId: number | null; branch: string; sales: number; units: number; operations: number; products: number; days: number }>()),
  )
    .map(([, row]) => ({
      "Sucursal ID": row.branchId,
      Sucursal: row.branch,
      Ventas: row.sales,
      Unidades: row.units,
      Operaciones: row.operations,
      "Ticket promedio": row.operations > 0 ? row.sales / row.operations : 0,
      "SKUs promedio": row.days > 0 ? row.products / row.days : 0,
    }))
    .sort((a, b) => Number(b.Ventas) - Number(a.Ventas));
}

function summarizePaymentsByBranch(rows: Array<{ branchId: number | null; branch: string; amount: number; operations: number }>) {
  return Array.from(
    rows.reduce((map, row) => {
      const key = String(row.branchId ?? row.branch);
      const current = map.get(key) ?? { branchId: row.branchId, branch: row.branch, amount: 0, operations: 0 };
      current.amount += row.amount;
      current.operations += row.operations;
      map.set(key, current);
      return map;
    }, new Map<string, { branchId: number | null; branch: string; amount: number; operations: number }>()),
  )
    .map(([, row]) => ({
      "Sucursal ID": row.branchId,
      Sucursal: row.branch,
      Importe: row.amount,
      Operaciones: row.operations,
      "Ticket promedio": row.operations > 0 ? row.amount / row.operations : 0,
    }))
    .sort((a, b) => Number(b.Importe) - Number(a.Importe));
}

function summarizePaymentMix(rows: Array<{ method: string; amount: number; operations: number }>) {
  return Array.from(
    rows.reduce((map, row) => {
      const current = map.get(row.method) ?? { amount: 0, operations: 0 };
      current.amount += row.amount;
      current.operations += row.operations;
      map.set(row.method, current);
      return map;
    }, new Map<string, { amount: number; operations: number }>()),
  )
    .map(([method, row]) => ({
      "Forma de pago": method,
      Importe: row.amount,
      Operaciones: row.operations,
    }))
    .sort((a, b) => Number(b.Importe) - Number(a.Importe));
}

function getDeliveryPlatform(value: string) {
  const normalized = value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase();
  if (normalized.includes("PEYA") || normalized.includes("PEDIDOS")) return "Peya";
  if (normalized.includes("RAPPI")) return "Rappi";
  if (normalized.includes("TURBO")) return "Turbo";
  if (normalized.includes("DIDI")) return "Didi";
  return null;
}

function summarizeDelivery(rows: Array<{ fecha: string; method: string; amount: number; operations: number }>) {
  return Array.from(
    rows.reduce((map, row) => {
      const platform = getDeliveryPlatform(row.method);
      if (!platform) return map;
      const year = getYear(row.fecha);
      const key = `${platform}-${year}`;
      const current = map.get(key) ?? { platform, year, sales: 0, transactions: 0 };
      current.sales += row.amount;
      current.transactions += row.operations;
      map.set(key, current);
      return map;
    }, new Map<string, { platform: string; year: string; sales: number; transactions: number }>()),
  )
    .map(([, row]) => ({
      App: row.platform,
      Año: row.year,
      Ventas: row.sales,
      Transacciones: row.transactions,
      "Ticket promedio": row.transactions > 0 ? row.sales / row.transactions : 0,
    }))
    .sort((a, b) => String(a.App).localeCompare(String(b.App)) || Number(a.Año) - Number(b.Año));
}

function summarizeCategories(rows: Array<{ category: string; units: number; sales: number }>) {
  const totalUnits = rows.reduce((sum, row) => sum + row.units, 0);

  return Array.from(
    rows.reduce((map, row) => {
      const current = map.get(row.category) ?? { sales: 0, units: 0 };
      current.sales += row.sales;
      current.units += row.units;
      map.set(row.category, current);
      return map;
    }, new Map<string, { sales: number; units: number }>()),
  )
    .map(([category, row]) => ({
      Categoría: category,
      Ventas: row.sales,
      Unidades: row.units,
      Participación: totalUnits > 0 ? row.units / totalUnits : 0,
    }))
    .sort((a, b) => Number(b.Ventas) - Number(a.Ventas));
}

function summarizeProducts(rows: Array<{ reference: string; product: string; category: string; units: number; sales: number }>) {
  return Array.from(
    rows.reduce((map, row) => {
      const key = row.reference || row.product;
      const current = map.get(key) ?? {
        reference: row.reference,
        product: row.product,
        category: row.category,
        sales: 0,
        units: 0,
      };
      current.sales += row.sales;
      current.units += row.units;
      map.set(key, current);
      return map;
    }, new Map<string, { reference: string; product: string; category: string; sales: number; units: number }>()),
  )
    .map(([, row]) => ({
      Referencia: row.reference,
      Producto: row.product,
      Categoría: row.category,
      Ventas: row.sales,
      Unidades: row.units,
    }))
    .sort((a, b) => Number(b.Ventas) - Number(a.Ventas));
}

function overviewKpis(rows: Array<{ sales: number; units: number; operations: number; products: number; paymentAmount: number; reconciliationDelta: number }>) {
  const sales = rows.reduce((sum, row) => sum + row.sales, 0);
  const units = rows.reduce((sum, row) => sum + row.units, 0);
  const operations = rows.reduce((sum, row) => sum + row.operations, 0);
  const products = rows.reduce((sum, row) => sum + row.products, 0);
  const paymentAmount = rows.reduce((sum, row) => sum + row.paymentAmount, 0);
  const reconciliationDelta = rows.reduce((sum, row) => sum + row.reconciliationDelta, 0);

  return [
    { Indicador: "Ventas totales", Valor: sales },
    { Indicador: "Unidades", Valor: units },
    { Indicador: "Operaciones", Valor: operations },
    { Indicador: "Ticket promedio", Valor: operations > 0 ? paymentAmount / operations : 0 },
    { Indicador: "Productos por día", Valor: rows.length > 0 ? products / rows.length : 0 },
    { Indicador: "Diferencia de cuadre", Valor: reconciliationDelta },
  ];
}

async function buildWorkbook(request: Request) {
  const section = getParam(request, "section") ?? "summary";
  const view = getParam(request, "view") ?? "daily";
  const dateFrom = getParam(request, "dateFrom");
  const dateTo = getParam(request, "dateTo");
  const searchParams = getDashboardSearchParams(request);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Subway dashboard";
  workbook.created = new Date();

  if (section === "branches") {
    const branches = await getDashboardBranches(searchParams);
    const rows = branches.dailyRows.filter((row) => isWithinDateRange(row, dateFrom, dateTo));
    if (view === "ranking") addWorksheet(workbook, "Ranking sucursales", summarizeByBranch(rows));
    if (view === "trends") {
      addWorksheet(workbook, "Tendencia diaria", rows.map((row) => ({ Fecha: row.fecha, Sucursal: row.branch, Año: getYear(row.fecha), Ventas: row.sales, Unidades: row.units, Operaciones: row.operations })));
    }
    if (view === "daily") addWorksheet(workbook, "Detalle diario", rows.map((row) => ({ Fecha: row.fecha, "Sucursal ID": row.branchId, Sucursal: row.branch, Ventas: row.sales, Unidades: row.units, Operaciones: row.operations, SKUs: row.products })));
  }

  if (section === "payments" || section === "delivery") {
    const payments = await getDashboardPayments(searchParams);
    const ticketRows = payments.ticketDailyRows.filter((row) => isWithinDateRange(row, dateFrom, dateTo));
    const paymentRows = payments.paymentDailyRows.filter((row) => isWithinDateRange(row, dateFrom, dateTo));

    if (section === "payments" && view === "mix") addWorksheet(workbook, "Mix pagos", summarizePaymentMix(paymentRows));
    if (section === "payments" && view === "ranking") addWorksheet(workbook, "Ranking pagos", summarizePaymentsByBranch(ticketRows));
    if (section === "payments" && view === "daily") addWorksheet(workbook, "Detalle pagos", paymentRows.map((row) => ({ Fecha: row.fecha, "Sucursal ID": row.branchId, Sucursal: row.branch, "Forma de pago": row.method, Importe: row.amount, Operaciones: row.operations })));
    if (section === "delivery") addWorksheet(workbook, `Delivery ${view}`, summarizeDelivery(paymentRows));
  }

  if (section === "mix" || section === "families") {
    const [mix, commercial] = await Promise.all([
      getDashboardMix(searchParams),
      getDashboardCommercialInsights(searchParams),
    ]);
    const categoryRows = mix.categoryDailyRows.filter((row) => isWithinDateRange(row, dateFrom, dateTo));
    const productRows = mix.productDailyRows.filter((row) => isWithinDateRange(row, dateFrom, dateTo));

    if (section === "mix" && view === "categories") addWorksheet(workbook, "Categorias", summarizeCategories(categoryRows));
    if (section === "mix" && view === "products") addWorksheet(workbook, "Productos", summarizeProducts(productRows));
    if (section === "mix" && view === "daily") {
      addWorksheet(workbook, "Categorias diario", categoryRows.map((row) => ({ Fecha: row.fecha, "Sucursal ID": row.branchId, Sucursal: row.branch, Categoría: row.category, Ventas: row.sales, Unidades: row.units })));
      addWorksheet(workbook, "Productos diario", productRows.map((row) => ({ Fecha: row.fecha, "Sucursal ID": row.branchId, Sucursal: row.branch, Referencia: row.reference, Producto: row.product, Categoría: row.category, Ventas: row.sales, Unidades: row.units })));
    }
    if (section === "families" && view === "comparison") addWorksheet(workbook, "Comparativo familias", summarizeCategories(categoryRows));
    if (section === "families" && view === "share") {
      const shares = categoryRows.length ? summarizeCategories(categoryRows) : commercial.productGroupShares.map((row) => ({ Categoría: row.label, Ventas: 0, Unidades: row.units, Participación: row.share }));
      addWorksheet(workbook, "Participacion familias", shares);
    }
    if (section === "families" && view === "daily") addWorksheet(workbook, "Familias diario", categoryRows.map((row) => ({ Fecha: row.fecha, "Sucursal ID": row.branchId, Sucursal: row.branch, Categoría: row.category, Ventas: row.sales, Unidades: row.units })));
  }

  if (section === "summary") {
    const overview = await getDashboardOverview(searchParams);
    const rows = overview.dailyRows.filter((row) => isWithinDateRange(row, dateFrom, dateTo));
    if (view === "kpis") addWorksheet(workbook, "KPIs", overviewKpis(rows));
    if (view === "daily") addWorksheet(workbook, "Resumen diario", rows.map((row) => ({ Fecha: row.fecha, Ventas: row.sales, Unidades: row.units, Operaciones: row.operations, "Monto pagos": row.paymentAmount, "Diferencia cuadre": row.reconciliationDelta })));
    if (view === "reconciliation") addWorksheet(workbook, "Cuadre", rows.map((row) => ({ Fecha: row.fecha, "Venta productos": row.sales, "Monto pagos": row.paymentAmount, Diferencia: row.reconciliationDelta })));
  }

  if (workbook.worksheets.length === 0) {
    addWorksheet(workbook, "Exportacion", [{ Estado: "Vista no reconocida" }]);
  }

  return { workbook, section, view };
}

export async function GET(request: Request) {
  const { workbook, section, view } = await buildWorkbook(request);
  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="subway-dashboard-${section}-${view}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

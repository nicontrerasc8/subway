import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  formatDateRangeLabel,
  getDateDay,
  getDateMonth,
  getDateYear,
  getMonthLabel,
  getSearchParamValue,
  matchesDateRange,
  matchesMonthlyRange,
  resolveDateRangeFilters,
  type DashboardDateRangeFilters,
  type DashboardDateRangeSearchParams,
} from "@/modules/dashboard/lib/date-range-filters";

const PAGE_SIZE = 1000;

type SearchParamValue = string | string[] | undefined;

type DailyBranchRow = {
  fecha: string | null;
  sucursal_id: number | null;
  sucursal: string | null;
  ventas_totales: number | string | null;
  unidades_totales: number | string | null;
  productos_distintos: number | string | null;
  operaciones_totales: number | string | null;
  ticket_promedio: number | string | null;
};

type MonthlyBranchRow = {
  mes: string | null;
  anio: number | null;
  mes_num: number | null;
  sucursal_id: number | null;
  sucursal: string | null;
  unidades: number | string | null;
  ventas: number | string | null;
};

type CategoryDailyRow = {
  fecha: string | null;
  sucursal_id: number | null;
  sucursal: string | null;
  categoria: string | null;
  unidades: number | string | null;
  ventas: number | string | null;
};

type ProductDailyRow = {
  fecha: string | null;
  sucursal_id: number | null;
  sucursal: string | null;
  referencia: string | null;
  producto: string | null;
  categoria: string | null;
  unidades: number | string | null;
  ventas: number | string | null;
};

type PaymentMethodDailyRow = {
  fecha: string | null;
  sucursal_id: number | null;
  sucursal: string | null;
  forma_pago: string | null;
  importe: number | string | null;
  operaciones: number | string | null;
};

type PaymentDetailRow = {
  fecha: string | null;
  sucursal_id: number | null;
  sucursal: string | null;
  forma_pago: string | null;
  importe: number | string | null;
  operaciones: number | string | null;
};

type ReconciliationRow = {
  import_id: string | null;
  fecha: string | null;
  sucursal_id: number | null;
  sucursal: string | null;
  source_key: string | null;
  total_productos: number | string | null;
  total_pagos: number | string | null;
  total_operaciones: number | string | null;
  diferencia: number | string | null;
};

export type DashboardOverviewSearchParams = DashboardDateRangeSearchParams & {
  branch?: SearchParamValue;
};

export type DashboardOverviewFilters = DashboardDateRangeFilters & {
  branch: string | null;
};

export type DashboardOverviewKpis = {
  totalSales: number;
  totalUnits: number;
  totalOperations: number;
  averageTicket: number;
  averageDailyProducts: number;
  reconciliationDelta: number;
};

export type DashboardOverviewPoint = {
  label: string;
  value: number;
};

export type DashboardOverviewBranchPoint = {
  branchId: number | null;
  branch: string;
  sales: number;
  units: number;
  operations: number;
  averageTicket: number;
};

export type DashboardOverviewProductPoint = {
  referencia: string;
  producto: string;
  categoria: string;
  ventas: number;
  unidades: number;
};

export type DashboardOverviewReconciliationPoint = {
  importId: string;
  fecha: string | null;
  sucursal: string;
  sourceKey: string | null;
  totalProductos: number;
  totalPagos: number;
  diferencia: number;
};

export type DashboardOverviewData = {
  filters: DashboardOverviewFilters;
  availableYears: string[];
  availableMonths: string[];
  availableBranches: Array<{ id: string; label: string }>;
  activePeriodLabel: string;
  categoryDailyKeys: string[];
  kpis: DashboardOverviewKpis;
  dailySales: DashboardOverviewPoint[];
  monthlySales: DashboardOverviewPoint[];
  dailyCategorySales: Array<{ label: string; [key: string]: string | number }>;
  categoryMix: DashboardOverviewPoint[];
  paymentMix: DashboardOverviewPoint[];
  branchRanking: DashboardOverviewBranchPoint[];
  topProducts: DashboardOverviewProductPoint[];
  reconciliation: DashboardOverviewReconciliationPoint[];
};

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const parsed = Number(value.replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function getShortMonthLabel(month: string) {
  return getMonthLabel(month, "short");
}

async function fetchAllRows<T>(view: string, columns: string) {
  const supabase = await createServerSupabaseClient();
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(view)
      .select(columns)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data ?? []) as T[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function fetchPaymentRows() {
  try {
    return await fetchAllRows<PaymentMethodDailyRow>(
      "v_payment_method_daily",
      "fecha, sucursal_id, sucursal, forma_pago, importe, operaciones",
    );
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : "";

    if (!message.includes("v_payment_method_daily")) {
      throw error;
    }

    return fetchAllRows<PaymentDetailRow>(
      "v_sales_payment_detail",
      "fecha, sucursal_id, sucursal, forma_pago, importe, operaciones",
    );
  }
}

function resolveFilters(
  searchParams: DashboardOverviewSearchParams,
  dailyRows: DailyBranchRow[],
) {
  const requestedBranch = getSearchParamValue(searchParams.branch);

  const availableYears = Array.from(
    new Set(dailyRows.map((row) => getDateYear(row.fecha)).filter(Boolean) as string[]),
  ).sort((a, b) => Number(b) - Number(a));
  const availableBranches = Array.from(
    new Map(
      dailyRows
        .filter((row) => row.sucursal_id !== null)
        .map((row) => [
          String(row.sucursal_id),
          {
            id: String(row.sucursal_id),
            label: row.sucursal ?? `Sucursal ${row.sucursal_id}`,
          },
        ]),
    ).values(),
  ).sort((a, b) => a.label.localeCompare(b.label));

  const dateRangeFilters = resolveDateRangeFilters(searchParams, availableYears);

  const filters: DashboardOverviewFilters = {
    ...dateRangeFilters,
    branch: requestedBranch && availableBranches.some((branch) => branch.id === requestedBranch) ? requestedBranch : null,
  };

  const activePeriodLabel = [
    formatDateRangeLabel(filters),
    filters.branch
      ? availableBranches.find((branch) => branch.id === filters.branch)?.label ?? "Sucursal"
      : "Todas las sucursales",
  ].join(" · ");

  return {
    filters,
    availableYears,
    availableMonths: [],
    availableBranches,
    activePeriodLabel,
  };
}

function matchesFilters(
  row: { fecha: string | null; sucursal_id: number | null },
  filters: DashboardOverviewFilters,
) {
  if (!matchesDateRange(row.fecha, filters)) return false;
  if (filters.branch && String(row.sucursal_id) !== filters.branch) return false;
  return true;
}

export async function getDashboardOverview(
  searchParams: DashboardOverviewSearchParams = {},
): Promise<DashboardOverviewData> {
  const [
    dailyRows,
    monthlyRows,
    categoryRows,
    productRows,
    paymentRows,
    reconciliationRows,
  ] = await Promise.all([
    fetchAllRows<DailyBranchRow>(
      "v_kpi_daily_branch_full",
      "fecha, sucursal_id, sucursal, ventas_totales, unidades_totales, productos_distintos, operaciones_totales, ticket_promedio",
    ),
    fetchAllRows<MonthlyBranchRow>(
      "v_sales_branch_monthly",
      "mes, anio, mes_num, sucursal_id, sucursal, unidades, ventas",
    ),
    fetchAllRows<CategoryDailyRow>(
      "v_sales_category_daily",
      "fecha, sucursal_id, sucursal, categoria, unidades, ventas",
    ),
    fetchAllRows<ProductDailyRow>(
      "v_sales_product_daily",
      "fecha, sucursal_id, sucursal, referencia, producto, categoria, unidades, ventas",
    ),
    fetchPaymentRows(),
    fetchAllRows<ReconciliationRow>(
      "v_import_reconciliation",
      "import_id, fecha, sucursal_id, sucursal, source_key, total_productos, total_pagos, total_operaciones, diferencia",
    ),
  ]);

  const { filters, availableYears, availableMonths, availableBranches, activePeriodLabel } =
    resolveFilters(searchParams, dailyRows);

  const filteredDaily = dailyRows.filter((row) => matchesFilters(row, filters));
  const filteredCategories = categoryRows.filter((row) => matchesFilters(row, filters));
  const filteredProducts = productRows.filter((row) => matchesFilters(row, filters));
  const filteredPayments = paymentRows.filter((row) => matchesFilters(row, filters));
  const filteredReconciliation = reconciliationRows.filter((row) => matchesFilters(row, filters));
  const filteredMonthly = monthlyRows.filter((row) => {
    if (!matchesMonthlyRange(row, filters)) return false;
    if (filters.branch && String(row.sucursal_id) !== filters.branch) return false;
    return true;
  });

  const totalSales = filteredDaily.reduce((sum, row) => sum + toNumber(row.ventas_totales), 0);
  const totalUnits = filteredDaily.reduce((sum, row) => sum + toNumber(row.unidades_totales), 0);
  const totalOperations = filteredDaily.reduce((sum, row) => sum + toNumber(row.operaciones_totales), 0);
  const averageTicket = totalOperations > 0 ? filteredPayments.reduce((sum, row) => sum + toNumber(row.importe), 0) / totalOperations : 0;
  const averageDailyProducts =
    filteredDaily.length > 0
      ? filteredDaily.reduce((sum, row) => sum + toNumber(row.productos_distintos), 0) / filteredDaily.length
      : 0;
  const reconciliationDelta = filteredReconciliation.reduce((sum, row) => sum + toNumber(row.diferencia), 0);

  const dailySales = filteredDaily
    .sort((a, b) => (a.fecha ?? "").localeCompare(b.fecha ?? ""))
    .map((row) => ({
      label: row.fecha ?? "",
      value: toNumber(row.ventas_totales),
    }));

  const monthlySales = Array.from(
    filteredMonthly.reduce((map, row) => {
      const year = row.anio ? String(row.anio) : "Sin año";
      const month = row.mes_num ? String(row.mes_num) : "0";
      const key = `${year}-${month.padStart(2, "0")}`;
      const current = map.get(key) ?? {
        label: row.mes_num ? `${getShortMonthLabel(month)} ${year}` : "Sin mes",
        value: 0,
      };
      current.value += toNumber(row.ventas);
      map.set(key, current);
      return map;
    }, new Map<string, DashboardOverviewPoint>()),
  )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, value]) => value);

  const categoryTotals = new Map<string, number>();
  const dailyCategoryMap = new Map<string, { label: string; [key: string]: string | number }>();

  for (const row of filteredCategories) {
    const category = row.categoria ?? "Sin categoria";
    const value = toNumber(row.ventas);
    const year = getDateYear(row.fecha);
    const month = getDateMonth(row.fecha);
    const day = getDateDay(row.fecha);
    const key = row.fecha ?? "Sin fecha";

    categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + value);

    const label = year && month && day ? `${day} ${getShortMonthLabel(month)} ${year}` : "Sin fecha";
    const current = dailyCategoryMap.get(key) ?? { label };
    current[category] = Number(current[category] ?? 0) + value;
    dailyCategoryMap.set(key, current);
  }

  const categoryDailyKeys = [...categoryTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category);

  const dailyCategorySales = [...dailyCategoryMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, value]) => value);

  const categoryMix = Array.from(
    filteredCategories.reduce((map, row) => {
      const key = row.categoria ?? "Sin categoria";
      map.set(key, (map.get(key) ?? 0) + toNumber(row.ventas));
      return map;
    }, new Map<string, number>()),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value }));

  const paymentMix = Array.from(
    filteredPayments.reduce((map, row) => {
      const key = row.forma_pago ?? "Sin forma de pago";
      map.set(key, (map.get(key) ?? 0) + toNumber(row.importe));
      return map;
    }, new Map<string, number>()),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value }));

  const branchRanking = Array.from(
    filteredDaily.reduce((map, row) => {
      const key = String(row.sucursal_id ?? "0");
      const current = map.get(key) ?? {
        branchId: row.sucursal_id,
        branch: row.sucursal ?? "Sin sucursal",
        sales: 0,
        units: 0,
        operations: 0,
        averageTicket: 0,
      };
      current.sales += toNumber(row.ventas_totales);
      current.units += toNumber(row.unidades_totales);
      current.operations += toNumber(row.operaciones_totales);
      current.averageTicket = current.operations > 0 ? current.sales / current.operations : 0;
      map.set(key, current);
      return map;
    }, new Map<string, DashboardOverviewBranchPoint>()),
  )
    .map(([, value]) => value)
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 6);

  const topProducts = Array.from(
    filteredProducts.reduce((map, row) => {
      const key = row.referencia ?? row.producto ?? "sin-producto";
      const current = map.get(key) ?? {
        referencia: row.referencia ?? "-",
        producto: row.producto ?? "Sin producto",
        categoria: row.categoria ?? "Sin categoria",
        ventas: 0,
        unidades: 0,
      };
      current.ventas += toNumber(row.ventas);
      current.unidades += toNumber(row.unidades);
      map.set(key, current);
      return map;
    }, new Map<string, DashboardOverviewProductPoint>()),
  )
    .map(([, value]) => value)
    .sort((a, b) => b.ventas - a.ventas)
    .slice(0, 8);

  const reconciliation = filteredReconciliation
    .map((row) => ({
      importId: row.import_id ?? "",
      fecha: row.fecha,
      sucursal: row.sucursal ?? "Sin sucursal",
      sourceKey: row.source_key,
      totalProductos: toNumber(row.total_productos),
      totalPagos: toNumber(row.total_pagos),
      diferencia: toNumber(row.diferencia),
    }))
    .sort((a, b) => Math.abs(b.diferencia) - Math.abs(a.diferencia))
    .slice(0, 8);

  return {
    filters,
    availableYears,
    availableMonths,
    availableBranches,
    activePeriodLabel,
    categoryDailyKeys,
    kpis: {
      totalSales,
      totalUnits,
      totalOperations,
      averageTicket,
      averageDailyProducts,
      reconciliationDelta,
    },
    dailySales,
    monthlySales,
    dailyCategorySales,
    categoryMix,
    paymentMix,
    branchRanking,
    topProducts,
    reconciliation,
  };
}

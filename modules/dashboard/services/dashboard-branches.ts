import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  formatDateRangeLabel,
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

export type DashboardBranchesFilters = DashboardDateRangeFilters & {
  branch: string | null;
};

export type DashboardBranchesSearchParams = DashboardDateRangeSearchParams & {
  branch?: string | string[];
};

export type DashboardBranchesKpis = {
  totalSales: number;
  totalUnits: number;
  totalOperations: number;
  averageTicket: number;
  activeBranches: number;
  averageProductsPerDay: number;
};

export type DashboardBranchesChartPoint = {
  label: string;
  [key: string]: string | number;
};

export type DashboardBranchRankingPoint = {
  branchId: number | null;
  branch: string;
  sales: number;
  units: number;
  operations: number;
  averageTicket: number;
  averageProducts: number;
};

export type DashboardBranchesData = {
  filters: DashboardBranchesFilters;
  availableYears: string[];
  availableMonths: string[];
  availableBranches: Array<{ id: string; label: string }>;
  activePeriodLabel: string;
  branchKeys: string[];
  kpis: DashboardBranchesKpis;
  branchRanking: DashboardBranchRankingPoint[];
  dailyTrend: DashboardBranchesChartPoint[];
  monthlyTrend: DashboardBranchesChartPoint[];
};

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const parsed = Number(value.replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : 0;
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

function resolveFilters(
  searchParams: DashboardBranchesSearchParams,
  dailyRows: DailyBranchRow[],
) {
  const availableYears = Array.from(
    new Set(dailyRows.map((row) => getDateYear(row.fecha)).filter(Boolean) as string[]),
  ).sort((a, b) => Number(b) - Number(a));
  const availableBranches = Array.from(
    new Map(
      dailyRows
        .filter((row) => row.sucursal_id !== null)
        .map((row) => [
          String(row.sucursal_id),
          { id: String(row.sucursal_id), label: row.sucursal ?? `Sucursal ${row.sucursal_id}` },
        ]),
    ).values(),
  ).sort((a, b) => a.label.localeCompare(b.label));
  const requestedBranch = getSearchParamValue(searchParams.branch);
  const dateRangeFilters = resolveDateRangeFilters(searchParams, availableYears);
  const filters: DashboardBranchesFilters = {
    ...dateRangeFilters,
    branch:
      requestedBranch && availableBranches.some((branch) => branch.id === requestedBranch)
        ? requestedBranch
        : null,
  };

  return {
    filters,
    availableYears,
    availableMonths: [],
    availableBranches,
    activePeriodLabel: [
      formatDateRangeLabel(filters),
      filters.branch
        ? availableBranches.find((branch) => branch.id === filters.branch)?.label ?? "Sucursal"
        : "Todas las sucursales",
      "Comparativo entre sucursales",
    ].join(" · "),
  };
}

function matchesFilters(row: { fecha: string | null; sucursal_id: number | null }, filters: DashboardBranchesFilters) {
  if (!matchesDateRange(row.fecha, filters)) return false;
  if (filters.branch && String(row.sucursal_id) !== filters.branch) return false;
  return true;
}

function getDayComparisonKey(fecha: string | null) {
  if (!fecha) return null;

  const month = getDateMonth(fecha);
  const day = Number(fecha.slice(8, 10));
  if (!month || !day) return null;

  return {
    key: `${month.padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    label: `${day} ${getMonthLabel(month, "short")}`,
  };
}

export async function getDashboardBranches(
  searchParams: DashboardBranchesSearchParams = {},
): Promise<DashboardBranchesData> {
  const [dailyRows, monthlyRows] = await Promise.all([
    fetchAllRows<DailyBranchRow>(
      "v_kpi_daily_branch_full",
      "fecha, sucursal_id, sucursal, ventas_totales, unidades_totales, productos_distintos, operaciones_totales, ticket_promedio",
    ),
    fetchAllRows<MonthlyBranchRow>(
      "v_sales_branch_monthly",
      "mes, anio, mes_num, sucursal_id, sucursal, unidades, ventas",
    ),
  ]);

  const { filters, availableYears, availableMonths, availableBranches, activePeriodLabel } = resolveFilters(searchParams, dailyRows);

  const filteredDaily = dailyRows.filter((row) => matchesFilters(row, filters));
  const filteredMonthly = monthlyRows.filter((row) => {
    if (!matchesMonthlyRange(row, filters)) return false;
    if (filters.branch && String(row.sucursal_id) !== filters.branch) return false;
    return true;
  });

  const comparisonYears = Array.from(
    new Set(filteredDaily.map((row) => getDateYear(row.fecha)).filter(Boolean) as string[]),
  ).sort((a, b) => Number(a) - Number(b));

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
        averageProducts: 0,
        productDays: 0,
      };

      current.sales += toNumber(row.ventas_totales);
      current.units += toNumber(row.unidades_totales);
      current.operations += toNumber(row.operaciones_totales);
      current.productDays += 1;
      current.averageProducts += toNumber(row.productos_distintos);
      current.averageTicket = current.operations > 0 ? current.sales / current.operations : 0;
      map.set(key, current);
      return map;
    }, new Map<string, DashboardBranchRankingPoint & { productDays: number }>()),
  )
    .map(([, value]) => ({
      branchId: value.branchId,
      branch: value.branch,
      sales: value.sales,
      units: value.units,
      operations: value.operations,
      averageTicket: value.averageTicket,
      averageProducts: value.productDays > 0 ? value.averageProducts / value.productDays : 0,
    }))
    .sort((a, b) => b.sales - a.sales);

  const dailyTrend = Array.from(
    filteredDaily.reduce((map, row) => {
      const year = getDateYear(row.fecha);
      const dayKey = getDayComparisonKey(row.fecha);
      if (!year || !dayKey) return map;

      const entry = map.get(dayKey.key) ?? { label: dayKey.label };
      entry[year] = Number(entry[year] ?? 0) + toNumber(row.ventas_totales);
      map.set(dayKey.key, entry);
      return map;
    }, new Map<string, DashboardBranchesChartPoint>()),
  )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, value]) => value);

  const monthlyTrend = Array.from(
    filteredMonthly.reduce((map, row) => {
      if (!row.anio || !row.mes_num) return map;

      const monthKey = String(row.mes_num).padStart(2, "0");
      const monthLabel = getMonthLabel(String(row.mes_num), "short");
      const year = String(row.anio);
      const entry = map.get(monthKey) ?? { label: monthLabel };
      entry[year] = Number(entry[year] ?? 0) + toNumber(row.ventas);
      map.set(monthKey, entry);
      return map;
    }, new Map<string, DashboardBranchesChartPoint>()),
  )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, value]) => value);

  const totalSales = filteredDaily.reduce((sum, row) => sum + toNumber(row.ventas_totales), 0);
  const totalUnits = filteredDaily.reduce((sum, row) => sum + toNumber(row.unidades_totales), 0);
  const totalOperations = filteredDaily.reduce((sum, row) => sum + toNumber(row.operaciones_totales), 0);
  const totalProducts = filteredDaily.reduce((sum, row) => sum + toNumber(row.productos_distintos), 0);

  return {
    filters,
    availableYears,
    availableMonths,
    availableBranches,
    activePeriodLabel,
    branchKeys: comparisonYears,
    kpis: {
      totalSales,
      totalUnits,
      totalOperations,
      averageTicket: totalOperations > 0 ? totalSales / totalOperations : 0,
      activeBranches: branchRanking.length,
      averageProductsPerDay: filteredDaily.length > 0 ? totalProducts / filteredDaily.length : 0,
    },
    branchRanking,
    dailyTrend,
    monthlyTrend,
  };
}

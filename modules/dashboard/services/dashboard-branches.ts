import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

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

export type DashboardBranchesFilters = {
  year: string | null;
  month: string | null;
};

export type DashboardBranchesSearchParams = {
  year?: SearchParamValue;
  month?: SearchParamValue;
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
  activePeriodLabel: string;
  branchKeys: string[];
  kpis: DashboardBranchesKpis;
  branchRanking: DashboardBranchRankingPoint[];
  dailyTrend: DashboardBranchesChartPoint[];
  monthlyTrend: DashboardBranchesChartPoint[];
};

function getParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const parsed = Number(value.replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function getDateYear(value: string | null) {
  if (!value) return null;
  return value.slice(0, 4);
}

function getDateMonth(value: string | null) {
  if (!value) return null;
  return String(Number(value.slice(5, 7)));
}

function getMonthLabel(month: string) {
  return new Intl.DateTimeFormat("es-PE", { month: "short" }).format(
    new Date(2024, Number(month) - 1, 1),
  );
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
  const requestedYear = getParam(searchParams.year);
  const requestedMonth = getParam(searchParams.month);

  const availableYears = Array.from(
    new Set(dailyRows.map((row) => getDateYear(row.fecha)).filter(Boolean) as string[]),
  ).sort((a, b) => Number(b) - Number(a));
  const availableMonths = Array.from({ length: 12 }, (_, index) => String(index + 1));

  const filters: DashboardBranchesFilters = {
    year: requestedYear && availableYears.includes(requestedYear) ? requestedYear : availableYears[0] ?? null,
    month: requestedMonth && availableMonths.includes(requestedMonth) ? requestedMonth : null,
  };

  return {
    filters,
    availableYears,
    availableMonths,
    activePeriodLabel: [
      filters.year ? `Ano ${filters.year}` : "Todos los anos",
      filters.month ? getMonthLabel(filters.month) : "Todos los meses",
      "Comparativo entre sucursales",
    ].join(" · "),
  };
}

function matchesFilters(row: { fecha: string | null }, filters: DashboardBranchesFilters) {
  if (filters.year && getDateYear(row.fecha) !== filters.year) return false;
  if (filters.month && getDateMonth(row.fecha) !== filters.month) return false;
  return true;
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

  const { filters, availableYears, availableMonths, activePeriodLabel } = resolveFilters(searchParams, dailyRows);

  const filteredDaily = dailyRows.filter((row) => matchesFilters(row, filters));
  const filteredMonthly = monthlyRows.filter((row) => {
    if (filters.year && String(row.anio) !== filters.year) return false;
    return true;
  });

  const branchNames = Array.from(
    new Map(
      filteredDaily
        .filter((row) => row.sucursal_id !== null)
        .map((row) => [String(row.sucursal_id), row.sucursal ?? `Sucursal ${row.sucursal_id}`]),
    ).values(),
  ).sort((a, b) => a.localeCompare(b));

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
      const key = row.fecha ?? "";
      const entry = map.get(key) ?? { label: key };
      entry[row.sucursal ?? "Sin sucursal"] = toNumber(row.ventas_totales);
      map.set(key, entry);
      return map;
    }, new Map<string, DashboardBranchesChartPoint>()),
  )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, value]) => value);

  const monthlyTrend = Array.from(
    filteredMonthly.reduce((map, row) => {
      const monthLabel = row.mes_num ? getMonthLabel(String(row.mes_num)) : "Sin mes";
      const entry = map.get(monthLabel) ?? { label: monthLabel };
      entry[row.sucursal ?? "Sin sucursal"] = (Number(entry[row.sucursal ?? "Sin sucursal"] ?? 0) + toNumber(row.ventas));
      map.set(monthLabel, entry);
      return map;
    }, new Map<string, DashboardBranchesChartPoint>()),
  ).map(([, value]) => value);

  const totalSales = filteredDaily.reduce((sum, row) => sum + toNumber(row.ventas_totales), 0);
  const totalUnits = filteredDaily.reduce((sum, row) => sum + toNumber(row.unidades_totales), 0);
  const totalOperations = filteredDaily.reduce((sum, row) => sum + toNumber(row.operaciones_totales), 0);
  const totalProducts = filteredDaily.reduce((sum, row) => sum + toNumber(row.productos_distintos), 0);

  return {
    filters,
    availableYears,
    availableMonths,
    activePeriodLabel,
    branchKeys: branchNames,
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

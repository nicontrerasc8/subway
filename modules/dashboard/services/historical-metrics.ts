import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  formatDateRangeLabel,
  getDateMonth,
  getMonthLabel,
  getSearchParamValue,
  matchesDateRange,
  resolveDateRangeFilters,
  type DashboardDateRangeFilters,
  type DashboardDateRangeSearchParams,
} from "@/modules/dashboard/lib/date-range-filters";

const PAGE_SIZE = 1000;
const DETAIL_ROW_LIMIT = 500;
const SALES_METRICS = ["VENTA_TOTAL", "VENTA_SALON", "VENTA_DELIVERY"];
const CLIENT_METRICS = ["CLIENTES_TOTAL", "CLIENTES_SALON", "CLIENTES_DELIVERY"];

type HistoricalMetricDbRow = {
  id: number;
  sucursal_id: number;
  fecha: string;
  anio: number;
  semana: number;
  dia_semana: number;
  metrica: string;
  valor: number | string;
  source_key: string;
  source_file_name: string | null;
  source_sheet_name: string | null;
  created_at: string;
  sucursales_subway?: { nombre: string | null } | { nombre: string | null }[] | null;
};

export type HistoricalMetricsSearchParams = DashboardDateRangeSearchParams & {
  branch?: string | string[];
};

export type HistoricalMetricsFilters = DashboardDateRangeFilters & {
  branch: string | null;
};

export type HistoricalMetricDetailRow = {
  id: number;
  sucursalId: number;
  sucursal: string;
  fecha: string;
  anio: number;
  semana: number;
  diaSemana: number;
  metrica: string;
  valor: number;
  sourceKey: string;
  sourceFileName: string | null;
  sourceSheetName: string | null;
  createdAt: string;
};

export type HistoricalMetricSummaryPoint = {
  metrica: string;
  total: number;
  promedio: number;
  filas: number;
  sucursales: number;
  primeraFecha: string | null;
  ultimaFecha: string | null;
};

export type HistoricalBranchSummaryPoint = {
  branchId: number;
  branch: string;
  totalSales: number;
  totalClients: number;
  filas: number;
  metricas: number;
  byMetric: Record<string, number>;
  primeraFecha: string | null;
  ultimaFecha: string | null;
};

export type HistoricalMetricChartPoint = {
  label: string;
  [key: string]: string | number;
};

export type HistoricalMetricsData = {
  filters: HistoricalMetricsFilters;
  availableYears: string[];
  availableBranches: Array<{ id: string; label: string }>;
  activePeriodLabel: string;
  kpis: {
    totalSales: number;
    totalClients: number;
    totalRows: number;
    activeMetrics: number;
    activeBranches: number;
    averageSalesPerDay: number;
    averageClientsPerDay: number;
  };
  salesMetricKeys: string[];
  clientMetricKeys: string[];
  metricSummary: HistoricalMetricSummaryPoint[];
  branchSummary: HistoricalBranchSummaryPoint[];
  monthlySalesTrend: HistoricalMetricChartPoint[];
  monthlyClientTrend: HistoricalMetricChartPoint[];
  detailRows: HistoricalMetricDetailRow[];
  detailRowsTotal: number;
  detailRowsLimit: number;
};

type MetricSummaryAgg = Omit<HistoricalMetricSummaryPoint, "sucursales"> & {
  sucursalesSet: Set<number>;
};

type BranchSummaryAgg = Omit<HistoricalBranchSummaryPoint, "metricas"> & {
  metricasSet: Set<string>;
};

function isSalesMetric(metric: string) {
  return metric.startsWith("VENTA_");
}

function isClientMetric(metric: string) {
  return metric.startsWith("CLIENTES_");
}

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;

  const parsed = Number(value.replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveBranchName(row: HistoricalMetricDbRow) {
  const relation = Array.isArray(row.sucursales_subway)
    ? row.sucursales_subway[0]
    : row.sucursales_subway;

  return relation?.nombre?.trim() || `Sucursal ${row.sucursal_id}`;
}

async function fetchHistoricalRows() {
  const supabase = await createServerSupabaseClient();
  const rows: HistoricalMetricDbRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("historical_metrics_subway")
      .select(
        "id, sucursal_id, fecha, anio, semana, dia_semana, metrica, valor, source_key, source_file_name, source_sheet_name, created_at, sucursales_subway(nombre)",
      )
      .order("fecha", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data ?? []) as HistoricalMetricDbRow[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

function resolveFilters(searchParams: HistoricalMetricsSearchParams, rows: HistoricalMetricDetailRow[]) {
  const availableYears = Array.from(new Set(rows.map((row) => String(row.anio))))
    .filter(Boolean)
    .sort((a, b) => Number(b) - Number(a));
  const availableBranches = Array.from(
    new Map(
      rows.map((row) => [
        String(row.sucursalId),
        { id: String(row.sucursalId), label: row.sucursal },
      ]),
    ).values(),
  ).sort((a, b) => a.label.localeCompare(b.label));
  const requestedBranch = getSearchParamValue(searchParams.branch);
  const dateRangeFilters = resolveDateRangeFilters(searchParams, availableYears);
  const filters: HistoricalMetricsFilters = {
    ...dateRangeFilters,
    branch:
      requestedBranch && availableBranches.some((branch) => branch.id === requestedBranch)
        ? requestedBranch
        : null,
  };

  return {
    filters,
    availableYears,
    availableBranches,
    activePeriodLabel: [
      formatDateRangeLabel(filters),
      filters.branch
        ? availableBranches.find((branch) => branch.id === filters.branch)?.label ?? "Sucursal"
        : "Todas las sucursales",
      "Data historica",
    ].join(" · "),
  };
}

function matchesFilters(row: HistoricalMetricDetailRow, filters: HistoricalMetricsFilters) {
  if (!matchesDateRange(row.fecha, filters)) return false;
  if (filters.branch && String(row.sucursalId) !== filters.branch) return false;
  return true;
}

function minDate(current: string | null, next: string) {
  if (!current) return next;
  return next < current ? next : current;
}

function maxDate(current: string | null, next: string) {
  if (!current) return next;
  return next > current ? next : current;
}

export async function getHistoricalMetricsDashboard(
  searchParams: HistoricalMetricsSearchParams = {},
): Promise<HistoricalMetricsData> {
  let dbRows: HistoricalMetricDbRow[] = [];

  try {
    dbRows = await fetchHistoricalRows();
  } catch (error) {
    console.error("[dashboard][historical-metrics] Error al leer historical_metrics_subway", error);
  }

  const allRows: HistoricalMetricDetailRow[] = dbRows.map((row) => ({
    id: row.id,
    sucursalId: row.sucursal_id,
    sucursal: resolveBranchName(row),
    fecha: row.fecha,
    anio: row.anio,
    semana: row.semana,
    diaSemana: row.dia_semana,
    metrica: row.metrica,
    valor: toNumber(row.valor),
    sourceKey: row.source_key,
    sourceFileName: row.source_file_name,
    sourceSheetName: row.source_sheet_name,
    createdAt: row.created_at,
  }));

  const { filters, availableYears, availableBranches, activePeriodLabel } = resolveFilters(searchParams, allRows);
  const detailRows = allRows.filter((row) => matchesFilters(row, filters));
  const totalSales = detailRows
    .filter((row) => isSalesMetric(row.metrica))
    .reduce((sum, row) => sum + row.valor, 0);
  const totalClients = detailRows
    .filter((row) => isClientMetric(row.metrica))
    .reduce((sum, row) => sum + row.valor, 0);
  const activeDays = new Set(detailRows.map((row) => row.fecha)).size;

  const metricSummary = Array.from(
    detailRows.reduce((map, row) => {
      const current = map.get(row.metrica) ?? {
        metrica: row.metrica,
        total: 0,
        promedio: 0,
        filas: 0,
        sucursalesSet: new Set<number>(),
        primeraFecha: null as string | null,
        ultimaFecha: null as string | null,
      };

      current.total += row.valor;
      current.filas += 1;
      current.sucursalesSet.add(row.sucursalId);
      current.primeraFecha = minDate(current.primeraFecha, row.fecha);
      current.ultimaFecha = maxDate(current.ultimaFecha, row.fecha);
      map.set(row.metrica, current);
      return map;
    }, new Map<string, MetricSummaryAgg>()),
  )
    .map(([, value]) => ({
      metrica: value.metrica,
      total: value.total,
      promedio: value.filas > 0 ? value.total / value.filas : 0,
      filas: value.filas,
      sucursales: value.sucursalesSet.size,
      primeraFecha: value.primeraFecha,
      ultimaFecha: value.ultimaFecha,
    }))
    .sort((a, b) => b.total - a.total);

  const branchSummary = Array.from(
    detailRows.reduce((map, row) => {
      const key = String(row.sucursalId);
      const current = map.get(key) ?? {
        branchId: row.sucursalId,
        branch: row.sucursal,
        totalSales: 0,
        totalClients: 0,
        filas: 0,
        metricasSet: new Set<string>(),
        byMetric: {},
        primeraFecha: null as string | null,
        ultimaFecha: null as string | null,
      };

      if (isSalesMetric(row.metrica)) current.totalSales += row.valor;
      if (isClientMetric(row.metrica)) current.totalClients += row.valor;
      current.filas += 1;
      current.metricasSet.add(row.metrica);
      current.byMetric[row.metrica] = (current.byMetric[row.metrica] ?? 0) + row.valor;
      current.primeraFecha = minDate(current.primeraFecha, row.fecha);
      current.ultimaFecha = maxDate(current.ultimaFecha, row.fecha);
      map.set(key, current);
      return map;
    }, new Map<string, BranchSummaryAgg>()),
  )
    .map(([, value]) => ({
      branchId: value.branchId,
      branch: value.branch,
      totalSales: value.totalSales,
      totalClients: value.totalClients,
      filas: value.filas,
      metricas: value.metricasSet.size,
      byMetric: value.byMetric,
      primeraFecha: value.primeraFecha,
      ultimaFecha: value.ultimaFecha,
    }))
    .sort((a, b) => b.totalSales - a.totalSales);

  const existingMetricKeys = new Set(metricSummary.map((item) => item.metrica));
  const salesMetricKeys = SALES_METRICS.filter((metric) => existingMetricKeys.has(metric));
  const clientMetricKeys = CLIENT_METRICS.filter((metric) => existingMetricKeys.has(metric));

  function buildMonthlyTrend(metricKeys: string[]) {
    return Array.from(
      detailRows.reduce((map, row) => {
      const month = getDateMonth(row.fecha);
      if (!month || !metricKeys.includes(row.metrica)) return map;

      const key = `${row.anio}-${month.padStart(2, "0")}`;
      const entry = map.get(key) ?? { label: `${getMonthLabel(month, "short")} ${row.anio}` };
      entry[row.metrica] = Number(entry[row.metrica] ?? 0) + row.valor;
      map.set(key, entry);
      return map;
      }, new Map<string, HistoricalMetricChartPoint>()),
    )
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, value]) => value);
  }

  return {
    filters,
    availableYears,
    availableBranches,
    activePeriodLabel,
    kpis: {
      totalSales,
      totalClients,
      totalRows: detailRows.length,
      activeMetrics: metricSummary.length,
      activeBranches: branchSummary.length,
      averageSalesPerDay: activeDays > 0 ? totalSales / activeDays : 0,
      averageClientsPerDay: activeDays > 0 ? totalClients / activeDays : 0,
    },
    salesMetricKeys,
    clientMetricKeys,
    metricSummary,
    branchSummary,
    monthlySalesTrend: buildMonthlyTrend(salesMetricKeys),
    monthlyClientTrend: buildMonthlyTrend(clientMetricKeys),
    detailRows: detailRows.slice(0, DETAIL_ROW_LIMIT),
    detailRowsTotal: detailRows.length,
    detailRowsLimit: DETAIL_ROW_LIMIT,
  };
}

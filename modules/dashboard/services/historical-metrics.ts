import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  formatDateRangeLabel,
  getDateMonth,
  getMonthLabel,
  getSearchParamValue,
  resolveDateRangeFilters,
  type DashboardDateRangeFilters,
  type DashboardDateRangeSearchParams,
} from "@/modules/dashboard/lib/date-range-filters";

const PAGE_SIZE = 1000;
const DETAIL_ROW_LIMIT = 500;
const SALES_METRICS = ["VENTA_TOTAL", "VENTA_SALON", "VENTA_DELIVERY"];
const CLIENT_METRICS = ["CLIENTES_TOTAL", "CLIENTES_SALON", "CLIENTES_DELIVERY"];
const ALL_METRICS = [...SALES_METRICS, ...CLIENT_METRICS];

export type HistoricalMetricsSearchParams = DashboardDateRangeSearchParams & {
  branch?: string | string[];
  dateFrom?: string | string[];
  dateTo?: string | string[];
};

export type HistoricalMetricsFilters = DashboardDateRangeFilters & {
  branch: string | null;
  dateFrom: string | null;
  dateTo: string | null;
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

export type HistoricalYearlyPoint = {
  anio: number;
  label: string;
  ventaTotal: number;
  clientesTotal: number;
  ticketPromedio: number;
  ventaSalon: number;
  ventaDelivery: number;
  clientesSalon: number;
  clientesDelivery: number;
  deliveryShare: number;
  salesGrowthPct: number | null;
  clientsGrowthPct: number | null;
};

export type HistoricalPeriodPoint = {
  label: string;
  ventaTotal: number;
  clientesTotal: number;
  ticketPromedio: number;
};

export type HistoricalBranchPerformancePoint = {
  branchId: number;
  branch: string;
  ventaTotal: number;
  clientesTotal: number;
  ticketPromedio: number;
  ventaDelivery: number;
  deliveryShare: number;
};

export type HistoricalMixPoint = {
  label: string;
  value: number;
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
  yearly: HistoricalYearlyPoint[];
  monthlyPerformance: HistoricalPeriodPoint[];
  weekdayPerformance: HistoricalPeriodPoint[];
  branchPerformance: HistoricalBranchPerformancePoint[];
  salesMix: HistoricalMixPoint[];
  clientMix: HistoricalMixPoint[];
  insights: string[];
  monthlySalesTrend: HistoricalMetricChartPoint[];
  monthlyClientTrend: HistoricalMetricChartPoint[];
  detailRows: HistoricalMetricDetailRow[];
  detailRowsTotal: number;
  detailRowsLimit: number;
};

type HistoricalOptionRow = {
  anio: number | null;
  sucursal_id: number | null;
  sucursal: string | null;
};

type HistoricalDailyBranchRow = {
  fecha: string | null;
  anio: number | null;
  semana: number | null;
  dia_semana: number | null;
  sucursal_id: number | null;
  sucursal: string | null;
  venta_total: number | string | null;
  venta_salon: number | string | null;
  venta_delivery: number | string | null;
  clientes_total: number | string | null;
  clientes_salon: number | string | null;
  clientes_delivery: number | string | null;
  ticket_promedio: number | string | null;
};

type HistoricalFactRow = {
  id: number;
  fecha: string | null;
  anio: number | null;
  semana: number | null;
  dia_semana: number | null;
  sucursal_id: number | null;
  sucursal: string | null;
  metrica: string | null;
  valor: number | string | null;
  source_key: string | null;
  source_file_name: string | null;
  source_sheet_name: string | null;
  created_at: string | null;
};

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;

  const parsed = Number(value.replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeRatio(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

function safeGrowth(current: number, previous: number) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

function minDate(current: string | null, next: string) {
  if (!current) return next;
  return next < current ? next : current;
}

function maxDate(current: string | null, next: string) {
  if (!current) return next;
  return next > current ? next : current;
}

function isDateValue(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function getLastDayOfMonth(year: string, month: string) {
  return new Date(Number(year), Number(month), 0).getDate();
}

function getDateBounds(filters: HistoricalMetricsFilters) {
  const dateFrom = filters.dateFrom
    ?? (filters.yearFrom ? `${filters.yearFrom}-${String(filters.monthFrom ?? "1").padStart(2, "0")}-01` : null);
  const dateTo = filters.dateTo
    ?? (
      filters.yearTo
        ? `${filters.yearTo}-${String(filters.monthTo ?? "12").padStart(2, "0")}-${String(getLastDayOfMonth(filters.yearTo, filters.monthTo ?? "12")).padStart(2, "0")}`
        : null
    );

  return { dateFrom, dateTo };
}

function getMetricValue(row: HistoricalDailyBranchRow, metric: string) {
  if (metric === "VENTA_TOTAL") return toNumber(row.venta_total);
  if (metric === "VENTA_SALON") return toNumber(row.venta_salon);
  if (metric === "VENTA_DELIVERY") return toNumber(row.venta_delivery);
  if (metric === "CLIENTES_TOTAL") return toNumber(row.clientes_total);
  if (metric === "CLIENTES_SALON") return toNumber(row.clientes_salon);
  if (metric === "CLIENTES_DELIVERY") return toNumber(row.clientes_delivery);
  return 0;
}

function applySupabaseFilters<T extends { eq: (...args: [string, string]) => T; gte: (...args: [string, string]) => T; lte: (...args: [string, string]) => T }>(
  query: T,
  filters: HistoricalMetricsFilters,
) {
  const { dateFrom, dateTo } = getDateBounds(filters);
  let nextQuery = query;

  if (filters.branch) nextQuery = nextQuery.eq("sucursal_id", filters.branch);
  if (dateFrom) nextQuery = nextQuery.gte("fecha", dateFrom);
  if (dateTo) nextQuery = nextQuery.lte("fecha", dateTo);

  return nextQuery;
}

async function fetchOptionRows() {
  const supabase = await createServerSupabaseClient();
  const rows: HistoricalOptionRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("v_historical_subway_daily_branch")
    .select("anio, sucursal_id, sucursal")
    .order("anio", { ascending: false })
      .order("sucursal", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data ?? []) as HistoricalOptionRow[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

function resolveFilters(searchParams: HistoricalMetricsSearchParams, optionRows: HistoricalOptionRow[]) {
  const availableYears = Array.from(
    new Set(optionRows.map((row) => (row.anio ? String(row.anio) : null)).filter(Boolean) as string[]),
  ).sort((a, b) => Number(b) - Number(a));
  const availableBranches = Array.from(
    new Map(
      optionRows
        .filter((row) => row.sucursal_id !== null)
        .map((row) => [
          String(row.sucursal_id),
          { id: String(row.sucursal_id), label: row.sucursal ?? `Sucursal ${row.sucursal_id}` },
        ]),
    ).values(),
  ).sort((a, b) => a.label.localeCompare(b.label));
  const requestedBranch = getSearchParamValue(searchParams.branch);
  const requestedDateFrom = getSearchParamValue(searchParams.dateFrom);
  const requestedDateTo = getSearchParamValue(searchParams.dateTo);
  const dateRangeFilters = resolveDateRangeFilters(searchParams, availableYears);
  const filters: HistoricalMetricsFilters = {
    ...dateRangeFilters,
    branch:
      requestedBranch && availableBranches.some((branch) => branch.id === requestedBranch)
        ? requestedBranch
        : null,
    dateFrom: isDateValue(requestedDateFrom) ? requestedDateFrom ?? null : null,
    dateTo: isDateValue(requestedDateTo) ? requestedDateTo ?? null : null,
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
      filters.dateFrom || filters.dateTo
        ? `${filters.dateFrom ?? "inicio"} a ${filters.dateTo ?? "fin"}`
        : "Todas las fechas",
      "Data historica",
    ].join(" · "),
  };
}

async function fetchDailyBranchRows(filters: HistoricalMetricsFilters) {
  const supabase = await createServerSupabaseClient();
  const rows: HistoricalDailyBranchRow[] = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from("v_historical_subway_daily_branch")
      .select(
        "fecha, anio, semana, dia_semana, sucursal_id, sucursal, venta_total, venta_salon, venta_delivery, clientes_total, clientes_salon, clientes_delivery, ticket_promedio",
      )
      .order("fecha", { ascending: true })
      .order("sucursal", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    query = applySupabaseFilters(query, filters);

    const { data, error } = await query;
    if (error) throw error;

    const page = (data ?? []) as HistoricalDailyBranchRow[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function fetchDetailRows(filters: HistoricalMetricsFilters) {
  const supabase = await createServerSupabaseClient();
  let dataQuery = supabase
    .from("v_historical_subway_fact")
    .select("id, fecha, anio, semana, dia_semana, sucursal_id, sucursal, metrica, valor, source_key, source_file_name, source_sheet_name, created_at")
    .order("fecha", { ascending: false })
    .order("id", { ascending: false })
    .limit(DETAIL_ROW_LIMIT);

  dataQuery = applySupabaseFilters(dataQuery, filters);

  const { data, error } = await dataQuery;

  if (error) throw error;

  const rows = ((data ?? []) as HistoricalFactRow[]).map((row) => ({
    id: row.id,
    sucursalId: row.sucursal_id ?? 0,
    sucursal: row.sucursal ?? "Sin sucursal",
    fecha: row.fecha ?? "",
    anio: row.anio ?? 0,
    semana: row.semana ?? 0,
    diaSemana: row.dia_semana ?? 0,
    metrica: row.metrica ?? "",
    valor: toNumber(row.valor),
    sourceKey: row.source_key ?? "",
    sourceFileName: row.source_file_name,
    sourceSheetName: row.source_sheet_name,
    createdAt: row.created_at ?? "",
  }));

  return {
    rows,
  };
}

export async function getHistoricalMetricsDashboard(
  searchParams: HistoricalMetricsSearchParams = {},
): Promise<HistoricalMetricsData> {
  let optionRows: HistoricalOptionRow[] = [];

  try {
    optionRows = await fetchOptionRows();
  } catch (error) {
    console.error("[dashboard][historical-metrics] Error al leer opciones historicas", error);
  }

  const { filters, availableYears, availableBranches, activePeriodLabel } = resolveFilters(searchParams, optionRows);
  let dailyRows: HistoricalDailyBranchRow[] = [];
  let detailRows: HistoricalMetricDetailRow[] = [];
  let detailRowsTotal = 0;

  try {
    const [dailyResult, detailResult] = await Promise.all([
      fetchDailyBranchRows(filters),
      fetchDetailRows(filters),
    ]);
    dailyRows = dailyResult;
    detailRows = detailResult.rows;
  } catch (error) {
    console.error("[dashboard][historical-metrics] Error al leer views historicas", error);
  }

  detailRowsTotal = dailyRows.length * ALL_METRICS.length;

  const totalSales = dailyRows.reduce((sum, row) => sum + toNumber(row.venta_total), 0);
  const totalClients = dailyRows.reduce((sum, row) => sum + toNumber(row.clientes_total), 0);
  const activeDays = new Set(dailyRows.map((row) => row.fecha).filter(Boolean)).size;

  const metricSummary = ALL_METRICS.map((metric) => {
    const rowsWithMetric = dailyRows.filter((row) => getMetricValue(row, metric) !== 0);
    const total = rowsWithMetric.reduce((sum, row) => sum + getMetricValue(row, metric), 0);
    const sucursalesSet = new Set(rowsWithMetric.map((row) => row.sucursal_id).filter((id): id is number => id !== null));

    return {
      metrica: metric,
      total,
      promedio: rowsWithMetric.length > 0 ? total / rowsWithMetric.length : 0,
      filas: rowsWithMetric.length,
      sucursales: sucursalesSet.size,
      primeraFecha: rowsWithMetric.reduce<string | null>((current, row) => row.fecha ? minDate(current, row.fecha) : current, null),
      ultimaFecha: rowsWithMetric.reduce<string | null>((current, row) => row.fecha ? maxDate(current, row.fecha) : current, null),
    };
  }).filter((item) => item.filas > 0);

  const branchSummary = Array.from(
    dailyRows.reduce((map, row) => {
      const branchId = row.sucursal_id ?? 0;
      const key = String(branchId);
      const current = map.get(key) ?? {
        branchId,
        branch: row.sucursal ?? "Sin sucursal",
        totalSales: 0,
        totalClients: 0,
        filas: 0,
        metricas: ALL_METRICS.length,
        byMetric: {},
        primeraFecha: null as string | null,
        ultimaFecha: null as string | null,
      };

      current.totalSales += toNumber(row.venta_total);
      current.totalClients += toNumber(row.clientes_total);
      current.filas += ALL_METRICS.length;
      for (const metric of ALL_METRICS) {
        current.byMetric[metric] = (current.byMetric[metric] ?? 0) + getMetricValue(row, metric);
      }
      if (row.fecha) {
        current.primeraFecha = minDate(current.primeraFecha, row.fecha);
        current.ultimaFecha = maxDate(current.ultimaFecha, row.fecha);
      }
      map.set(key, current);
      return map;
    }, new Map<string, HistoricalBranchSummaryPoint>()),
  )
    .map(([, value]) => value)
    .sort((a, b) => b.totalSales - a.totalSales);

  const salesMetricKeys = SALES_METRICS.filter((metric) => metricSummary.some((item) => item.metrica === metric));
  const clientMetricKeys = CLIENT_METRICS.filter((metric) => metricSummary.some((item) => item.metrica === metric));

  const yearlyBase = Array.from(
    dailyRows.reduce((map, row) => {
      if (!row.anio) return map;
      const current = map.get(row.anio) ?? {
        anio: row.anio,
        label: String(row.anio),
        ventaTotal: 0,
        clientesTotal: 0,
        ticketPromedio: 0,
        ventaSalon: 0,
        ventaDelivery: 0,
        clientesSalon: 0,
        clientesDelivery: 0,
        deliveryShare: 0,
        salesGrowthPct: null as number | null,
        clientsGrowthPct: null as number | null,
      };

      current.ventaTotal += toNumber(row.venta_total);
      current.ventaSalon += toNumber(row.venta_salon);
      current.ventaDelivery += toNumber(row.venta_delivery);
      current.clientesTotal += toNumber(row.clientes_total);
      current.clientesSalon += toNumber(row.clientes_salon);
      current.clientesDelivery += toNumber(row.clientes_delivery);
      map.set(row.anio, current);
      return map;
    }, new Map<number, HistoricalYearlyPoint>()),
  )
    .map(([, value]) => ({
      ...value,
      ticketPromedio: safeRatio(value.ventaTotal, value.clientesTotal),
      deliveryShare: safeRatio(value.ventaDelivery, value.ventaTotal) * 100,
    }))
    .sort((a, b) => a.anio - b.anio);

  const yearly = yearlyBase.map((item, index) => {
    const previous = yearlyBase[index - 1];
    return {
      ...item,
      salesGrowthPct: previous ? safeGrowth(item.ventaTotal, previous.ventaTotal) : null,
      clientsGrowthPct: previous ? safeGrowth(item.clientesTotal, previous.clientesTotal) : null,
    };
  });

  const monthlyPerformance = Array.from(
    dailyRows.reduce((map, row) => {
      if (!row.fecha || !row.anio) return map;
      const month = getDateMonth(row.fecha);
      if (!month) return map;
      const key = `${row.anio}-${month.padStart(2, "0")}`;
      const current = map.get(key) ?? {
        label: `${getMonthLabel(month, "short")} ${row.anio}`,
        ventaTotal: 0,
        clientesTotal: 0,
        ticketPromedio: 0,
      };

      current.ventaTotal += toNumber(row.venta_total);
      current.clientesTotal += toNumber(row.clientes_total);
      current.ticketPromedio = safeRatio(current.ventaTotal, current.clientesTotal);
      map.set(key, current);
      return map;
    }, new Map<string, HistoricalPeriodPoint>()),
  )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, value]) => value);

  const weekdayLabels = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];
  const weekdayPerformance = Array.from(
    dailyRows.reduce((map, row) => {
      if (!row.dia_semana) return map;
      const current = map.get(row.dia_semana) ?? {
        label: weekdayLabels[row.dia_semana - 1] ?? `Dia ${row.dia_semana}`,
        ventaTotal: 0,
        clientesTotal: 0,
        ticketPromedio: 0,
      };

      current.ventaTotal += toNumber(row.venta_total);
      current.clientesTotal += toNumber(row.clientes_total);
      current.ticketPromedio = safeRatio(current.ventaTotal, current.clientesTotal);
      map.set(row.dia_semana, current);
      return map;
    }, new Map<number, HistoricalPeriodPoint>()),
  )
    .sort((a, b) => a[0] - b[0])
    .map(([, value]) => value);

  const branchPerformance = branchSummary.map((branch) => {
    const ventaTotal = branch.byMetric.VENTA_TOTAL ?? 0;
    const clientesTotal = branch.byMetric.CLIENTES_TOTAL ?? 0;
    const ventaDelivery = branch.byMetric.VENTA_DELIVERY ?? 0;

    return {
      branchId: branch.branchId,
      branch: branch.branch,
      ventaTotal,
      clientesTotal,
      ticketPromedio: safeRatio(ventaTotal, clientesTotal),
      ventaDelivery,
      deliveryShare: safeRatio(ventaDelivery, ventaTotal) * 100,
    };
  }).sort((a, b) => b.ventaTotal - a.ventaTotal);

  const getMetricTotal = (metric: string) => metricSummary.find((item) => item.metrica === metric)?.total ?? 0;
  const salesMix = [
    { label: "Salon", value: getMetricTotal("VENTA_SALON") },
    { label: "Delivery", value: getMetricTotal("VENTA_DELIVERY") },
  ];
  const clientMix = [
    { label: "Salon", value: getMetricTotal("CLIENTES_SALON") },
    { label: "Delivery", value: getMetricTotal("CLIENTES_DELIVERY") },
  ];
  const latestYear = yearly.at(-1);
  const bestBranch = branchPerformance[0];
  const bestWeekday = [...weekdayPerformance].sort((a, b) => b.ventaTotal - a.ventaTotal)[0];
  const deliveryShare = safeRatio(salesMix[1]?.value ?? 0, totalSales) * 100;
  const insights = [
    latestYear
      ? `${latestYear.label}: ${latestYear.salesGrowthPct === null ? "sin comparacion contra el anio anterior" : `${latestYear.salesGrowthPct.toFixed(1)}% frente al año anterior`} en venta total.`
      : "Sin anios historicos visibles.",
    bestBranch
      ? `${bestBranch.branch} lidera la venta historica con ${bestBranch.deliveryShare.toFixed(1)}% por delivery.`
      : "Sin sucursales historicas visibles.",
    bestWeekday
      ? `${bestWeekday.label} concentra la mayor venta historica del filtro.`
      : "Sin dias historicos visibles.",
    totalSales > 0
      ? `Delivery representa ${deliveryShare.toFixed(1)}% de la venta historica visible.`
      : "Sin venta historica visible.",
  ];

  function buildMonthlyTrend(metricKeys: string[]) {
    return Array.from(
      dailyRows.reduce((map, row) => {
        if (!row.fecha || !row.anio) return map;
        const month = getDateMonth(row.fecha);
        if (!month) return map;

        const key = `${row.anio}-${month.padStart(2, "0")}`;
        const entry = map.get(key) ?? { label: `${getMonthLabel(month, "short")} ${row.anio}` };

        for (const metric of metricKeys) {
          entry[metric] = Number(entry[metric] ?? 0) + getMetricValue(row, metric);
        }

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
      totalRows: detailRowsTotal,
      activeMetrics: metricSummary.length,
      activeBranches: branchSummary.length,
      averageSalesPerDay: activeDays > 0 ? totalSales / activeDays : 0,
      averageClientsPerDay: activeDays > 0 ? totalClients / activeDays : 0,
    },
    salesMetricKeys,
    clientMetricKeys,
    metricSummary,
    branchSummary,
    yearly,
    monthlyPerformance,
    weekdayPerformance,
    branchPerformance,
    salesMix,
    clientMix,
    insights,
    monthlySalesTrend: buildMonthlyTrend(salesMetricKeys),
    monthlyClientTrend: buildMonthlyTrend(clientMetricKeys),
    detailRows,
    detailRowsTotal,
    detailRowsLimit: DETAIL_ROW_LIMIT,
  };
}

import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  formatDateRangeLabel,
  getDateMonth,
  getDateYear,
  getMonthLabel,
  getSearchParamValue,
  matchesDateRange,
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
  ventas_salon: number | string | null;
  ventas_delivery: number | string | null;
  unidades_totales: number | string | null;
  productos_distintos: number | string | null;
  operaciones_totales: number | string | null;
  ticket_promedio: number | string | null;
};

type MonthlyBranchRow = {
  fecha: string | null;
  anio: number | null;
  sucursal_id: number | null;
  sucursal: string | null;
  venta_total: number | string | null;
  venta_salon: number | string | null;
  venta_delivery: number | string | null;
  clientes_total: number | string | null;
  ticket_promedio: number | string | null;
};

type PaymentMethodDailyRow = {
  fecha: string | null;
  sucursal_id: number | null;
  sucursal: string | null;
  forma_pago: string | null;
  importe: number | string | null;
  operaciones: number | string | null;
};

export type DashboardBranchesFilters = DashboardDateRangeFilters & {
  branch: string | null;
};

export type DashboardBranchesSearchParams = DashboardDateRangeSearchParams & {
  branch?: string | string[];
};

export type DashboardBranchesKpis = {
  totalSales: number;
  salonSales: number;
  deliverySales: number;
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
  salonSales: number;
  deliverySales: number;
  units: number;
  operations: number;
  averageTicket: number;
  averageProducts: number;
};

export type DashboardBranchDailyPoint = {
  fecha: string;
  branchId: number | null;
  branch: string;
  sales: number;
  salonSales: number;
  deliverySales: number;
  units: number;
  operations: number;
  products: number;
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
  dailyRows: DashboardBranchDailyPoint[];
};

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const parsed = Number(value.replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePaymentMethod(value: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function getPaymentChannel(value: string | null): "salon" | "delivery" | "other" {
  const normalized = normalizePaymentMethod(value);
  if (normalized.includes("PEYA") || normalized.includes("PEDIDOS") || normalized.includes("RAPPI") || normalized.includes("DIDI")) return "delivery";
  if (normalized.includes("VISA") || normalized.includes("EFECTIVO")) return "salon";
  return "other";
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

    return fetchAllRows<PaymentMethodDailyRow>(
      "v_sales_payment_detail",
      "fecha, sucursal_id, sucursal, forma_pago, importe, operaciones",
    );
  }
}

function isHistoricalYear(value: string | null) {
  const year = getDateYear(value);
  return year !== null && Number(year) >= 2023 && Number(year) <= 2025;
}

function isOperationalYear(value: string | null) {
  const year = getDateYear(value);
  return year !== null && Number(year) >= 2026;
}

function mapHistoricalRows(rows: MonthlyBranchRow[]): DailyBranchRow[] {
  return rows
    .filter((row) => isHistoricalYear(row.fecha))
    .map((row) => ({
      fecha: row.fecha,
      sucursal_id: row.sucursal_id,
      sucursal: row.sucursal,
      ventas_totales: row.venta_total,
      ventas_salon: row.venta_salon,
      ventas_delivery: row.venta_delivery,
      unidades_totales: 0,
      productos_distintos: 0,
      operaciones_totales: row.clientes_total,
      ticket_promedio: row.ticket_promedio,
    }));
}

function buildOperationalPaymentChannels(rows: PaymentMethodDailyRow[]) {
  return rows.reduce((map, row) => {
    if (!row.fecha || !isOperationalYear(row.fecha)) return map;

    const branchKey = row.sucursal_id === null ? row.sucursal ?? "Sin sucursal" : String(row.sucursal_id);
    const key = `${row.fecha}__${branchKey}`;
    const current = map.get(key) ?? { salonSales: 0, deliverySales: 0 };
    const channel = getPaymentChannel(row.forma_pago);

    if (channel === "salon") current.salonSales += toNumber(row.importe);
    if (channel === "delivery") current.deliverySales += toNumber(row.importe);
    map.set(key, current);
    return map;
  }, new Map<string, { salonSales: number; deliverySales: number }>());
}

function getBranchPaymentKey(row: { fecha: string | null; sucursal_id: number | null; sucursal: string | null }) {
  if (!row.fecha) return "";
  const branchKey = row.sucursal_id === null ? row.sucursal ?? "Sin sucursal" : String(row.sucursal_id);
  return `${row.fecha}__${branchKey}`;
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
  const [operationalDailyRows, historicalRows, paymentRows] = await Promise.all([
    fetchAllRows<DailyBranchRow>(
      "v_kpi_daily_branch_full",
      "fecha, sucursal_id, sucursal, ventas_totales, unidades_totales, productos_distintos, operaciones_totales, ticket_promedio",
    ),
    fetchAllRows<MonthlyBranchRow>(
      "v_historical_subway_daily_branch",
      "fecha, anio, sucursal_id, sucursal, venta_total, venta_salon, venta_delivery, clientes_total, ticket_promedio",
    ),
    fetchPaymentRows(),
  ]);
  const paymentChannels = buildOperationalPaymentChannels(paymentRows);
  const dailyRows = [
    ...mapHistoricalRows(historicalRows),
    ...operationalDailyRows.filter((row) => isOperationalYear(row.fecha)).map((row) => {
      const channels = paymentChannels.get(getBranchPaymentKey(row));

      return {
        ...row,
        ventas_salon: channels?.salonSales ?? 0,
        ventas_delivery: channels?.deliverySales ?? 0,
      };
    }),
  ];

  const { filters, availableYears, availableMonths, availableBranches, activePeriodLabel } = resolveFilters(searchParams, dailyRows);

  const filteredDaily = dailyRows.filter((row) => matchesFilters(row, filters));

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
        salonSales: 0,
        deliverySales: 0,
        units: 0,
        operations: 0,
        averageTicket: 0,
        averageProducts: 0,
        productDays: 0,
      };

      current.sales += toNumber(row.ventas_totales);
      current.salonSales += toNumber(row.ventas_salon);
      current.deliverySales += toNumber(row.ventas_delivery);
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
      salonSales: value.salonSales,
      deliverySales: value.deliverySales,
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
    filteredDaily.reduce((map, row) => {
      const year = getDateYear(row.fecha);
      const month = getDateMonth(row.fecha);
      if (!year || !month) return map;

      const monthKey = month.padStart(2, "0");
      const monthLabel = getMonthLabel(month, "short");
      const entry = map.get(monthKey) ?? { label: monthLabel };
      entry[year] = Number(entry[year] ?? 0) + toNumber(row.ventas_totales);
      map.set(monthKey, entry);
      return map;
    }, new Map<string, DashboardBranchesChartPoint>()),
  )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, value]) => value);

  const totalSales = filteredDaily.reduce((sum, row) => sum + toNumber(row.ventas_totales), 0);
  const salonSales = filteredDaily.reduce((sum, row) => sum + toNumber(row.ventas_salon), 0);
  const deliverySales = filteredDaily.reduce((sum, row) => sum + toNumber(row.ventas_delivery), 0);
  const totalUnits = filteredDaily.reduce((sum, row) => sum + toNumber(row.unidades_totales), 0);
  const totalOperations = filteredDaily.reduce((sum, row) => sum + toNumber(row.operaciones_totales), 0);
  const totalProducts = filteredDaily.reduce((sum, row) => sum + toNumber(row.productos_distintos), 0);
  const dailyRowsForClient = filteredDaily
    .filter((row) => row.fecha)
    .map((row) => ({
      fecha: row.fecha ?? "",
      branchId: row.sucursal_id,
      branch: row.sucursal ?? "Sin sucursal",
      sales: toNumber(row.ventas_totales),
      salonSales: toNumber(row.ventas_salon),
      deliverySales: toNumber(row.ventas_delivery),
      units: toNumber(row.unidades_totales),
      operations: toNumber(row.operaciones_totales),
      products: toNumber(row.productos_distintos),
    }));

  return {
    filters,
    availableYears,
    availableMonths,
    availableBranches,
    activePeriodLabel,
    branchKeys: comparisonYears,
    kpis: {
      totalSales,
      salonSales,
      deliverySales,
      totalUnits,
      totalOperations,
      averageTicket: totalOperations > 0 ? totalSales / totalOperations : 0,
      activeBranches: branchRanking.length,
      averageProductsPerDay: filteredDaily.length > 0 ? totalProducts / filteredDaily.length : 0,
    },
    branchRanking,
    dailyTrend,
    monthlyTrend,
    dailyRows: dailyRowsForClient,
  };
}

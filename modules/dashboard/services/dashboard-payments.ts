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

type TicketDailyBranchRow = {
  fecha: string | null;
  sucursal_id: number | null;
  sucursal: string | null;
  importe_total: number | string | null;
  operaciones_totales: number | string | null;
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

type PaymentDetailRow = {
  fecha: string | null;
  sucursal_id: number | null;
  sucursal: string | null;
  forma_pago: string | null;
  importe: number | string | null;
  operaciones: number | string | null;
};

type HistoricalDailyBranchRow = {
  fecha: string | null;
  anio: number | null;
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

export type DashboardPaymentsFilters = DashboardDateRangeFilters & {
  branch: string | null;
};

export type DashboardPaymentsSearchParams = DashboardDateRangeSearchParams & {
  branch?: string | string[];
};

export type DashboardPaymentsKpis = {
  totalAmount: number;
  totalOperations: number;
  averageTicket: number;
  activeBranches: number;
  activeMethods: number;
};

export type DashboardPaymentsChartPoint = {
  label: string;
  [key: string]: string | number;
};

export type DashboardPaymentMethodPoint = {
  label: string;
  value: number;
};

export type DashboardPaymentsBranchPoint = {
  branchId: number | null;
  branch: string;
  amount: number;
  operations: number;
  averageTicket: number;
};

export type DashboardPaymentTicketDailyPoint = {
  fecha: string;
  branchId: number | null;
  branch: string;
  amount: number;
  operations: number;
  salonAmount: number;
  deliveryAmount: number;
  salonOperations: number;
  deliveryOperations: number;
};

export type DashboardPaymentMethodDailyPoint = {
  fecha: string;
  branchId: number | null;
  branch: string;
  method: string;
  amount: number;
  operations: number;
};

export type DashboardPaymentsData = {
  filters: DashboardPaymentsFilters;
  availableYears: string[];
  availableMonths: string[];
  availableBranches: Array<{ id: string; label: string }>;
  activePeriodLabel: string;
  branchKeys: string[];
  kpis: DashboardPaymentsKpis;
  paymentMix: DashboardPaymentMethodPoint[];
  paymentsByBranch: DashboardPaymentsBranchPoint[];
  ticketTrend: DashboardPaymentsChartPoint[];
  amountTrend: DashboardPaymentsChartPoint[];
  ticketDailyRows: DashboardPaymentTicketDailyPoint[];
  paymentDailyRows: DashboardPaymentMethodDailyPoint[];
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
  if (normalized.includes("PEYA") || normalized.includes("PEDIDOS") || normalized.includes("RAPPI") || normalized.includes("DIDI") || normalized.includes("DELIVERY")) {
    return "delivery";
  }
  if (normalized.includes("VISA") || normalized.includes("EFECTIVO") || normalized.includes("SALON")) return "salon";
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

function isHistoricalYear(value: string | null) {
  const year = getDateYear(value);
  return year !== null && Number(year) >= 2023 && Number(year) <= 2025;
}

function isOperationalYear(value: string | null) {
  const year = getDateYear(value);
  return year !== null && Number(year) >= 2026;
}

function getBranchPaymentKey(row: { fecha: string | null; sucursal_id: number | null; sucursal: string | null }) {
  if (!row.fecha) return "";
  const branchKey = row.sucursal_id === null ? row.sucursal ?? "Sin sucursal" : String(row.sucursal_id);
  return `${row.fecha}__${branchKey}`;
}

function buildOperationalPaymentChannels(rows: PaymentMethodDailyRow[]) {
  return rows.reduce((map, row) => {
    if (!row.fecha || !isOperationalYear(row.fecha)) return map;

    const key = getBranchPaymentKey(row);
    const current = map.get(key) ?? {
      salonAmount: 0,
      deliveryAmount: 0,
      salonOperations: 0,
      deliveryOperations: 0,
    };
    const channel = getPaymentChannel(row.forma_pago);

    if (channel === "salon") {
      current.salonAmount += toNumber(row.importe);
      current.salonOperations += toNumber(row.operaciones);
    }
    if (channel === "delivery") {
      current.deliveryAmount += toNumber(row.importe);
      current.deliveryOperations += toNumber(row.operaciones);
    }
    map.set(key, current);
    return map;
  }, new Map<string, { salonAmount: number; deliveryAmount: number; salonOperations: number; deliveryOperations: number }>());
}

function mapHistoricalTicketRows(rows: HistoricalDailyBranchRow[]): TicketDailyBranchRow[] {
  return rows
    .filter((row) => isHistoricalYear(row.fecha))
    .map((row) => ({
      fecha: row.fecha,
      sucursal_id: row.sucursal_id,
      sucursal: row.sucursal,
      importe_total: row.venta_total,
      operaciones_totales: row.clientes_total,
      ticket_promedio: row.ticket_promedio,
    }));
}

function mapHistoricalPaymentRows(rows: HistoricalDailyBranchRow[]): PaymentMethodDailyRow[] {
  return rows
    .filter((row) => isHistoricalYear(row.fecha))
    .flatMap((row) => [
      {
        fecha: row.fecha,
        sucursal_id: row.sucursal_id,
        sucursal: row.sucursal,
        forma_pago: "Salon historico",
        importe: row.venta_salon,
        operaciones: row.clientes_salon,
      },
      {
        fecha: row.fecha,
        sucursal_id: row.sucursal_id,
        sucursal: row.sucursal,
        forma_pago: "Delivery historico",
        importe: row.venta_delivery,
        operaciones: row.clientes_delivery,
      },
    ]);
}

function buildHistoricalPaymentChannels(rows: HistoricalDailyBranchRow[]) {
  return rows.reduce((map, row) => {
    if (!row.fecha || !isHistoricalYear(row.fecha)) return map;

    map.set(getBranchPaymentKey(row), {
      salonAmount: toNumber(row.venta_salon),
      deliveryAmount: toNumber(row.venta_delivery),
      salonOperations: toNumber(row.clientes_salon),
      deliveryOperations: toNumber(row.clientes_delivery),
    });
    return map;
  }, new Map<string, { salonAmount: number; deliveryAmount: number; salonOperations: number; deliveryOperations: number }>());
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
  searchParams: DashboardPaymentsSearchParams,
  rows: TicketDailyBranchRow[],
) {
  const availableYears = Array.from(
    new Set(rows.map((row) => getDateYear(row.fecha)).filter(Boolean) as string[]),
  ).sort((a, b) => Number(b) - Number(a));
  const availableBranches = Array.from(
    new Map(
      rows
        .filter((row) => row.sucursal_id !== null)
        .map((row) => [
          String(row.sucursal_id),
          { id: String(row.sucursal_id), label: row.sucursal ?? `Sucursal ${row.sucursal_id}` },
        ]),
    ).values(),
  ).sort((a, b) => a.label.localeCompare(b.label));
  const requestedBranch = getSearchParamValue(searchParams.branch);
  const dateRangeFilters = resolveDateRangeFilters(searchParams, availableYears);
  const filters: DashboardPaymentsFilters = {
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
      "Pagos y ticket promedio por sucursal",
    ].join(" · "),
  };
}

function matchesFilters(row: { fecha: string | null; sucursal_id: number | null }, filters: DashboardPaymentsFilters) {
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

export async function getDashboardPayments(
  searchParams: DashboardPaymentsSearchParams = {},
): Promise<DashboardPaymentsData> {
  const [operationalTicketRows, operationalPaymentRows, historicalRows] = await Promise.all([
    fetchAllRows<TicketDailyBranchRow>(
      "v_kpi_ticket_daily_branch",
      "fecha, sucursal_id, sucursal, importe_total, operaciones_totales, ticket_promedio",
    ),
    fetchPaymentRows(),
    fetchAllRows<HistoricalDailyBranchRow>(
      "v_historical_subway_daily_branch",
      "fecha, anio, sucursal_id, sucursal, venta_total, venta_salon, venta_delivery, clientes_total, clientes_salon, clientes_delivery, ticket_promedio",
    ),
  ]);
  const operationalChannels = buildOperationalPaymentChannels(operationalPaymentRows);
  const historicalChannels = buildHistoricalPaymentChannels(historicalRows);
  const ticketRows = [
    ...mapHistoricalTicketRows(historicalRows),
    ...operationalTicketRows.filter((row) => isOperationalYear(row.fecha)),
  ];
  const paymentRows = [
    ...mapHistoricalPaymentRows(historicalRows),
    ...operationalPaymentRows.filter((row) => isOperationalYear(row.fecha)),
  ];

  const { filters, availableYears, availableMonths, availableBranches, activePeriodLabel } = resolveFilters(searchParams, ticketRows);

  const filteredTicketRows = ticketRows.filter((row) => matchesFilters(row, filters));
  const filteredPaymentRows = paymentRows.filter((row) => matchesFilters(row, filters));

  const comparisonYears = Array.from(
    new Set(filteredTicketRows.map((row) => getDateYear(row.fecha)).filter(Boolean) as string[]),
  ).sort((a, b) => Number(a) - Number(b));

  const paymentsByBranch = Array.from(
    filteredTicketRows.reduce((map, row) => {
      const key = String(row.sucursal_id ?? "0");
      const current = map.get(key) ?? {
        branchId: row.sucursal_id,
        branch: row.sucursal ?? "Sin sucursal",
        amount: 0,
        operations: 0,
        averageTicket: 0,
      };
      current.amount += toNumber(row.importe_total);
      current.operations += toNumber(row.operaciones_totales);
      current.averageTicket = current.operations > 0 ? current.amount / current.operations : 0;
      map.set(key, current);
      return map;
    }, new Map<string, DashboardPaymentsBranchPoint>()),
  )
    .map(([, value]) => value)
    .sort((a, b) => b.amount - a.amount);

  const paymentMix = Array.from(
    filteredPaymentRows.reduce((map, row) => {
      const key = row.forma_pago ?? "Sin forma de pago";
      map.set(key, (map.get(key) ?? 0) + toNumber(row.importe));
      return map;
    }, new Map<string, number>()),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }));

  const ticketTrend = Array.from(
    filteredTicketRows.reduce((map, row) => {
      const year = getDateYear(row.fecha);
      const dayKey = getDayComparisonKey(row.fecha);
      if (!year || !dayKey) return map;

      const current = map.get(dayKey.key) ?? { label: dayKey.label };
      const currentAmountKey = `${year}__amount`;
      const currentOperationsKey = `${year}__operations`;
      current[currentAmountKey] = Number(current[currentAmountKey] ?? 0) + toNumber(row.importe_total);
      current[currentOperationsKey] = Number(current[currentOperationsKey] ?? 0) + toNumber(row.operaciones_totales);
      current[year] =
        Number(current[currentOperationsKey] ?? 0) > 0
          ? Number(current[currentAmountKey] ?? 0) / Number(current[currentOperationsKey])
          : 0;
      map.set(dayKey.key, current);
      return map;
    }, new Map<string, DashboardPaymentsChartPoint>()),
  )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, value]) => value);

  const amountTrend = Array.from(
    filteredTicketRows.reduce((map, row) => {
      const year = getDateYear(row.fecha);
      const dayKey = getDayComparisonKey(row.fecha);
      if (!year || !dayKey) return map;

      const entry = map.get(dayKey.key) ?? { label: dayKey.label };
      entry[year] = Number(entry[year] ?? 0) + toNumber(row.importe_total);
      map.set(dayKey.key, entry);
      return map;
    }, new Map<string, DashboardPaymentsChartPoint>()),
  )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, value]) => value);

  const totalAmount = filteredTicketRows.reduce((sum, row) => sum + toNumber(row.importe_total), 0);
  const totalOperations = filteredTicketRows.reduce((sum, row) => sum + toNumber(row.operaciones_totales), 0);
  const ticketDailyRows = filteredTicketRows
    .filter((row) => row.fecha)
    .map((row) => {
      const channels = historicalChannels.get(getBranchPaymentKey(row)) ?? operationalChannels.get(getBranchPaymentKey(row));

      return {
        fecha: row.fecha ?? "",
        branchId: row.sucursal_id,
        branch: row.sucursal ?? "Sin sucursal",
        amount: toNumber(row.importe_total),
        operations: toNumber(row.operaciones_totales),
        salonAmount: channels?.salonAmount ?? 0,
        deliveryAmount: channels?.deliveryAmount ?? 0,
        salonOperations: channels?.salonOperations ?? 0,
        deliveryOperations: channels?.deliveryOperations ?? 0,
      };
    });
  const paymentDailyRows = filteredPaymentRows
    .filter((row) => row.fecha)
    .map((row) => ({
      fecha: row.fecha ?? "",
      branchId: row.sucursal_id,
      branch: row.sucursal ?? "Sin sucursal",
      method: row.forma_pago ?? "Sin forma de pago",
      amount: toNumber(row.importe),
      operations: toNumber(row.operaciones),
    }));

  return {
    filters,
    availableYears,
    availableMonths,
    availableBranches,
    activePeriodLabel,
    branchKeys: comparisonYears,
    kpis: {
      totalAmount,
      totalOperations,
      averageTicket: totalOperations > 0 ? totalAmount / totalOperations : 0,
      activeBranches: paymentsByBranch.length,
      activeMethods: paymentMix.length,
    },
    paymentMix,
    paymentsByBranch,
    ticketTrend,
    amountTrend,
    ticketDailyRows,
    paymentDailyRows,
  };
}

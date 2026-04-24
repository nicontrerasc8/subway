import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const PAGE_SIZE = 1000;

type SearchParamValue = string | string[] | undefined;

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

export type DashboardPaymentsFilters = {
  year: string | null;
  month: string | null;
};

export type DashboardPaymentsSearchParams = {
  year?: SearchParamValue;
  month?: SearchParamValue;
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

export type DashboardPaymentsData = {
  filters: DashboardPaymentsFilters;
  availableYears: string[];
  availableMonths: string[];
  activePeriodLabel: string;
  branchKeys: string[];
  kpis: DashboardPaymentsKpis;
  paymentMix: DashboardPaymentMethodPoint[];
  paymentsByBranch: DashboardPaymentsBranchPoint[];
  ticketTrend: DashboardPaymentsChartPoint[];
  amountTrend: DashboardPaymentsChartPoint[];
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
  const requestedYear = getParam(searchParams.year);
  const requestedMonth = getParam(searchParams.month);

  const availableYears = Array.from(
    new Set(rows.map((row) => getDateYear(row.fecha)).filter(Boolean) as string[]),
  ).sort((a, b) => Number(b) - Number(a));
  const availableMonths = Array.from({ length: 12 }, (_, index) => String(index + 1));

  const filters: DashboardPaymentsFilters = {
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
      "Pagos y ticket por sucursal",
    ].join(" · "),
  };
}

function matchesFilters(row: { fecha: string | null }, filters: DashboardPaymentsFilters) {
  if (filters.year && getDateYear(row.fecha) !== filters.year) return false;
  if (filters.month && getDateMonth(row.fecha) !== filters.month) return false;
  return true;
}

export async function getDashboardPayments(
  searchParams: DashboardPaymentsSearchParams = {},
): Promise<DashboardPaymentsData> {
  const [ticketRows, paymentRows] = await Promise.all([
    fetchAllRows<TicketDailyBranchRow>(
      "v_kpi_ticket_daily_branch",
      "fecha, sucursal_id, sucursal, importe_total, operaciones_totales, ticket_promedio",
    ),
    fetchPaymentRows(),
  ]);

  const { filters, availableYears, availableMonths, activePeriodLabel } = resolveFilters(searchParams, ticketRows);

  const filteredTicketRows = ticketRows.filter((row) => matchesFilters(row, filters));
  const filteredPaymentRows = paymentRows.filter((row) => matchesFilters(row, filters));

  const branchKeys = Array.from(
    new Map(
      filteredTicketRows
        .filter((row) => row.sucursal_id !== null)
        .map((row) => [String(row.sucursal_id), row.sucursal ?? `Sucursal ${row.sucursal_id}`]),
    ).values(),
  ).sort((a, b) => a.localeCompare(b));

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
      const key = row.fecha ?? "";
      const entry = map.get(key) ?? { label: key };
      entry[row.sucursal ?? "Sin sucursal"] = toNumber(row.ticket_promedio);
      map.set(key, entry);
      return map;
    }, new Map<string, DashboardPaymentsChartPoint>()),
  )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, value]) => value);

  const amountTrend = Array.from(
    filteredTicketRows.reduce((map, row) => {
      const key = row.fecha ?? "";
      const entry = map.get(key) ?? { label: key };
      entry[row.sucursal ?? "Sin sucursal"] = toNumber(row.importe_total);
      map.set(key, entry);
      return map;
    }, new Map<string, DashboardPaymentsChartPoint>()),
  )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, value]) => value);

  const totalAmount = filteredTicketRows.reduce((sum, row) => sum + toNumber(row.importe_total), 0);
  const totalOperations = filteredTicketRows.reduce((sum, row) => sum + toNumber(row.operaciones_totales), 0);

  return {
    filters,
    availableYears,
    availableMonths,
    activePeriodLabel,
    branchKeys,
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
  };
}

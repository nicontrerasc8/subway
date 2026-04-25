import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  formatDateRangeLabel,
  getDateYear,
  getSearchParamValue,
  matchesDateRange,
  resolveDateRangeFilters,
  type DashboardDateRangeFilters,
  type DashboardDateRangeSearchParams,
} from "@/modules/dashboard/lib/date-range-filters";
import { normalizeText } from "@/modules/dashboard/lib/subway-product-category";

const PAGE_SIZE = 1000;

type SearchParamValue = string | string[] | undefined;

type PaymentDailyRow = {
  fecha: string | null;
  sucursal_id: number | null;
  sucursal: string | null;
  forma_pago: string | null;
  importe: number | string | null;
  operaciones: number | string | null;
};

type TicketDailyRow = {
  fecha: string | null;
  sucursal_id: number | null;
  sucursal: string | null;
  importe_total: number | string | null;
  operaciones_totales: number | string | null;
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

export type DashboardCommercialInsightsSearchParams = DashboardDateRangeSearchParams & {
  branch?: SearchParamValue;
};

export type DashboardCommercialInsightsFilters = DashboardDateRangeFilters & {
  branch: string | null;
};

export type DashboardCommercialKpis = {
  deliverySalesCurrent: number;
  deliverySalesPrevious: number;
  deliverySalesDelta: number | null;
  deliveryTransactionsCurrent: number;
  deliveryTransactionsPrevious: number;
  deliveryTransactionsDelta: number | null;
  deliveryTicketCurrent: number;
  deliveryTicketPrevious: number;
  deliveryTicketDelta: number | null;
  deliveryShareCurrent: number;
  deliverySharePrevious: number;
};

export type DashboardCommercialChartPoint = {
  label: string;
  [key: string]: string | number;
};

export type DashboardCommercialSharePoint = {
  label: string;
  units: number;
  share: number;
};

export type DashboardCommercialInsightsData = {
  filters: DashboardCommercialInsightsFilters;
  availableYears: string[];
  availableBranches: Array<{ id: string; label: string }>;
  activePeriodLabel: string;
  previousYear: string | null;
  currentYear: string | null;
  yearKeys: string[];
  platformKeys: string[];
  productGroupKeys: string[];
  kpis: DashboardCommercialKpis;
  deliverySalesByPlatform: DashboardCommercialChartPoint[];
  deliveryTransactionsByPlatform: DashboardCommercialChartPoint[];
  deliveryTicketByPlatform: DashboardCommercialChartPoint[];
  productGroupsByYear: DashboardCommercialChartPoint[];
  productGroupShares: DashboardCommercialSharePoint[];
  attachmentShares: DashboardCommercialSharePoint[];
};

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const parsed = Number(value.replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function percentDelta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / previous;
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
    return await fetchAllRows<PaymentDailyRow>(
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

    return fetchAllRows<PaymentDailyRow>(
      "v_sales_payment_detail",
      "fecha, sucursal_id, sucursal, forma_pago, importe, operaciones",
    );
  }
}

function resolveFilters(
  searchParams: DashboardCommercialInsightsSearchParams,
  rows: TicketDailyRow[],
) {
  const requestedBranch = getSearchParamValue(searchParams.branch);
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
  const dateRangeFilters = resolveDateRangeFilters(searchParams, availableYears);
  const filters: DashboardCommercialInsightsFilters = {
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
      "Insights comerciales",
    ].join(" · "),
  };
}

function matchesFilters(
  row: { fecha: string | null; sucursal_id: number | null },
  filters: DashboardCommercialInsightsFilters,
) {
  if (!matchesDateRange(row.fecha, filters)) return false;
  if (filters.branch && String(row.sucursal_id) !== filters.branch) return false;
  return true;
}

function getDeliveryPlatform(value: string | null) {
  const normalized = normalizeText(value ?? "");
  if (normalized.includes("PEYA") || normalized.includes("PEDIDOS")) return "Peya";
  if (normalized.includes("RAPPI")) return "Rappi";
  if (normalized.includes("TURBO")) return "Turbo";
  if (normalized.includes("DIDI")) return "Didi";
  return null;
}

function getCommercialProductGroup(product: string | null, category: string | null) {
  if (category?.trim()) return category.trim();

  const normalized = normalizeText(product ?? "");

  if (normalized.includes("SUB") && normalized.includes("15")) return "SUB 15 CM";
  if (normalized.includes("SUB") && normalized.includes("30")) return "SUB 30 CM";
  if (normalized.includes("DEL DIA") || normalized.includes("DIA")) return "DEL DIA";
  if (normalized.includes("WRAP")) return "WRAPS";
  if (normalized.includes("ENSALADA")) return "ENSALADA";
  if (normalized.includes("MAYOQUESO")) return "Mayoqueso";
  if (normalized.includes("2X1") || normalized.includes("2 X") || normalized.includes("PROMO")) return "PROMOS";
  if (normalized.includes("COMBO")) return "COMBO";
  if (
    normalized.includes("SODA") ||
    normalized.includes("BEBIDA") ||
    normalized.includes("GASEOSA") ||
    normalized.includes("AGUA")
  ) {
    return "COMPLEMENTOS";
  }
  if (normalized.includes("PAPA")) return "COMPLEMENTOS";
  if (normalized.includes("EXTRA")) return "COMPLEMENTOS";
  if (normalized.includes("GALLETA") || normalized.includes("COOKIE")) return "COMPLEMENTOS";
  return "OTROS";
}

function getAttachmentGroup(product: string | null, category: string | null) {
  const group = getCommercialProductGroup(product, category);
  if (group === "Combos") return "Combos";
  if (group === "Bebidas") return "Bebidas solas";
  if (group === "Extras") return "Extras";
  if (group === "Papas") return "Papas";
  return null;
}

function getComparisonYears(rows: Array<{ fecha: string | null }>) {
  const years = Array.from(
    new Set(rows.map((row) => getDateYear(row.fecha)).filter(Boolean) as string[]),
  ).sort((a, b) => Number(a) - Number(b));
  const currentYear = years.at(-1) ?? null;
  const previousYear =
    currentYear && years.includes(String(Number(currentYear) - 1))
      ? String(Number(currentYear) - 1)
      : years.at(-2) ?? null;

  return {
    currentYear,
    previousYear,
    yearKeys: [previousYear, currentYear].filter(Boolean) as string[],
  };
}

function makeYearPoint(label: string, keys: string[], values: Record<string, number>) {
  return keys.reduce<DashboardCommercialChartPoint>(
    (point, key) => {
      point[key] = values[key] ?? 0;
      return point;
    },
    { label },
  );
}

export async function getDashboardCommercialInsights(
  searchParams: DashboardCommercialInsightsSearchParams = {},
): Promise<DashboardCommercialInsightsData> {
  const [ticketRows, paymentRows, productRows] = await Promise.all([
    fetchAllRows<TicketDailyRow>(
      "v_kpi_ticket_daily_branch",
      "fecha, sucursal_id, sucursal, importe_total, operaciones_totales",
    ),
    fetchPaymentRows(),
    fetchAllRows<ProductDailyRow>(
      "v_sales_product_daily",
      "fecha, sucursal_id, sucursal, referencia, producto, categoria, unidades, ventas",
    ),
  ]);

  const { filters, availableYears, availableBranches, activePeriodLabel } = resolveFilters(searchParams, ticketRows);
  const filteredTicketRows = ticketRows.filter((row) => matchesFilters(row, filters));
  const filteredPaymentRows = paymentRows.filter((row) => matchesFilters(row, filters));
  const filteredProductRows = productRows.filter((row) => matchesFilters(row, filters));
  const { currentYear, previousYear, yearKeys } = getComparisonYears(filteredTicketRows);
  const totalByYear = filteredTicketRows.reduce((map, row) => {
    const year = getDateYear(row.fecha);
    if (!year) return map;
    const current = map.get(year) ?? { sales: 0, transactions: 0 };
    current.sales += toNumber(row.importe_total);
    current.transactions += toNumber(row.operaciones_totales);
    map.set(year, current);
    return map;
  }, new Map<string, { sales: number; transactions: number }>());

  const deliveryByYear = new Map<string, { sales: number; transactions: number }>();
  const deliveryByPlatform = new Map<string, Record<string, { sales: number; transactions: number }>>();

  for (const row of filteredPaymentRows) {
    const platform = getDeliveryPlatform(row.forma_pago);
    const year = getDateYear(row.fecha);
    if (!platform || !year) continue;

    const yearCurrent = deliveryByYear.get(year) ?? { sales: 0, transactions: 0 };
    yearCurrent.sales += toNumber(row.importe);
    yearCurrent.transactions += toNumber(row.operaciones);
    deliveryByYear.set(year, yearCurrent);

    const platformCurrent = deliveryByPlatform.get(platform) ?? {};
    platformCurrent[year] = platformCurrent[year] ?? { sales: 0, transactions: 0 };
    platformCurrent[year].sales += toNumber(row.importe);
    platformCurrent[year].transactions += toNumber(row.operaciones);
    deliveryByPlatform.set(platform, platformCurrent);
  }

  const platformOrder = ["Peya", "Rappi", "Turbo", "Didi"];
  const platformKeys = Array.from(deliveryByPlatform.keys()).sort((a, b) => {
    const aIndex = platformOrder.indexOf(a);
    const bIndex = platformOrder.indexOf(b);
    if (aIndex !== -1 || bIndex !== -1) {
      return (aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex) - (bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex);
    }

    const aTotal = yearKeys.reduce((sum, year) => sum + (deliveryByPlatform.get(a)?.[year]?.sales ?? 0), 0);
    const bTotal = yearKeys.reduce((sum, year) => sum + (deliveryByPlatform.get(b)?.[year]?.sales ?? 0), 0);
    return bTotal - aTotal;
  });

  const deliverySalesByPlatform = platformKeys.map((platform) => {
    const byYear = deliveryByPlatform.get(platform) ?? {};
    return makeYearPoint(
      platform,
      yearKeys,
      Object.fromEntries(yearKeys.map((year) => [year, byYear[year]?.sales ?? 0])),
    );
  });

  const deliveryTransactionsByPlatform = platformKeys.map((platform) => {
    const byYear = deliveryByPlatform.get(platform) ?? {};
    return makeYearPoint(
      platform,
      yearKeys,
      Object.fromEntries(yearKeys.map((year) => [year, byYear[year]?.transactions ?? 0])),
    );
  });

  const deliveryTicketByPlatform = platformKeys.map((platform) => {
    const byYear = deliveryByPlatform.get(platform) ?? {};
    return makeYearPoint(
      platform,
      yearKeys,
      Object.fromEntries(
        yearKeys.map((year) => {
          const values = byYear[year] ?? { sales: 0, transactions: 0 };
          return [year, values.transactions > 0 ? values.sales / values.transactions : 0];
        }),
      ),
    );
  });

  const productGroupMap = new Map<string, Record<string, number>>();
  const attachmentMap = new Map<string, number>();
  let totalUnits = 0;

  for (const row of filteredProductRows) {
    const year = getDateYear(row.fecha);
    const units = toNumber(row.unidades);
    const productGroup = getCommercialProductGroup(row.producto, row.categoria);
    const attachmentGroup = getAttachmentGroup(row.producto, row.categoria);
    if (!year) continue;

    const groupCurrent = productGroupMap.get(productGroup) ?? {};
    groupCurrent[year] = (groupCurrent[year] ?? 0) + units;
    productGroupMap.set(productGroup, groupCurrent);

    if (attachmentGroup) {
      attachmentMap.set(attachmentGroup, (attachmentMap.get(attachmentGroup) ?? 0) + units);
    }
    totalUnits += units;
  }

  const productGroupKeys = Array.from(productGroupMap.entries())
    .sort(
      (a, b) =>
        yearKeys.reduce((sum, year) => sum + (b[1][year] ?? 0), 0) -
        yearKeys.reduce((sum, year) => sum + (a[1][year] ?? 0), 0),
    )
    .slice(0, 10)
    .map(([group]) => group);

  const productGroupsByYear = productGroupKeys.map((group) =>
    makeYearPoint(group, yearKeys, productGroupMap.get(group) ?? {}),
  );

  const productGroupShares = productGroupKeys.map((group) => {
    const units = yearKeys.reduce((sum, year) => sum + (productGroupMap.get(group)?.[year] ?? 0), 0);
    return {
      label: group,
      units,
      share: totalUnits > 0 ? units / totalUnits : 0,
    };
  });

  const attachmentShares = ["Combos", "Bebidas solas", "Extras", "Papas"].map((label) => {
    const units = attachmentMap.get(label) ?? 0;
    return {
      label,
      units,
      share: totalUnits > 0 ? units / totalUnits : 0,
    };
  });

  const currentDelivery = currentYear ? deliveryByYear.get(currentYear) ?? { sales: 0, transactions: 0 } : { sales: 0, transactions: 0 };
  const previousDelivery = previousYear ? deliveryByYear.get(previousYear) ?? { sales: 0, transactions: 0 } : { sales: 0, transactions: 0 };
  const currentTotal = currentYear ? totalByYear.get(currentYear) ?? { sales: 0, transactions: 0 } : { sales: 0, transactions: 0 };
  const previousTotal = previousYear ? totalByYear.get(previousYear) ?? { sales: 0, transactions: 0 } : { sales: 0, transactions: 0 };
  const deliveryTicketCurrent =
    currentDelivery.transactions > 0 ? currentDelivery.sales / currentDelivery.transactions : 0;
  const deliveryTicketPrevious =
    previousDelivery.transactions > 0 ? previousDelivery.sales / previousDelivery.transactions : 0;

  return {
    filters,
    availableYears,
    availableBranches,
    activePeriodLabel,
    previousYear,
    currentYear,
    yearKeys,
    platformKeys,
    productGroupKeys,
    kpis: {
      deliverySalesCurrent: currentDelivery.sales,
      deliverySalesPrevious: previousDelivery.sales,
      deliverySalesDelta: percentDelta(currentDelivery.sales, previousDelivery.sales),
      deliveryTransactionsCurrent: currentDelivery.transactions,
      deliveryTransactionsPrevious: previousDelivery.transactions,
      deliveryTransactionsDelta: percentDelta(currentDelivery.transactions, previousDelivery.transactions),
      deliveryTicketCurrent,
      deliveryTicketPrevious,
      deliveryTicketDelta: percentDelta(deliveryTicketCurrent, deliveryTicketPrevious),
      deliveryShareCurrent: currentTotal.sales > 0 ? currentDelivery.sales / currentTotal.sales : 0,
      deliverySharePrevious: previousTotal.sales > 0 ? previousDelivery.sales / previousTotal.sales : 0,
    },
    deliverySalesByPlatform,
    deliveryTransactionsByPlatform,
    deliveryTicketByPlatform,
    productGroupsByYear,
    productGroupShares,
    attachmentShares,
  };
}

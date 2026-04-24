import "server-only";

import {
  buildSubwayFilterHref,
  dayLabels,
  formatShortDate,
  getMonday,
  getRowYear,
  getWeekKey,
  getWeekNumber,
  getWeekdayIndex,
  matchesDateFilters,
  parseBusinessDate,
  resolveSubwayFilters,
  toDateKey,
  type SubwayFilterSearchParams,
  type SubwayFilters,
} from "@/modules/dashboard/lib/subway-filters";
import { getProductCategory, normalizeText } from "@/modules/dashboard/lib/subway-product-category";
import {
  getSubwaySalesSummary,
} from "@/modules/dashboard/services/subway-sales";

type ProductAgg = {
  referencia: string;
  descripcion: string;
  categoria: string;
  unidades: number;
  total: number;
  filas: number;
};

type PaymentMethodAgg = {
  formaPago: string;
  importe: number;
  operaciones: number;
  filas: number;
  digital: boolean;
};

type DailyAgg = {
  total: number;
  unidades: number;
  filas: number;
};

type PaymentDailyAgg = {
  importe: number;
  operaciones: number;
  filas: number;
};

type PaymentChannelDailyAgg = {
  date: string;
  label: string;
  values: Map<string, number>;
};

type CalendarCellAgg = {
  key: string;
  label: string;
  value: number;
  units: number;
};

type WeeklyAgg = {
  total: number;
  unidades: number;
  filas: number;
  year: number;
  week: number;
};

type AuditImportAgg = {
  importId: string;
  fecha: string | null;
  salesRows: number;
  paymentRows: number;
  salesAmount: number;
  paymentAmount: number;
  operations: number;
  units: number;
  latestCreatedAt: string | null;
};

export type SubwayKpiItem = {
  title: string;
  value: string;
  helper: string;
};

export type SubwayDailyPoint = {
  date: string;
  label: string;
  total: number;
  unidades: number;
  filas: number;
  ticketUnitario: number;
};

export type SubwayWeeklyPoint = {
  week: string;
  label: string;
  actual: number;
  anterior: number;
  crecimiento: number | null;
};

export type SubwayYearPoint = {
  year: string;
  total: number;
  unidades: number;
  filas: number;
  ticketUnitario: number;
};

export type SubwayWeekdayPoint = {
  day: string;
  total: number;
  unidades: number;
  filas: number;
  ticketUnitario: number;
};

export type SubwayProductPoint = {
  name: string;
  referencia: string;
  categoria: string;
  total: number;
  unidades: number;
  filas: number;
  ticketUnitario: number;
  share: number;
  acumulado: number;
};

export type SubwayCategoryPoint = {
  categoria: string;
  total: number;
  unidades: number;
  filas: number;
  ticketUnitario: number;
  share: number;
};

export type SubwayPaymentDailyPoint = {
  date: string;
  label: string;
  ventas: number;
  importe: number;
  operaciones: number;
  diferencia: number;
  ticketOperacion: number;
  unidadesPorOperacion: number;
  ventasPorOperacion: number;
};

export type SubwayPaymentMethodPoint = {
  formaPago: string;
  importe: number;
  operaciones: number;
  ticketOperacion: number;
  share: number;
  digital: boolean;
};

export type SubwayPaymentChannelPoint = {
  date: string;
  label: string;
  [key: string]: string | number;
};

export type SubwayCalendarCell = {
  weekStart: string;
  weekday: number;
  label: string;
  value: number;
  units: number;
};

export type SubwayImportSummary = {
  importId: string;
  fecha: string | null;
  salesRows: number;
  paymentRows: number;
  salesAmount: number;
  paymentAmount: number;
  operations: number;
  units: number;
  latestCreatedAt: string | null;
  delta: number;
};

export type SubwayAuditOutlier = {
  type: "venta" | "unidades" | "importe";
  importId: string;
  fecha: string | null;
  label: string;
  metric: number;
  secondary: number;
};

export type SubwayCoveragePoint = {
  date: string;
  label: string;
  ventas: number;
  importe: number;
  tieneVentas: boolean;
  tienePagos: boolean;
  operaciones: number;
};

export type SubwayCategoryWeekdayPoint = {
  categoria: string;
  weekday: number;
  dayLabel: string;
  total: number;
  shareWithinDay: number;
};

export type SubwaySummaryStats = {
  totalSales: number;
  totalUnits: number;
  totalPaymentAmount: number;
  totalOperations: number;
  averageTicketUnit: number;
  averagePaymentTicket: number;
  averageUnitsPerOperation: number;
  averageSalesPerOperation: number;
  reconciliationDelta: number;
  digitalShare: number;
  cashShare: number;
  productCount: number;
  importCount: number;
  paymentImportCount: number;
  top3Share: number;
  top10Share: number;
};

export type SubwayExecutiveSummary = {
  activePeriodLabel: string;
  filters: SubwayFilters;
  availableYears: string[];
  stats: SubwaySummaryStats;
  latestSalesDate: string | null;
  latestPaymentDate: string | null;
  bestDayLabel: string;
  bestWeekLabel: string;
  bestWeekdayLabel: string;
  strongestPaymentMethod: string;
  strongestCategory: string;
  yoyGrowth: number | null;
};

export type SubwaySalesMixSummary = {
  stats: SubwaySummaryStats;
  daily: SubwayDailyPoint[];
  weekly: SubwayWeeklyPoint[];
  yearly: SubwayYearPoint[];
  weekdays: SubwayWeekdayPoint[];
  products: SubwayProductPoint[];
  categories: SubwayCategoryPoint[];
  heatWeeks: string[];
  heatMax: number;
  heatCells: SubwayCalendarCell[];
  insights: string[];
  heroProduct: SubwayProductPoint | null;
};

export type SubwayPaymentsSummary = {
  stats: SubwaySummaryStats;
  paymentDaily: SubwayPaymentDailyPoint[];
  paymentMethods: SubwayPaymentMethodPoint[];
  paymentChannelDaily: SubwayPaymentChannelPoint[];
  paymentChannelKeys: string[];
  operationHeatWeeks: string[];
  operationHeatMax: number;
  operationHeatCells: SubwayCalendarCell[];
  insights: string[];
};

export type SubwayAuditSummary = {
  importSummaries: SubwayImportSummary[];
  coverage: SubwayCoveragePoint[];
  outliers: SubwayAuditOutlier[];
  missingPaymentDates: number;
  missingSalesDates: number;
  latestImportDate: string | null;
};

export type SubwayCrossAnalysisSummary = {
  paymentDaily: SubwayPaymentDailyPoint[];
  categoryWeekdayMatrix: SubwayCategoryWeekdayPoint[];
  topHighTrafficDays: SubwayPaymentDailyPoint[];
  topEfficientDays: SubwayPaymentDailyPoint[];
  proxyInsights: string[];
};

export type SubwayBiDashboardData = {
  executive: SubwayExecutiveSummary;
  salesMix: SubwaySalesMixSummary;
  payments: SubwayPaymentsSummary;
  audit: SubwayAuditSummary;
  cross: SubwayCrossAnalysisSummary;
};

function safeGrowth(current: number, previous: number) {
  if (!previous) return null;

  return ((current - previous) / previous) * 100;
}

function addMetric<T extends DailyAgg>(map: Map<string, T>, key: string, fallback: T, total: number, unidades: number) {
  if (!map.has(key)) map.set(key, fallback);

  const current = map.get(key)!;
  current.total += total;
  current.unidades += unidades;
  current.filas += 1;
}

function formatProductLabel(value: string) {
  return value.replace(/\s+-\s+/g, " ").trim();
}

function isDigitalPayment(value: string) {
  const normalized = normalizeText(value);

  return normalized.includes("TARJ")
    || normalized.includes("YAPE")
    || normalized.includes("PLIN")
    || normalized.includes("APP")
    || normalized.includes("DIGITAL")
    || normalized.includes("QR")
    || normalized.includes("TRANSFER")
    || normalized.includes("POS");
}

function createInsight(value: string, fallback = "Sin datos suficientes para concluir.") {
  return value || fallback;
}

export async function getSubwayBiDashboard(
  searchParams: SubwayFilterSearchParams = {},
): Promise<SubwayBiDashboardData> {
  const summary = await getSubwaySalesSummary();
  const allRows = summary.rows ?? [];
  const allPaymentRows = summary.paymentRows ?? [];
  const { filters, availableYears, activePeriodLabel } = resolveSubwayFilters(searchParams, allRows, allPaymentRows);
  const previousSelectedYear = filters.year ? String(Number(filters.year) - 1) : null;
  const comparisonYears = filters.year ? new Set([filters.year, previousSelectedYear]) : null;

  const rows = allRows.filter((row) => matchesDateFilters(row, filters));
  const paymentRows = allPaymentRows.filter((row) => matchesDateFilters(row, filters));
  const comparisonRows = comparisonYears
    ? allRows.filter(
        (row) =>
          comparisonYears.has(getRowYear(row)) &&
          matchesDateFilters(row, { year: null, month: filters.month, weekday: filters.weekday }),
      )
    : allRows.filter((row) => matchesDateFilters(row, { year: null, month: filters.month, weekday: filters.weekday }));

  const productMap = new Map<string, ProductAgg>();
  const paymentMethodMap = new Map<string, PaymentMethodAgg>();
  const categoryMap = new Map<string, { categoria: string; total: number; unidades: number; filas: number }>();
  const dailyMap = new Map<string, DailyAgg>();
  const weeklyMap = new Map<string, WeeklyAgg>();
  const yearlyMap = new Map<string, DailyAgg>();
  const weekdayMap = new Map<string, DailyAgg>();
  const paymentDailyMap = new Map<string, PaymentDailyAgg>();
  const paymentChannelDailyMap = new Map<string, PaymentChannelDailyAgg>();
  const salesHeatmapMap = new Map<string, CalendarCellAgg>();
  const operationsHeatmapMap = new Map<string, CalendarCellAgg>();
  const importSummaryMap = new Map<string, AuditImportAgg>();
  const categoryWeekdayAggMap = new Map<string, { categoria: string; weekday: number; dayLabel: string; total: number }>();
  const dayCategoryTotals = new Map<number, number>();

  for (const row of rows) {
    const total = Number(row.total ?? 0);
    const unidades = Number(row.unidades ?? 0);
    const businessDate = parseBusinessDate(row.fecha ?? row.uploadedAt);
    const dateKey = toDateKey(businessDate);
    const weekStart = getMonday(businessDate);
    const weekdayIndex = getWeekdayIndex(businessDate);
    const heatKey = `${toDateKey(weekStart)}-${weekdayIndex}`;
    const productKey = `${row.referencia}__${row.descripcion}`;
    const categoryKey = row.categoria || getProductCategory(row.descripcion);
    const importKey = row.importId || dateKey;

    if (!productMap.has(productKey)) {
      productMap.set(productKey, {
        referencia: row.referencia,
        descripcion: row.descripcion,
        categoria: categoryKey,
        unidades: 0,
        total: 0,
        filas: 0,
      });
    }

    const product = productMap.get(productKey)!;
    product.unidades += unidades;
    product.total += total;
    product.filas += 1;

    if (!categoryMap.has(categoryKey)) {
      categoryMap.set(categoryKey, {
        categoria: categoryKey,
        total: 0,
        unidades: 0,
        filas: 0,
      });
    }

    const category = categoryMap.get(categoryKey)!;
    category.total += total;
    category.unidades += unidades;
    category.filas += 1;

    addMetric(dailyMap, dateKey, { total: 0, unidades: 0, filas: 0 }, total, unidades);
    addMetric(weekdayMap, String(weekdayIndex), { total: 0, unidades: 0, filas: 0 }, total, unidades);

    if (!salesHeatmapMap.has(heatKey)) {
      salesHeatmapMap.set(heatKey, {
        key: heatKey,
        label: dayLabels[weekdayIndex],
        value: 0,
        units: 0,
      });
    }

    const salesHeatCell = salesHeatmapMap.get(heatKey)!;
    salesHeatCell.value += total;
    salesHeatCell.units += unidades;

    if (!categoryWeekdayAggMap.has(`${categoryKey}-${weekdayIndex}`)) {
      categoryWeekdayAggMap.set(`${categoryKey}-${weekdayIndex}`, {
        categoria: categoryKey,
        weekday: weekdayIndex,
        dayLabel: dayLabels[weekdayIndex],
        total: 0,
      });
    }

    const categoryWeekday = categoryWeekdayAggMap.get(`${categoryKey}-${weekdayIndex}`)!;
    categoryWeekday.total += total;
    dayCategoryTotals.set(weekdayIndex, (dayCategoryTotals.get(weekdayIndex) ?? 0) + total);

    if (!importSummaryMap.has(importKey)) {
      importSummaryMap.set(importKey, {
        importId: importKey,
        fecha: row.fecha,
        salesRows: 0,
        paymentRows: 0,
        salesAmount: 0,
        paymentAmount: 0,
        operations: 0,
        units: 0,
        latestCreatedAt: row.uploadedAt,
      });
    }

    const importSummary = importSummaryMap.get(importKey)!;
    importSummary.salesRows += 1;
    importSummary.salesAmount += total;
    importSummary.units += unidades;
    importSummary.latestCreatedAt = row.uploadedAt > (importSummary.latestCreatedAt ?? "") ? row.uploadedAt : importSummary.latestCreatedAt;
  }

  for (const row of comparisonRows) {
    const total = Number(row.total ?? 0);
    const unidades = Number(row.unidades ?? 0);
    const businessDate = parseBusinessDate(row.fecha ?? row.uploadedAt);
    const yearKey = String(businessDate.getFullYear());
    const weekKey = getWeekKey(businessDate);
    const week = getWeekNumber(businessDate);

    addMetric(yearlyMap, yearKey, { total: 0, unidades: 0, filas: 0 }, total, unidades);

    if (!weeklyMap.has(weekKey)) {
      weeklyMap.set(weekKey, { total: 0, unidades: 0, filas: 0, year: businessDate.getFullYear(), week });
    }

    const weekly = weeklyMap.get(weekKey)!;
    weekly.total += total;
    weekly.unidades += unidades;
    weekly.filas += 1;
  }

  for (const row of paymentRows) {
    const importe = Number(row.importe ?? 0);
    const operaciones = Number(row.numeroOperaciones ?? 0);
    const businessDate = parseBusinessDate(row.fecha ?? row.uploadedAt);
    const dateKey = toDateKey(businessDate);
    const weekStart = getMonday(businessDate);
    const weekdayIndex = getWeekdayIndex(businessDate);
    const heatKey = `${toDateKey(weekStart)}-${weekdayIndex}`;
    const methodKey = row.formaPago.trim() || "Sin forma de pago";
    const importKey = row.importId || dateKey;

    if (!paymentDailyMap.has(dateKey)) {
      paymentDailyMap.set(dateKey, { importe: 0, operaciones: 0, filas: 0 });
    }

    const paymentDaily = paymentDailyMap.get(dateKey)!;
    paymentDaily.importe += importe;
    paymentDaily.operaciones += operaciones;
    paymentDaily.filas += 1;

    if (!paymentMethodMap.has(methodKey)) {
      paymentMethodMap.set(methodKey, {
        formaPago: methodKey,
        importe: 0,
        operaciones: 0,
        filas: 0,
        digital: isDigitalPayment(methodKey),
      });
    }

    const method = paymentMethodMap.get(methodKey)!;
    method.importe += importe;
    method.operaciones += operaciones;
    method.filas += 1;

    if (!paymentChannelDailyMap.has(dateKey)) {
      paymentChannelDailyMap.set(dateKey, {
        date: dateKey,
        label: formatShortDate(dateKey),
        values: new Map<string, number>(),
      });
    }

    const channelDaily = paymentChannelDailyMap.get(dateKey)!;
    channelDaily.values.set(methodKey, (channelDaily.values.get(methodKey) ?? 0) + importe);

    if (!operationsHeatmapMap.has(heatKey)) {
      operationsHeatmapMap.set(heatKey, {
        key: heatKey,
        label: dayLabels[weekdayIndex],
        value: 0,
        units: 0,
      });
    }

    const operationHeatCell = operationsHeatmapMap.get(heatKey)!;
    operationHeatCell.value += operaciones;
    operationHeatCell.units += importe;

    if (!importSummaryMap.has(importKey)) {
      importSummaryMap.set(importKey, {
        importId: importKey,
        fecha: row.fecha,
        salesRows: 0,
        paymentRows: 0,
        salesAmount: 0,
        paymentAmount: 0,
        operations: 0,
        units: 0,
        latestCreatedAt: row.uploadedAt,
      });
    }

    const importSummary = importSummaryMap.get(importKey)!;
    importSummary.paymentRows += 1;
    importSummary.paymentAmount += importe;
    importSummary.operations += operaciones;
    importSummary.latestCreatedAt = row.uploadedAt > (importSummary.latestCreatedAt ?? "") ? row.uploadedAt : importSummary.latestCreatedAt;
  }

  const totalSales = rows.reduce((sum, row) => sum + Number(row.total ?? 0), 0);
  const totalUnits = rows.reduce((sum, row) => sum + Number(row.unidades ?? 0), 0);
  const totalPaymentAmount = paymentRows.reduce((sum, row) => sum + Number(row.importe ?? 0), 0);
  const totalOperations = paymentRows.reduce((sum, row) => sum + Number(row.numeroOperaciones ?? 0), 0);
  const averageTicketUnit = totalUnits > 0 ? totalSales / totalUnits : 0;
  const averagePaymentTicket = totalOperations > 0 ? totalPaymentAmount / totalOperations : 0;
  const averageUnitsPerOperation = totalOperations > 0 ? totalUnits / totalOperations : 0;
  const averageSalesPerOperation = totalOperations > 0 ? totalSales / totalOperations : 0;
  const reconciliationDelta = totalSales - totalPaymentAmount;
  const digitalAmount = Array.from(paymentMethodMap.values())
    .filter((method) => method.digital)
    .reduce((sum, method) => sum + method.importe, 0);
  const digitalShare = totalPaymentAmount > 0 ? (digitalAmount / totalPaymentAmount) * 100 : 0;
  const cashShare = totalPaymentAmount > 0 ? 100 - digitalShare : 0;

  const products = Array.from(productMap.values()).sort((a, b) => b.total - a.total);
  const productChartData = products.reduce<{ cumulative: number; data: SubwayProductPoint[] }>(
    (accumulator, product) => {
      const cumulative = accumulator.cumulative + product.total;

      return {
        cumulative,
        data: [
          ...accumulator.data,
          {
            name: formatProductLabel(`${product.referencia} ${product.descripcion}`),
            referencia: product.referencia,
            categoria: product.categoria,
            total: product.total,
            unidades: product.unidades,
            filas: product.filas,
            ticketUnitario: product.unidades > 0 ? product.total / product.unidades : 0,
            share: totalSales > 0 ? (product.total / totalSales) * 100 : 0,
            acumulado: totalSales > 0 ? (cumulative / totalSales) * 100 : 0,
          },
        ],
      };
    },
    { cumulative: 0, data: [] },
  ).data;

  const categoryData: SubwayCategoryPoint[] = Array.from(categoryMap.values())
    .sort((a, b) => b.total - a.total)
    .map((category) => ({
      categoria: category.categoria,
      total: category.total,
      unidades: category.unidades,
      filas: category.filas,
      ticketUnitario: category.unidades > 0 ? category.total / category.unidades : 0,
      share: totalSales > 0 ? (category.total / totalSales) * 100 : 0,
    }));

  const dailyData: SubwayDailyPoint[] = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({
      date,
      label: formatShortDate(date),
      total: value.total,
      unidades: value.unidades,
      filas: value.filas,
      ticketUnitario: value.unidades > 0 ? value.total / value.unidades : 0,
    }));

  const paymentDailyData: SubwayPaymentDailyPoint[] = Array.from(new Set([...dailyMap.keys(), ...paymentDailyMap.keys()]))
    .sort((a, b) => a.localeCompare(b))
    .map((date) => {
      const sales = dailyMap.get(date) ?? { total: 0, unidades: 0, filas: 0 };
      const payment = paymentDailyMap.get(date) ?? { importe: 0, operaciones: 0, filas: 0 };

      return {
        date,
        label: formatShortDate(date),
        ventas: sales.total,
        importe: payment.importe,
        operaciones: payment.operaciones,
        diferencia: sales.total - payment.importe,
        ticketOperacion: payment.operaciones > 0 ? payment.importe / payment.operaciones : 0,
        unidadesPorOperacion: payment.operaciones > 0 ? sales.unidades / payment.operaciones : 0,
        ventasPorOperacion: payment.operaciones > 0 ? sales.total / payment.operaciones : 0,
      };
    });

  const paymentMethodData: SubwayPaymentMethodPoint[] = Array.from(paymentMethodMap.values())
    .sort((a, b) => b.importe - a.importe)
    .map((method) => ({
      formaPago: method.formaPago,
      importe: method.importe,
      operaciones: method.operaciones,
      ticketOperacion: method.operaciones > 0 ? method.importe / method.operaciones : 0,
      share: totalPaymentAmount > 0 ? (method.importe / totalPaymentAmount) * 100 : 0,
      digital: method.digital,
    }));

  const paymentChannelKeys = paymentMethodData.slice(0, 6).map((method) => method.formaPago);
  const paymentChannelDailyData: SubwayPaymentChannelPoint[] = Array.from(paymentChannelDailyMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((item) => {
      const point: SubwayPaymentChannelPoint = {
        date: item.date,
        label: item.label,
      };

      for (const channel of paymentChannelKeys) {
        point[channel] = item.values.get(channel) ?? 0;
      }

      return point;
    });

  const yearlyData: SubwayYearPoint[] = Array.from(yearlyMap.entries())
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([year, value]) => ({
      year,
      total: value.total,
      unidades: value.unidades,
      filas: value.filas,
      ticketUnitario: value.unidades > 0 ? value.total / value.unidades : 0,
    }));

  const currentYear = yearlyData.at(-1)?.year ?? String(new Date().getFullYear());
  const previousYear = String(Number(currentYear) - 1);
  const currentWeeks = Array.from(weeklyMap.values())
    .filter((item) => String(item.year) === currentYear)
    .sort((a, b) => a.week - b.week);
  const weeklyData: SubwayWeeklyPoint[] = currentWeeks.map((week) => {
    const previous = weeklyMap.get(`${previousYear}-S${String(week.week).padStart(2, "0")}`);

    return {
      week: String(week.week),
      label: `S${String(week.week).padStart(2, "0")}`,
      actual: week.total,
      anterior: previous?.total ?? 0,
      crecimiento: safeGrowth(week.total, previous?.total ?? 0),
    };
  });

  const weekdayData: SubwayWeekdayPoint[] = dayLabels.map((day, index) => {
    const value = weekdayMap.get(String(index)) ?? { total: 0, unidades: 0, filas: 0 };

    return {
      day,
      total: value.total,
      unidades: value.unidades,
      filas: value.filas,
      ticketUnitario: value.unidades > 0 ? value.total / value.unidades : 0,
    };
  });

  const heatWeeks = Array.from(new Set(Array.from(salesHeatmapMap.keys()).map((key) => key.slice(0, 10))))
    .sort()
    .slice(-10);
  const heatMax = Math.max(...Array.from(salesHeatmapMap.values()).map((cell) => cell.value), 0);
  const salesHeatCells: SubwayCalendarCell[] = Array.from(salesHeatmapMap.entries()).map(([key, value]) => ({
    weekStart: key.slice(0, 10),
    weekday: Number(key.slice(-1)),
    label: value.label,
    value: value.value,
    units: value.units,
  }));
  const operationHeatWeeks = Array.from(new Set(Array.from(operationsHeatmapMap.keys()).map((key) => key.slice(0, 10))))
    .sort()
    .slice(-10);
  const operationHeatMax = Math.max(...Array.from(operationsHeatmapMap.values()).map((cell) => cell.value), 0);
  const operationHeatCells: SubwayCalendarCell[] = Array.from(operationsHeatmapMap.entries()).map(([key, value]) => ({
    weekStart: key.slice(0, 10),
    weekday: Number(key.slice(-1)),
    label: value.label,
    value: value.value,
    units: value.units,
  }));

  const latestSalesRow = rows.length
    ? [...rows].sort(
        (a, b) =>
          parseBusinessDate(b.fecha ?? b.uploadedAt).getTime() -
          parseBusinessDate(a.fecha ?? a.uploadedAt).getTime(),
      )[0]
    : null;
  const latestPaymentRow = paymentRows.length
    ? [...paymentRows].sort(
        (a, b) =>
          parseBusinessDate(b.fecha ?? b.uploadedAt).getTime() -
          parseBusinessDate(a.fecha ?? a.uploadedAt).getTime(),
      )[0]
    : null;
  const bestDay = dailyData.length ? [...dailyData].sort((a, b) => b.total - a.total)[0] : null;
  const bestWeek = Array.from(weeklyMap.values()).sort((a, b) => b.total - a.total)[0] ?? null;
  const bestWeekday = weekdayData.length ? [...weekdayData].sort((a, b) => b.total - a.total)[0] : null;
  const latestYear = yearlyData.at(-1);
  const previousYearData = yearlyData.at(-2);
  const yoyGrowth = latestYear && previousYearData ? safeGrowth(latestYear.total, previousYearData.total) : null;
  const top3Share = totalSales > 0 ? productChartData.slice(0, 3).reduce((sum, item) => sum + item.total, 0) / totalSales * 100 : 0;
  const top10Share = totalSales > 0 ? productChartData.slice(0, 10).reduce((sum, item) => sum + item.total, 0) / totalSales * 100 : 0;

  const stats: SubwaySummaryStats = {
    totalSales,
    totalUnits,
    totalPaymentAmount,
    totalOperations,
    averageTicketUnit,
    averagePaymentTicket,
    averageUnitsPerOperation,
    averageSalesPerOperation,
    reconciliationDelta,
    digitalShare,
    cashShare,
    productCount: productChartData.length,
    importCount: new Set(rows.map((row) => row.importId || row.fecha || "")).size,
    paymentImportCount: new Set(paymentRows.map((row) => row.importId || row.fecha || "")).size,
    top3Share,
    top10Share,
  };

  const coverage: SubwayCoveragePoint[] = paymentDailyData.map((row) => ({
    date: row.date,
    label: row.label,
    ventas: row.ventas,
    importe: row.importe,
    tieneVentas: row.ventas > 0,
    tienePagos: row.importe > 0 || row.operaciones > 0,
    operaciones: row.operaciones,
  }));

  const importSummaries: SubwayImportSummary[] = Array.from(importSummaryMap.values())
    .sort((a, b) => {
      const left = a.fecha ?? a.latestCreatedAt ?? "";
      const right = b.fecha ?? b.latestCreatedAt ?? "";
      return right.localeCompare(left);
    })
    .map((item) => ({
      ...item,
      delta: item.salesAmount - item.paymentAmount,
    }));

  const outliers: SubwayAuditOutlier[] = [
    ...rows
      .filter((row) => Number(row.total ?? 0) > 0)
      .sort((a, b) => Number(b.total ?? 0) - Number(a.total ?? 0))
      .slice(0, 5)
      .map((row) => ({
        type: "venta" as const,
        importId: row.importId,
        fecha: row.fecha,
        label: formatProductLabel(`${row.referencia} ${row.descripcion}`),
        metric: Number(row.total ?? 0),
        secondary: Number(row.unidades ?? 0),
      })),
    ...rows
      .filter((row) => Number(row.unidades ?? 0) > 0)
      .sort((a, b) => Number(b.unidades ?? 0) - Number(a.unidades ?? 0))
      .slice(0, 5)
      .map((row) => ({
        type: "unidades" as const,
        importId: row.importId,
        fecha: row.fecha,
        label: formatProductLabel(`${row.referencia} ${row.descripcion}`),
        metric: Number(row.unidades ?? 0),
        secondary: Number(row.total ?? 0),
      })),
    ...paymentRows
      .filter((row) => Number(row.importe ?? 0) > 0)
      .sort((a, b) => Number(b.importe ?? 0) - Number(a.importe ?? 0))
      .slice(0, 5)
      .map((row) => ({
        type: "importe" as const,
        importId: row.importId,
        fecha: row.fecha,
        label: row.formaPago,
        metric: Number(row.importe ?? 0),
        secondary: Number(row.numeroOperaciones ?? 0),
      })),
  ];

  const categoryWeekdayMatrix: SubwayCategoryWeekdayPoint[] = Array.from(categoryWeekdayAggMap.values())
    .sort((a, b) => a.weekday - b.weekday || b.total - a.total)
    .map((item) => ({
      categoria: item.categoria,
      weekday: item.weekday,
      dayLabel: item.dayLabel,
      total: item.total,
      shareWithinDay: (dayCategoryTotals.get(item.weekday) ?? 0) > 0
        ? (item.total / (dayCategoryTotals.get(item.weekday) ?? 1)) * 100
        : 0,
    }));

  const topHighTrafficDays = [...paymentDailyData]
    .filter((day) => day.operaciones > 0)
    .sort((a, b) => b.operaciones - a.operaciones)
    .slice(0, 8);
  const topEfficientDays = [...paymentDailyData]
    .filter((day) => day.operaciones > 0)
    .sort((a, b) => b.ventasPorOperacion - a.ventasPorOperacion)
    .slice(0, 8);

  const salesInsights = [
    createInsight(
      categoryData[0]
        ? `${categoryData[0].categoria} lidera el mix con ${categoryData[0].share.toFixed(1)}% de la venta visible.`
        : "",
    ),
    createInsight(
      productChartData[0]
        ? `${productChartData[0].name} es el producto estrella por facturacion.`
        : "",
    ),
    createInsight(
      top10Share
        ? `El top 10 concentra ${top10Share.toFixed(1)}% de ingresos; monitorea dependencia del surtido corto.`
        : "",
    ),
    createInsight(
      bestWeekday
        ? `${bestWeekday.day} es el dia mas fuerte del periodo filtrado.`
        : "",
    ),
  ];

  const paymentInsights = [
    createInsight(
      paymentMethodData[0]
        ? `${paymentMethodData[0].formaPago} domina ${paymentMethodData[0].share.toFixed(1)}% del importe.`
        : "",
    ),
    createInsight(
      totalPaymentAmount > 0
        ? `La participacion digital llega a ${digitalShare.toFixed(1)}% y efectivo a ${cashShare.toFixed(1)}%.`
        : "",
    ),
    createInsight(
      topHighTrafficDays[0]
        ? `${topHighTrafficDays[0].label} registra el mayor trafico con ${topHighTrafficDays[0].operaciones.toFixed(0)} operaciones.`
        : "",
    ),
    createInsight(
      Math.abs(reconciliationDelta) > 0
        ? `El cuadre del periodo marca una diferencia acumulada de ${reconciliationDelta.toFixed(2)} PEN.`
        : "No hay diferencia acumulada entre productos y pagos en el periodo filtrado.",
    ),
  ];

  const proxyInsights = [
    createInsight(
      averageUnitsPerOperation > 0
        ? `El proxy de upselling actual es ${averageUnitsPerOperation.toFixed(2)} unidades por operacion.`
        : "",
    ),
    createInsight(
      topEfficientDays[0]
        ? `${topEfficientDays[0].label} lidera en venta por operacion con ${topEfficientDays[0].ventasPorOperacion.toFixed(2)} PEN.`
        : "",
    ),
    createInsight(
      topHighTrafficDays[0]
        ? `${topHighTrafficDays[0].label} combina ${topHighTrafficDays[0].operaciones.toFixed(0)} operaciones con ticket de ${topHighTrafficDays[0].ticketOperacion.toFixed(2)} PEN.`
        : "",
    ),
    "Estos ratios son aproximaciones por fecha; no representan una medicion real de carrito por ticket.",
  ];

  return {
    executive: {
      activePeriodLabel,
      filters,
      availableYears,
      stats,
      latestSalesDate: latestSalesRow?.fecha ?? latestSalesRow?.uploadedAt ?? null,
      latestPaymentDate: latestPaymentRow?.fecha ?? latestPaymentRow?.uploadedAt ?? null,
      bestDayLabel: bestDay?.label ?? "Sin datos",
      bestWeekLabel: bestWeek ? `S${String(bestWeek.week).padStart(2, "0")}` : "Sin datos",
      bestWeekdayLabel: bestWeekday?.day ?? "Sin datos",
      strongestPaymentMethod: paymentMethodData[0]?.formaPago ?? "Sin datos",
      strongestCategory: categoryData[0]?.categoria ?? "Sin datos",
      yoyGrowth,
    },
    salesMix: {
      stats,
      daily: dailyData,
      weekly: weeklyData,
      yearly: yearlyData,
      weekdays: weekdayData,
      products: productChartData,
      categories: categoryData,
      heatWeeks,
      heatMax,
      heatCells: salesHeatCells,
      insights: salesInsights,
      heroProduct: productChartData[0] ?? null,
    },
    payments: {
      stats,
      paymentDaily: paymentDailyData,
      paymentMethods: paymentMethodData,
      paymentChannelDaily: paymentChannelDailyData,
      paymentChannelKeys,
      operationHeatWeeks,
      operationHeatMax,
      operationHeatCells,
      insights: paymentInsights,
    },
    audit: {
      importSummaries,
      coverage,
      outliers,
      missingPaymentDates: coverage.filter((item) => item.tieneVentas && !item.tienePagos).length,
      missingSalesDates: coverage.filter((item) => !item.tieneVentas && item.tienePagos).length,
      latestImportDate: importSummaries[0]?.latestCreatedAt ?? null,
    },
    cross: {
      paymentDaily: paymentDailyData,
      categoryWeekdayMatrix,
      topHighTrafficDays,
      topEfficientDays,
      proxyInsights,
    },
  };
}

export { buildSubwayFilterHref };

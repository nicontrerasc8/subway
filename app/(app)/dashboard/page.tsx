import {
  Activity,
  BadgeDollarSign,
  CalendarDays,
  CreditCard,
  Flame,
  Gauge,
  Package,
  ShoppingBag,
  Sigma,
  Target,
  TrendingUp,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableElement,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDateOnly, formatNumber } from "@/lib/utils";
import {
  SubwayBiCharts,
  type SubwayCategoryPoint,
  type SubwayDailyPoint,
  type SubwayPaymentChannelPoint,
  type SubwayPaymentDailyPoint,
  type SubwayPaymentMethodPoint,
  type SubwayProductPoint,
  type SubwayWeekdayPoint,
  type SubwayWeeklyPoint,
  type SubwayYearPoint,
} from "@/modules/dashboard/components/subway-bi-charts";
import { getSubwaySalesSummary } from "@/modules/dashboard/services/subway-sales";

type ProductAgg = {
  referencia: string;
  descripcion: string;
  unidades: number;
  total: number;
  rows: number;
};

type PaymentMethodAgg = {
  formaPago: string;
  importe: number;
  operaciones: number;
  rows: number;
};

type PaymentChannelDailyAgg = {
  date: string;
  label: string;
  values: Map<string, number>;
};

type CalendarCell = {
  key: string;
  label: string;
  value: number;
  units: number;
};

const dayLabels = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
const fullDayLabels = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];
const monthLabels = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const monthValues = monthLabels.map((_, index) => String(index + 1));
const weekdayValues = dayLabels.map((_, index) => String(index));

type DashboardPageProps = {
  searchParams: Promise<{
    year?: string | string[];
    month?: string | string[];
    weekday?: string | string[];
  }>;
};

function parseBusinessDate(value: string) {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  return new Date(value);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatShortDate(dateKey: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
  }).format(parseBusinessDate(dateKey));
}

function getMonday(date: Date) {
  const nextDate = new Date(date);
  const day = (nextDate.getDay() + 6) % 7;
  nextDate.setDate(nextDate.getDate() - day);
  nextDate.setHours(0, 0, 0, 0);

  return nextDate;
}

function getWeekNumber(date: Date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));

  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getWeekKey(date: Date) {
  return `${date.getFullYear()}-S${String(getWeekNumber(date)).padStart(2, "0")}`;
}

function getWeekdayIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}

function safeGrowth(current: number, previous: number) {
  if (!previous) return null;

  return ((current - previous) / previous) * 100;
}

function addMetric<T extends { total: number; unidades: number; filas: number }>(
  map: Map<string, T>,
  key: string,
  fallback: T,
  total: number,
  unidades: number,
) {
  if (!map.has(key)) map.set(key, fallback);

  const current = map.get(key)!;
  current.total += total;
  current.unidades += unidades;
  current.filas += 1;
}

function getProductCategory(description: string) {
  const normalized = description
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();

  if (normalized.includes("COMBO")) return "COMBO";
  if (normalized.includes("BEBIDA") || normalized.includes("GASEOSA") || normalized.includes("AGUA")) return "BEBIDA";
  if (normalized.includes("EXTRA") || normalized.includes("ADICIONAL")) return "EXTRA";
  if (normalized.includes("SUB")) return "SUB";

  return "OTROS";
}

function formatProductLabel(value: string) {
  return value.replace(/\s+-\s+/g, " ");
}

function getRowYear(value: { fecha: string | null; uploadedAt: string }) {
  return String(parseBusinessDate(value.fecha ?? value.uploadedAt).getFullYear());
}

function getRowMonth(value: { fecha: string | null; uploadedAt: string }) {
  return String(parseBusinessDate(value.fecha ?? value.uploadedAt).getMonth() + 1);
}

function getRowWeekday(value: { fecha: string | null; uploadedAt: string }) {
  return String(getWeekdayIndex(parseBusinessDate(value.fecha ?? value.uploadedAt)));
}

function getSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getValidFilterValue(value: string | undefined, validValues: string[]) {
  if (!value || value === "all") return null;
  return validValues.includes(value) ? value : null;
}

function buildFilterHref(filters: {
  year: string | null;
  month: string | null;
  weekday: string | null;
}) {
  const params = new URLSearchParams();

  if (filters.year) params.set("year", filters.year);
  if (filters.month) params.set("month", filters.month);
  if (filters.weekday) params.set("weekday", filters.weekday);

  const query = params.toString();
  return query ? `/dashboard?${query}` : "/dashboard";
}

function buildYearHref(year: string | null) {
  return buildFilterHref({ year, month: null, weekday: null });
}

function matchesDateFilters(
  value: { fecha: string | null; uploadedAt: string },
  filters: {
    year?: string | null;
    month?: string | null;
    weekday?: string | null;
  },
) {
  if (filters.year && getRowYear(value) !== filters.year) return false;
  if (filters.month && getRowMonth(value) !== filters.month) return false;
  if (filters.weekday && getRowWeekday(value) !== filters.weekday) return false;

  return true;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = await searchParams;
  const summary = await getSubwaySalesSummary();
  const allRows = summary.rows ?? [];
  const allPaymentRows = summary.paymentRows ?? [];
  const requestedYear = getSearchParamValue(resolvedSearchParams.year);
  const requestedMonth = getSearchParamValue(resolvedSearchParams.month);
  const requestedWeekday = getSearchParamValue(resolvedSearchParams.weekday);
  const availableYears = Array.from(
    new Set([...allRows.map(getRowYear), ...allPaymentRows.map(getRowYear)]),
  ).sort((a, b) => Number(b) - Number(a));
  const selectedYear = getValidFilterValue(requestedYear, availableYears);
  const selectedMonth = getValidFilterValue(requestedMonth, monthValues);
  const selectedWeekday = getValidFilterValue(requestedWeekday, weekdayValues);
  const previousSelectedYear = selectedYear ? String(Number(selectedYear) - 1) : null;
  const comparisonYears = selectedYear ? new Set([selectedYear, previousSelectedYear]) : null;
  const activeFilters = {
    year: selectedYear,
    month: selectedMonth,
    weekday: selectedWeekday,
  };
  const rows = allRows.filter((row) => matchesDateFilters(row, activeFilters));
  const paymentRows = allPaymentRows.filter((row) => matchesDateFilters(row, activeFilters));
  const comparisonRows = comparisonYears
    ? allRows.filter(
        (row) =>
          comparisonYears.has(getRowYear(row)) &&
          matchesDateFilters(row, { month: selectedMonth, weekday: selectedWeekday }),
      )
    : allRows.filter((row) => matchesDateFilters(row, { month: selectedMonth, weekday: selectedWeekday }));

  const productMap = new Map<string, ProductAgg>();
  const paymentDailyMap = new Map<string, { importe: number; operaciones: number; filas: number }>();
  const paymentMethodMap = new Map<string, PaymentMethodAgg>();
  const paymentChannelDailyMap = new Map<string, PaymentChannelDailyAgg>();
  const categoryMap = new Map<string, { categoria: string; total: number; unidades: number; filas: number }>();
  const dailyMap = new Map<string, { total: number; unidades: number; filas: number }>();
  const weeklyMap = new Map<string, { total: number; unidades: number; filas: number; year: number; week: number }>();
  const yearlyMap = new Map<string, { total: number; unidades: number; filas: number }>();
  const weekdayMap = new Map<string, { total: number; unidades: number; filas: number }>();
  const heatmapMap = new Map<string, CalendarCell>();

  for (const row of rows) {
    const total = Number(row.total ?? 0);
    const unidades = Number(row.unidades ?? 0);
    const businessDate = parseBusinessDate(row.fecha ?? row.uploadedAt);
    const dateKey = toDateKey(businessDate);
    const weekStart = getMonday(businessDate);
    const weekdayIndex = getWeekdayIndex(businessDate);
    const heatKey = `${toDateKey(weekStart)}-${weekdayIndex}`;
    const productKey = `${row.referencia}__${row.descripcion}`;
    const categoryKey = getProductCategory(row.descripcion);

    if (!productMap.has(productKey)) {
      productMap.set(productKey, {
        referencia: row.referencia,
        descripcion: row.descripcion,
        unidades: 0,
        total: 0,
        rows: 0,
      });
    }

    const product = productMap.get(productKey)!;
    product.unidades += unidades;
    product.total += total;
    product.rows += 1;

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

    if (!heatmapMap.has(heatKey)) {
      heatmapMap.set(heatKey, {
        key: heatKey,
        label: dayLabels[weekdayIndex],
        value: 0,
        units: 0,
      });
    }
    const heatCell = heatmapMap.get(heatKey)!;
    heatCell.value += total;
    heatCell.units += unidades;
  }

  for (const row of comparisonRows) {
    const total = Number(row.total ?? 0);
    const unidades = Number(row.unidades ?? 0);
    const businessDate = parseBusinessDate(row.fecha ?? row.uploadedAt);
    const yearKey = String(businessDate.getFullYear());
    const week = getWeekNumber(businessDate);
    const weekKey = getWeekKey(businessDate);

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
    const methodKey = row.formaPago.trim() || "Sin forma de pago";

    if (!paymentDailyMap.has(dateKey)) {
      paymentDailyMap.set(dateKey, { importe: 0, operaciones: 0, filas: 0 });
    }

    const dailyPayment = paymentDailyMap.get(dateKey)!;
    dailyPayment.importe += importe;
    dailyPayment.operaciones += operaciones;
    dailyPayment.filas += 1;

    if (!paymentMethodMap.has(methodKey)) {
      paymentMethodMap.set(methodKey, {
        formaPago: methodKey,
        importe: 0,
        operaciones: 0,
        rows: 0,
      });
    }

    const method = paymentMethodMap.get(methodKey)!;
    method.importe += importe;
    method.operaciones += operaciones;
    method.rows += 1;

    if (!paymentChannelDailyMap.has(dateKey)) {
      paymentChannelDailyMap.set(dateKey, {
        date: dateKey,
        label: formatShortDate(dateKey),
        values: new Map<string, number>(),
      });
    }

    const channelDaily = paymentChannelDailyMap.get(dateKey)!;
    channelDaily.values.set(methodKey, (channelDaily.values.get(methodKey) ?? 0) + importe);
  }

  const totalSales = rows.reduce((sum, row) => sum + Number(row.total ?? 0), 0);
  const totalUnits = rows.reduce((sum, row) => sum + Number(row.unidades ?? 0), 0);
  const totalPaymentAmount = paymentRows.reduce((sum, row) => sum + Number(row.importe ?? 0), 0);
  const totalOperations = paymentRows.reduce((sum, row) => sum + Number(row.numeroOperaciones ?? 0), 0);
  const averageTicket = totalUnits > 0 ? totalSales / totalUnits : 0;
  const averageUnitsPerRow = rows.length > 0 ? totalUnits / rows.length : 0;
  const averagePaymentTicket = totalOperations > 0 ? totalPaymentAmount / totalOperations : 0;
  const reconciliationDelta = totalSales - totalPaymentAmount;
  const uniqueProducts = productMap.size;
  const uniqueFiles = new Set(rows.map((row) => row.importId || row.fecha || "")).size;

  const products = Array.from(productMap.values()).sort((a, b) => b.total - a.total);
  const productChartData = products.reduce<{
    cumulative: number;
    data: SubwayProductPoint[];
  }>(
    (accumulator, product) => {
      const cumulative = accumulator.cumulative + product.total;

      return {
        cumulative,
        data: [
          ...accumulator.data,
          {
            name: `${product.referencia} ${product.descripcion}`,
            referencia: product.referencia,
            total: product.total,
            unidades: product.unidades,
            filas: product.rows,
            ticket: product.unidades > 0 ? product.total / product.unidades : 0,
            share: totalSales > 0 ? (product.total / totalSales) * 100 : 0,
            acumulado: totalSales > 0 ? (cumulative / totalSales) * 100 : 0,
          },
        ],
      };
    },
    { cumulative: 0, data: [] },
  ).data;

  const dailyData: SubwayDailyPoint[] = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({
      date,
      label: formatShortDate(date),
      total: value.total,
      unidades: value.unidades,
      filas: value.filas,
      ticket: value.unidades > 0 ? value.total / value.unidades : 0,
    }));

  const paymentDailyData: SubwayPaymentDailyPoint[] = Array.from(
    new Set([...dailyMap.keys(), ...paymentDailyMap.keys()]),
  )
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
    }));

  const productCategoryData: SubwayCategoryPoint[] = Array.from(categoryMap.values())
    .sort((a, b) => b.total - a.total)
    .map((category) => ({
      categoria: category.categoria,
      total: category.total,
      unidades: category.unidades,
      filas: category.filas,
      ticket: category.unidades > 0 ? category.total / category.unidades : 0,
      share: totalSales > 0 ? (category.total / totalSales) * 100 : 0,
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
      ticket: value.unidades > 0 ? value.total / value.unidades : 0,
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
      ticket: value.unidades > 0 ? value.total / value.unidades : 0,
    };
  });

  const latestSalesRow =
    rows.length > 0
      ? [...rows].sort(
          (a, b) =>
            parseBusinessDate(b.fecha ?? b.uploadedAt).getTime() -
            parseBusinessDate(a.fecha ?? a.uploadedAt).getTime(),
        )[0]
      : null;
  const latestPaymentRow =
    paymentRows.length > 0
      ? [...paymentRows].sort(
          (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
        )[0]
      : null;

  const highestRow =
    rows.length > 0
      ? [...rows].sort((a, b) => Number(b.total ?? 0) - Number(a.total ?? 0))[0]
      : null;

  const bestDay = dailyData.length ? [...dailyData].sort((a, b) => b.total - a.total)[0] : null;
  const bestWeek = Array.from(weeklyMap.values()).sort((a, b) => b.total - a.total)[0] ?? null;
  const bestWeekday = weekdayData.length ? [...weekdayData].sort((a, b) => b.total - a.total)[0] : null;
  const avgDailySales = dailyData.length > 0 ? totalSales / dailyData.length : 0;
  const top3Share = totalSales > 0 ? productChartData.slice(0, 3).reduce((sum, item) => sum + item.total, 0) / totalSales * 100 : 0;
  const latestYear = yearlyData.at(-1);
  const previousYearData = yearlyData.at(-2);
  const yoyGrowth = latestYear && previousYearData ? safeGrowth(latestYear.total, previousYearData.total) : null;

  const heatWeeks = Array.from(
    new Set(Array.from(heatmapMap.keys()).map((key) => key.slice(0, 10))),
  )
    .sort()
    .slice(-10);
  const heatMax = Math.max(...Array.from(heatmapMap.values()).map((cell) => cell.value), 0);
  const activeFilterParts = [
    selectedYear ? `Año ${selectedYear}` : "Todos los años",
    selectedMonth ? monthLabels[Number(selectedMonth) - 1] : "Todos los meses",
    selectedWeekday ? fullDayLabels[Number(selectedWeekday)] : "Todos los dias",
  ];
  const activePeriodLabel = activeFilterParts.join(" · ");

  const kpis = [
    {
      title: "Ventas totales",
      value: formatCurrency(totalSales),
      helper: "Suma de sales_product",
      icon: Sigma,
    },
    {
      title: "Unidades totales",
      value: formatNumber(totalUnits),
      helper: "Volumen total importado",
      icon: ShoppingBag,
    },
    {
      title: "Productos unicos",
      value: formatNumber(uniqueProducts),
      helper: "Referencias distintas encontradas",
      icon: Package,
    },
    {
      title: "Lotes de ventas",
      value: formatNumber(uniqueFiles),
      helper: "Import_id distintos en sales_product",
      icon: UploadCloud,
    },
    {
      title: "Ticket promedio por unidad",
      value: formatCurrency(averageTicket),
      helper: "Ventas divididas entre unidades",
      icon: BadgeDollarSign,
    },
    {
      title: "Venta diaria promedio",
      value: formatCurrency(avgDailySales),
      helper: `${formatNumber(dailyData.length)} dias con actividad`,
      icon: CalendarDays,
    },
    {
      title: "Crecimiento anual",
      value: yoyGrowth === null ? "Sin base" : `${yoyGrowth.toFixed(1)}%`,
      helper: previousYearData ? `${previousYearData.year} vs ${latestYear?.year}` : "Requiere dos años",
      icon: TrendingUp,
    },
    {
      title: "Concentracion Top 3",
      value: `${top3Share.toFixed(1)}%`,
      helper: "Participacion de los 3 productos lideres",
      icon: Target,
    },
    {
      title: "Importe forma pedido",
      value: formatCurrency(totalPaymentAmount),
      helper: "Suma de sales_payment",
      icon: CreditCard,
    },
    {
      title: "Operaciones",
      value: formatNumber(totalOperations),
      helper: "Numero de operaciones cargadas",
      icon: Gauge,
    },
    {
      title: "Ticket por operacion",
      value: formatCurrency(averagePaymentTicket),
      helper: "Importe dividido entre operaciones",
      icon: BadgeDollarSign,
    },
    {
      title: "Diferencia de cuadre",
      value: formatCurrency(reconciliationDelta),
      helper: "Cuadre por fecha: productos menos pagos",
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-lg border bg-[#f7fbf8]">
        <div className="grid gap-6 p-6 xl:grid-cols-[1fr_360px] xl:p-8">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Subway BI</p>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Inteligencia de ventas importadas
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                Lectura ejecutiva para {activePeriodLabel}: dias, semanas, productos, canales y cuadre.
              </p>
            </div>
            <div className="hidden">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Periodo</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {selectedYear ? `Filtrando el año ${selectedYear}` : "Mostrando toda la data cargada"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={buildYearHref(null)}
                  className={[
                    "rounded-lg border px-3 py-2 text-sm font-medium transition",
                    selectedYear === null
                      ? "border-[#008938] bg-[#008938] text-white"
                      : "border-border bg-background text-foreground hover:border-[#008938]/60",
                  ].join(" ")}
                >
                  Todos
                </Link>
                {availableYears.map((year) => (
                  <Link
                    key={year}
                    href={buildYearHref(year)}
                    className={[
                      "rounded-lg border px-3 py-2 text-sm font-medium transition",
                      selectedYear === year
                        ? "border-[#008938] bg-[#008938] text-white"
                        : "border-border bg-background text-foreground hover:border-[#008938]/60",
                    ].join(" ")}
                  >
                    {year}
                  </Link>
                ))}
              </div>
            </div>
            <div className="space-y-4 rounded-lg border bg-background/80 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Filtros</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{activePeriodLabel}</p>
                </div>
                <Link
                  href="/dashboard"
                  className="w-fit rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:border-[#008938]/60"
                >
                  Limpiar filtros
                </Link>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Años</p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={buildFilterHref({ year: null, month: selectedMonth, weekday: selectedWeekday })}
                    className={[
                      "rounded-lg border px-3 py-2 text-sm font-medium transition",
                      selectedYear === null
                        ? "border-[#008938] bg-[#008938] text-white"
                        : "border-border bg-background text-foreground hover:border-[#008938]/60",
                    ].join(" ")}
                  >
                    Todos
                  </Link>
                  {availableYears.map((year) => (
                    <Link
                      key={year}
                      href={buildFilterHref({ year, month: selectedMonth, weekday: selectedWeekday })}
                      className={[
                        "rounded-lg border px-3 py-2 text-sm font-medium transition",
                        selectedYear === year
                          ? "border-[#008938] bg-[#008938] text-white"
                          : "border-border bg-background text-foreground hover:border-[#008938]/60",
                      ].join(" ")}
                    >
                      {year}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Meses</p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={buildFilterHref({ year: selectedYear, month: null, weekday: selectedWeekday })}
                    className={[
                      "rounded-lg border px-3 py-2 text-sm font-medium transition",
                      selectedMonth === null
                        ? "border-[#008938] bg-[#008938] text-white"
                        : "border-border bg-background text-foreground hover:border-[#008938]/60",
                    ].join(" ")}
                  >
                    Todos
                  </Link>
                  {monthLabels.map((month, index) => {
                    const monthValue = String(index + 1);

                    return (
                      <Link
                        key={month}
                        href={buildFilterHref({ year: selectedYear, month: monthValue, weekday: selectedWeekday })}
                        className={[
                          "rounded-lg border px-3 py-2 text-sm font-medium transition",
                          selectedMonth === monthValue
                            ? "border-[#008938] bg-[#008938] text-white"
                            : "border-border bg-background text-foreground hover:border-[#008938]/60",
                        ].join(" ")}
                      >
                        {month.slice(0, 3)}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Dias de semana</p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={buildFilterHref({ year: selectedYear, month: selectedMonth, weekday: null })}
                    className={[
                      "rounded-lg border px-3 py-2 text-sm font-medium transition",
                      selectedWeekday === null
                        ? "border-[#008938] bg-[#008938] text-white"
                        : "border-border bg-background text-foreground hover:border-[#008938]/60",
                    ].join(" ")}
                  >
                    Todos
                  </Link>
                  {dayLabels.map((day, index) => {
                    const weekdayValue = String(index);

                    return (
                      <Link
                        key={day}
                        href={buildFilterHref({ year: selectedYear, month: selectedMonth, weekday: weekdayValue })}
                        className={[
                          "rounded-lg border px-3 py-2 text-sm font-medium transition",
                          selectedWeekday === weekdayValue
                            ? "border-[#008938] bg-[#008938] text-white"
                            : "border-border bg-background text-foreground hover:border-[#008938]/60",
                        ].join(" ")}
                      >
                        {day}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-background p-4">
                <p className="text-xs uppercase text-muted-foreground">Dia estrella</p>
                <p className="mt-2 text-xl font-semibold">{bestDay?.label ?? "Sin datos"}</p>
                <p className="text-sm text-muted-foreground">{bestDay ? formatCurrency(bestDay.total) : "Sin venta"}</p>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <p className="text-xs uppercase text-muted-foreground">Semana pico</p>
                <p className="mt-2 text-xl font-semibold">{bestWeek ? `S${String(bestWeek.week).padStart(2, "0")}` : "Sin datos"}</p>
                <p className="text-sm text-muted-foreground">{bestWeek ? formatCurrency(bestWeek.total) : "Sin venta"}</p>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <p className="text-xs uppercase text-muted-foreground">Dia fuerte</p>
                <p className="mt-2 text-xl font-semibold">{bestWeekday?.day ?? "Sin datos"}</p>
                <p className="text-sm text-muted-foreground">{bestWeekday ? formatCurrency(bestWeekday.total) : "Sin venta"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-background p-5">
            <p className="text-sm text-muted-foreground">Fuente BI activa</p>
            <p className="mt-2 text-lg font-semibold">sales_product + sales_payment</p>
            <p className="text-sm text-muted-foreground">
              {latestSalesRow
                ? `Ultima fecha de ventas: ${formatDateOnly(latestSalesRow.fecha ?? latestSalesRow.uploadedAt)}`
                : "Sin fecha"}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-[#008938] p-4 text-white">
                <Flame className="mb-3 size-5" />
                <p className="text-2xl font-semibold">{formatNumber(rows.length)}</p>
                <p className="text-xs text-white/80">filas sales_product</p>
              </div>
              <div className="rounded-lg bg-[#ffc20a] p-4 text-[#173b20]">
                <Gauge className="mb-3 size-5" />
                <p className="text-2xl font-semibold">{formatNumber(averageUnitsPerRow)}</p>
                <p className="text-xs text-[#173b20]/75">unid. por fila</p>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <CreditCard className="mb-3 size-5 text-[#008938]" />
                <p className="text-2xl font-semibold">{formatNumber(paymentRows.length)}</p>
                <p className="text-xs text-muted-foreground">filas sales_payment</p>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <Sigma className="mb-3 size-5 text-[#2563eb]" />
                <p className="text-2xl font-semibold">{formatCurrency(totalPaymentAmount)}</p>
                <p className="text-xs text-muted-foreground">importe de pagos</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Ultima fila de pagos: {latestPaymentRow ? formatDateOnly(latestPaymentRow.fecha ?? latestPaymentRow.uploadedAt) : "Sin data"}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ title, value, helper, icon: Icon }) => (
          <Card key={title} className="rounded-lg border">
            <CardContent className="flex items-start justify-between gap-4 p-5">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{title}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
                <p className="mt-2 text-xs text-muted-foreground">{helper}</p>
              </div>
              <div className="rounded-lg bg-[#008938] p-3 text-white shadow-sm">
                <Icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <SubwayBiCharts
        daily={dailyData}
        weekly={weeklyData}
        yearly={yearlyData}
        weekdays={weekdayData}
        products={productChartData}
        categories={productCategoryData}
        paymentDaily={paymentDailyData}
        paymentMethods={paymentMethodData}
        paymentChannelDaily={paymentChannelDailyData}
        paymentChannelKeys={paymentChannelKeys}
      />

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Mapa de calor semanal</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Intensidad de ventas por semana y dia de la semana.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))] gap-2 text-xs text-muted-foreground">
                <span>Semana</span>
                {dayLabels.map((day) => (
                  <span key={day} className="text-center">{day}</span>
                ))}
              </div>
              {heatWeeks.length ? (
                heatWeeks.map((weekStart) => (
                  <div key={weekStart} className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))] gap-2">
                    <div className="flex items-center text-xs text-muted-foreground">
                      {formatShortDate(weekStart)}
                    </div>
                    {dayLabels.map((day, index) => {
                      const cell = heatmapMap.get(`${weekStart}-${index}`);
                      const intensity = heatMax > 0 ? (cell?.value ?? 0) / heatMax : 0;

                      return (
                        <div
                          key={`${weekStart}-${day}`}
                          className="flex aspect-square min-h-10 items-center justify-center rounded-lg border text-[10px] font-medium"
                          style={{
                            backgroundColor: `rgba(0, 137, 56, ${0.08 + intensity * 0.72})`,
                            color: intensity > 0.48 ? "white" : "#173b20",
                          }}
                          title={`${day}: ${formatCurrency(cell?.value ?? 0)} · ${formatNumber(cell?.units ?? 0)} unidades`}
                        >
                          {cell?.value ? formatNumber(cell.value) : "-"}
                        </div>
                      );
                    })}
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No hay calendario para mostrar.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Diagnostico automatico</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Senales ejecutivas calculadas desde sales_product y sales_payment.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Activity className="size-4 text-[#008938]" />
                Ritmo comercial
              </div>
              <p className="mt-3 text-2xl font-semibold">{formatCurrency(avgDailySales)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                promedio por dia activo en {formatNumber(dailyData.length)} fechas.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Target className="size-4 text-[#ef4444]" />
                Riesgo de concentracion
              </div>
              <p className="mt-3 text-2xl font-semibold">{top3Share.toFixed(1)}%</p>
              <p className="mt-1 text-sm text-muted-foreground">
                del negocio depende del top 3 de productos.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CalendarDays className="size-4 text-[#2563eb]" />
                Mejor dia de semana
              </div>
              <p className="mt-3 text-2xl font-semibold">
                {bestWeekday ? fullDayLabels[dayLabels.indexOf(bestWeekday.day)] : "Sin datos"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {bestWeekday ? formatCurrency(bestWeekday.total) : "Sin venta registrada"} acumulado.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="size-4 text-[#ffc20a]" />
                Lectura anual
              </div>
              <p className="mt-3 text-2xl font-semibold">
                {yoyGrowth === null ? "Sin base" : `${yoyGrowth.toFixed(1)}%`}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {previousYearData ? `${previousYearData.year} comparado con ${latestYear?.year}.` : "Carga otro año para comparar."}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CreditCard className="size-4 text-[#008938]" />
                Forma de pago lider
              </div>
              <p className="mt-3 text-2xl font-semibold">
                {paymentMethodData[0]?.formaPago ?? "Sin datos"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {paymentMethodData[0] ? `${paymentMethodData[0].share.toFixed(1)}% del importe en sales_payment.` : "Sin datos en sales_payment."}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sigma className="size-4 text-[#ef4444]" />
                Cuadre ventas vs pedido
              </div>
              <p className="mt-3 text-2xl font-semibold">{formatCurrency(reconciliationDelta)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                diferencia entre venta comercial e importe por forma de pedido.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Forma de pago por importe</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Ranking basado solo en sales_payment.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {paymentMethodData.length ? (
                paymentMethodData.slice(0, 10).map((item, index) => (
                  <div key={`${item.formaPago}-${index}`} className="space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium">{item.formaPago}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatNumber(item.operaciones)} operaciones · ticket {formatCurrency(item.ticketOperacion)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(item.importe)}</p>
                        <p className="text-xs text-muted-foreground">{item.share.toFixed(1)}% del importe</p>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-[#2563eb]"
                        style={{ width: `${Math.min(item.share, 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Todavia no hay filas en sales_payment.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Cruce diario de cuadre</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Primeros 10 dias con ventas, importe y diferencia.
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="min-w-[720px]">
                <TableElement>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>Fecha</TableHeaderCell>
                      <TableHeaderCell className="text-right">Ventas</TableHeaderCell>
                      <TableHeaderCell className="text-right">Importe</TableHeaderCell>
                      <TableHeaderCell className="text-right">Operaciones</TableHeaderCell>
                      <TableHeaderCell className="text-right">Diferencia</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {paymentDailyData.length ? (
                      paymentDailyData.slice(0, 10).map((item) => (
                        <TableRow key={item.date}>
                          <TableCell>{formatDateOnly(item.date)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.ventas)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.importe)}</TableCell>
                          <TableCell className="text-right">{formatNumber(item.operaciones)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.diferencia)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                          Agrega filas en sales_payment para cuadrar por dia.
                        </td>
                      </tr>
                    )}
                  </TableBody>
                </TableElement>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-lg xl:col-span-2">
          <CardHeader>
            <CardTitle>Top productos por venta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {productChartData.slice(0, 10).length ? (
              productChartData.slice(0, 10).map((item, index) => (
                <div key={`${item.referencia}-${index}`} className="space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium">{formatProductLabel(item.name)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatNumber(item.unidades)} unidades · {formatNumber(item.filas)} filas
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(item.total)}</p>
                      <p className="text-xs text-muted-foreground">{item.share.toFixed(1)}% del total</p>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-[#008938]"
                      style={{ width: `${Math.min(item.share, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Todavia no hay productos procesados.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Dato destacado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Fila con mayor venta</p>
              {highestRow ? (
                <>
                  <p className="mt-2 font-medium">
                    {formatProductLabel(`${highestRow.referencia} ${highestRow.descripcion}`)}
                  </p>
                  <p className="mt-1 text-2xl font-semibold">{formatCurrency(highestRow.total)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatNumber(highestRow.unidades)} unidades · {highestRow.fileName}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Sin datos.</p>
              )}
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Producto lider por unidades</p>
              {productChartData[0] ? (
                <>
                  <p className="mt-2 font-medium">{formatProductLabel(productChartData[0].name)}</p>
                  <p className="mt-1 text-2xl font-semibold">{formatNumber(productChartData[0].unidades)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatCurrency(productChartData[0].total)} en venta
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Sin datos.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

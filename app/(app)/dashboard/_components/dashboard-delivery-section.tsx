"use client";

import { useMemo, useState } from "react";

import { DashboardBranchesMetricView } from "@/app/(app)/dashboard/_components/dashboard-overview-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { isOperationalDashboardDate } from "@/modules/dashboard/lib/data-periods";
import { normalizeText } from "@/modules/dashboard/lib/subway-product-category";
import type {
  DashboardPaymentMethodDailyPoint,
  DashboardPaymentsChartPoint,
  DashboardPaymentsData,
} from "@/modules/dashboard/services/dashboard-payments";

type DeliveryFilterMode = "month" | "week" | "day";
type DeliveryPlatformSummary = {
  amount: number;
  operations: number;
};
type DeliveryBranchScore = {
  year: string;
  branchId: number | null;
  branch: string;
  amount: number;
  operations: number;
  averageTicket: number;
  platforms: Record<string, DeliveryPlatformSummary>;
  amountSpark: number[];
  operationsSpark: number[];
};

const BRANCH_COLORS = ["#008c15", "#1565c0", "#7b1fa2", "#ff6d00", "#00838f", "#c62828", "#f9a825", "#5f7f52"];
const PLATFORM_COLORS: Record<string, string> = {
  Peya: "#c8475d",
  Rappi: "#d66f3f",
  Turbo: "#7b61a8",
  Didi: "#c9872d",
  Delivery: "#1565c0",
};

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function getYearMonth(value: string) {
  return value.slice(0, 7);
}

function getMonthDay(value: string) {
  return value.slice(5, 10);
}

function getDateYear(value: string) {
  return value.slice(0, 4);
}

function isOperationalYear(value: string) {
  return isOperationalDashboardDate(value);
}

function getDateMonth(value: string) {
  return String(Number(value.slice(5, 7)));
}

function getIsoWeekValue(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function getIsoWeekNumber(value: string) {
  return getIsoWeekValue(value).slice(6);
}

function getIsoWeeksInYear(year: number) {
  return Number(getIsoWeekNumber(`${year}-12-28`));
}

function getIsoWeekStartDate(year: number, week: number) {
  const date = new Date(Date.UTC(year, 0, 4));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1 + ((week - 1) * 7));
  return date;
}

function formatWeekDate(date: Date) {
  return new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short" }).format(date);
}

function buildWeekOptions(year: number) {
  return Array.from({ length: getIsoWeeksInYear(year) }, (_, index) => {
    const week = index + 1;
    const start = getIsoWeekStartDate(year, week);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);

    return {
      value: String(week).padStart(2, "0"),
      label: `Semana ${week} · ${formatWeekDate(start)} - ${formatWeekDate(end)}`,
    };
  });
}

function formatMonthDay(value: string) {
  const [month, day] = value.split("-");
  return `${day}/${month}`;
}

function buildDayOptions(rows: DashboardPaymentMethodDailyPoint[]) {
  return Array.from(new Set(rows.map((row) => getMonthDay(row.fecha))))
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: formatMonthDay(value) }));
}

function getDeliveryPlatform(value: string) {
  const normalized = normalizeText(value);
  if (normalized.includes("PEYA") || normalized.includes("PEDIDOS")) return "Peya";
  if (normalized.includes("RAPPI")) return "Rappi";
  if (normalized.includes("TURBO")) return "Turbo";
  if (normalized.includes("DIDI")) return "Didi";
  if (normalized.includes("DELIVERY")) return "Delivery";
  return null;
}

function getPlatformKeys(rows: DashboardPaymentMethodDailyPoint[]) {
  const preferredOrder = ["Peya", "Rappi", "Turbo", "Didi", "Delivery"];
  return Array.from(
    rows.reduce((set, row) => {
      const platform = getDeliveryPlatform(row.method);
      if (platform) set.add(platform);
      return set;
    }, new Set<string>()),
  ).sort((a, b) => {
    const aIndex = preferredOrder.indexOf(a);
    const bIndex = preferredOrder.indexOf(b);
    if (aIndex !== -1 || bIndex !== -1) {
      return (aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex) - (bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex);
    }
    return a.localeCompare(b);
  });
}

function buildDeliveryBranchPlatformSales(rows: DashboardPaymentMethodDailyPoint[]) {
  return Array.from(
    rows.reduce((map, row) => {
      const platform = getDeliveryPlatform(row.method);
      if (!platform) return map;

      const year = getDateYear(row.fecha);
      const branchKey = `${year}__${String(row.branchId ?? row.branch)}`;
      const current = map.get(branchKey) ?? {
        label: `${row.branch} - ${year}`,
        totalAmount: 0,
      };

      current[platform] = Number(current[platform] ?? 0) + row.amount;
      current.totalAmount = Number(current.totalAmount ?? 0) + row.amount;
      map.set(branchKey, current);
      return map;
    }, new Map<string, DashboardPaymentsChartPoint>()),
  )
    .sort((a, b) => Number(b[1].totalAmount ?? 0) - Number(a[1].totalAmount ?? 0))
    .map(([, value]) => {
      const chartPoint = { ...value };
      delete chartPoint.totalAmount;
      return chartPoint;
    });
}

function getBranchColor(index: number) {
  return BRANCH_COLORS[index % BRANCH_COLORS.length];
}

function getPlatformColor(platform: string) {
  return PLATFORM_COLORS[platform] ?? "#64748b";
}

function buildSparkValues(rows: DashboardPaymentMethodDailyPoint[], valueGetter: (row: DashboardPaymentMethodDailyPoint) => number) {
  const byDate = Array.from(
    rows.reduce((map, row) => {
      map.set(row.fecha, (map.get(row.fecha) ?? 0) + valueGetter(row));
      return map;
    }, new Map<string, number>()),
  ).sort((a, b) => a[0].localeCompare(b[0]));

  return byDate.map(([, value]) => value);
}

function buildDeliveryBranchScores(rows: DashboardPaymentMethodDailyPoint[]): DeliveryBranchScore[] {
  return Array.from(
    rows.reduce((map, row) => {
      const platform = getDeliveryPlatform(row.method);
      if (!platform) return map;

      const year = getDateYear(row.fecha);
      const branchKey = `${year}__${String(row.branchId ?? row.branch)}`;
      const current = map.get(branchKey) ?? {
        year,
        branchId: row.branchId,
        branch: row.branch,
        amount: 0,
        operations: 0,
        platforms: {} as Record<string, DeliveryPlatformSummary>,
        rows: [] as DashboardPaymentMethodDailyPoint[],
      };
      const platformSummary = current.platforms[platform] ?? { amount: 0, operations: 0 };

      current.amount += row.amount;
      current.operations += row.operations;
      platformSummary.amount += row.amount;
      platformSummary.operations += row.operations;
      current.platforms[platform] = platformSummary;
      current.rows.push(row);
      map.set(branchKey, current);
      return map;
    }, new Map<string, {
      year: string;
      branchId: number | null;
      branch: string;
      amount: number;
      operations: number;
      platforms: Record<string, DeliveryPlatformSummary>;
      rows: DashboardPaymentMethodDailyPoint[];
    }>()),
  )
    .map(([, value]) => ({
      year: value.year,
      branchId: value.branchId,
      branch: value.branch,
      amount: value.amount,
      operations: value.operations,
      averageTicket: value.operations > 0 ? value.amount / value.operations : 0,
      platforms: value.platforms,
      amountSpark: buildSparkValues(value.rows, (row) => row.amount),
      operationsSpark: buildSparkValues(value.rows, (row) => row.operations),
    }))
    .sort((a, b) => b.amount - a.amount);
}

function SparkLine({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) {
    return <div className="h-7 rounded bg-muted" />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 120;
  const height = 28;
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(" ");
  const lastY = height - ((data.at(-1) ?? 0) - min) / range * (height - 6) - 3;

  return (
    <svg aria-hidden="true" className="block h-7 w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <circle cx={width} cy={lastY} r="2.6" fill={color} />
    </svg>
  );
}

export function DashboardDeliverySection({ payments }: { payments: DashboardPaymentsData }) {
  const deliveryRows = useMemo(
    () => payments.paymentDailyRows.filter((row) => isOperationalYear(row.fecha) && getDeliveryPlatform(row.method)),
    [payments.paymentDailyRows],
  );
  const dateBounds = useMemo(() => {
    const dates = deliveryRows.map((row) => row.fecha).sort((a, b) => a.localeCompare(b));
    return {
      min: dates[0] ?? "",
      max: dates.at(-1) ?? "",
    };
  }, [deliveryRows]);
  const availableYears = useMemo(
    () => Array.from(new Set(deliveryRows.map((row) => getDateYear(row.fecha)))).sort((a, b) => Number(a) - Number(b)),
    [deliveryRows],
  );
  const monthBounds = useMemo(
    () => ({
      min: dateBounds.min ? getYearMonth(dateBounds.min) : "",
      max: dateBounds.max ? getYearMonth(dateBounds.max) : "",
    }),
    [dateBounds.max, dateBounds.min],
  );
  const defaultWeekYear = dateBounds.max ? Number(getDateYear(dateBounds.max)) : Number(new Date().getFullYear());
  const [filterMode, setFilterMode] = useState<DeliveryFilterMode>("month");
  const [selectedMonth, setSelectedMonth] = useState(monthBounds.max ? monthBounds.max.slice(5, 7) : "1");
  const [selectedWeek, setSelectedWeek] = useState(dateBounds.max ? getIsoWeekNumber(dateBounds.max) : "01");
  const [selectedDay, setSelectedDay] = useState(dateBounds.max ? getMonthDay(dateBounds.max) : "01-01");
  const [selectedYears, setSelectedYears] = useState(availableYears);

  const weekOptions = useMemo(() => buildWeekOptions(defaultWeekYear), [defaultWeekYear]);
  const dayOptions = useMemo(() => buildDayOptions(deliveryRows), [deliveryRows]);
  const filteredRows = useMemo(() => {
    if (filterMode === "week") {
      return deliveryRows.filter((row) => getIsoWeekNumber(row.fecha) === selectedWeek.padStart(2, "0"));
    }

    if (filterMode === "day") {
      return deliveryRows.filter((row) => getMonthDay(row.fecha) === selectedDay);
    }

    return deliveryRows.filter((row) => {
      return getDateMonth(row.fecha).padStart(2, "0") === selectedMonth.padStart(2, "0");
    });
  }, [deliveryRows, filterMode, selectedDay, selectedMonth, selectedWeek]);
  const filteredRowsByYear = useMemo(
    () => filteredRows.filter((row) => selectedYears.includes(getDateYear(row.fecha))),
    [filteredRows, selectedYears],
  );
  const comparisonYears = useMemo(
    () => availableYears.filter((year) => selectedYears.includes(year)),
    [availableYears, selectedYears],
  );
  const platformKeys = useMemo(() => getPlatformKeys(filteredRowsByYear), [filteredRowsByYear]);
  const deliverySalesByPlatform = useMemo(() => buildDeliveryBranchPlatformSales(filteredRowsByYear), [filteredRowsByYear]);
  const branchScores = useMemo(() => buildDeliveryBranchScores(filteredRowsByYear), [filteredRowsByYear]);
  const branchScoresByYear = useMemo(
    () => comparisonYears
      .map((year) => ({
        year,
        scores: branchScores
          .filter((score) => score.year === year)
          .sort((a, b) => b.amount - a.amount),
      }))
      .filter((group) => group.scores.length > 0),
    [branchScores, comparisonYears],
  );

  return (
    <section id="delivery" className="space-y-4 scroll-mt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle
          eyebrow="Delivery"
          title="Delivery por app y sucursal"
          description="Venta por app de delivery, sucursal y año para la misma semana, mes o día. No incluye data histórica."
        />
        <div className="grid gap-3 rounded-2xl border bg-card p-3 sm:grid-cols-[auto_minmax(150px,1fr)_minmax(150px,1fr)_auto] sm:items-end">
          <div className="flex h-10 rounded-lg border border-border bg-muted p-1">
            {([
              ["week", "Semana"],
              ["month", "Mes"],
              ["day", "Día"],
            ] as const).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilterMode(mode)}
                className={`rounded-md px-3 text-sm font-medium transition ${
                  filterMode === mode
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {filterMode === "month" ? (
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground" htmlFor="delivery-month">
                Mes
              </label>
              <select
                id="delivery-month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-input px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              >
                {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")).map((month) => (
                  <option key={month} value={month}>
                    {new Intl.DateTimeFormat("es-PE", { month: "long" }).format(new Date(2024, Number(month) - 1, 1))}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {filterMode === "week" ? (
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground" htmlFor="delivery-week">
                Semana
              </label>
              <select
                id="delivery-week"
                value={selectedWeek}
                onChange={(event) => setSelectedWeek(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-input px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              >
                {weekOptions.map((week) => (
                  <option key={week.value} value={week.value}>
                    {week.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {filterMode === "day" ? (
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground" htmlFor="delivery-day">
                Día
              </label>
              <select
                id="delivery-day"
                value={selectedDay}
                onChange={(event) => setSelectedDay(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-input px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              >
                {dayOptions.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 sm:col-span-4">
            {availableYears.map((year) => (
              <label key={year} className="inline-flex h-8 items-center gap-2 rounded-full border px-3 text-sm">
                <input
                  type="checkbox"
                  checked={selectedYears.includes(year)}
                  onChange={(event) => {
                    setSelectedYears((current) => {
                      if (event.target.checked) return [...current, year].sort((a, b) => Number(a) - Number(b));
                      return current.filter((item) => item !== year);
                    });
                  }}
                />
                {year}
              </label>
            ))}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Venta delivery por app, sucursal y año</CardTitle>
          <p className="text-sm text-muted-foreground">Compara cuánto vende cada app de delivery por sucursal y año.</p>
        </CardHeader>
        <CardContent>
          <DashboardBranchesMetricView
            data={deliverySalesByPlatform}
            keys={platformKeys}
            chart="bar"
            labelHeader="Sucursal / año"
            showValueLabels
            largeText
            barLayout="horizontal"
            barColorMode="series"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scorecard por sucursal</CardTitle>
          <p className="text-sm text-muted-foreground">
            Resumen del período seleccionado con venta, transacciones, ticket promedio y desglose por app.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {branchScoresByYear.length ? (
            branchScoresByYear.map((group) => (
              <section key={group.year} className="space-y-3">
                <div className="flex items-center justify-between gap-3 border-b pb-2">
                  <h3 className="text-base font-semibold text-foreground">{group.year}</h3>
                  <p className="text-sm text-muted-foreground">{formatNumber(group.scores.length)} sucursales</p>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  {group.scores.map((score, index) => {
                    const color = getBranchColor(index);
                    const scorePlatformKeys = platformKeys.filter((platform) => score.platforms[platform]);

                    return (
                      <div
                        key={`${score.year}-${score.branchId ?? score.branch}-delivery-card`}
                        className="rounded-xl border bg-background"
                        style={{ borderTopColor: color, borderTopWidth: 3 }}
                      >
                        <div className="space-y-4 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-base font-semibold text-foreground">{score.branch}</p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {formatCurrency(score.amount)} · {formatNumber(score.operations)} transacciones · TP {formatCurrency(score.averageTicket)}
                              </p>
                            </div>
                            <div className="rounded-lg bg-muted px-3 py-1 text-sm font-semibold text-foreground">
                              {formatNumber(scorePlatformKeys.length)} apps
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {scorePlatformKeys.map((platform) => {
                              const platformSummary = score.platforms[platform];

                              return (
                                <div key={platform} className="rounded-lg bg-muted/40 p-2 text-center">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{platform}</p>
                                  <p
                                    className="mt-1 text-sm font-semibold tabular-nums"
                                    style={{ color: getPlatformColor(platform) }}
                                  >
                                    {formatCurrency(platformSummary.amount)}
                                  </p>
                                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    {formatNumber(platformSummary.operations)} txs
                                  </p>
                                </div>
                              );
                            })}
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="text-[11px] font-medium text-muted-foreground">Venta en el período</p>
                              <SparkLine data={score.amountSpark} color={color} />
                            </div>
                            <div>
                              <p className="text-[11px] font-medium text-muted-foreground">Transacciones en el período</p>
                              <SparkLine data={score.operationsSpark} color={`${color}cc`} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No hay datos visibles con estos filtros.</div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

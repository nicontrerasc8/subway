"use client";

import { useMemo, useState } from "react";

import { DashboardBranchesMetricView } from "@/app/(app)/dashboard/_components/dashboard-overview-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  DashboardBranchDailyPoint,
  DashboardBranchesChartPoint,
  DashboardBranchesData,
} from "@/modules/dashboard/services/dashboard-branches";

type BranchesFilterMode = "month" | "week" | "day";
type BranchSalesMetric = "total" | "delivery" | "salon";

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

function getIsoWeekYear(value: string) {
  return getIsoWeekValue(value).slice(0, 4);
}

function getComparisonYear(value: string, mode: BranchesFilterMode) {
  return mode === "week" ? getIsoWeekYear(value) : getDateYear(value);
}

function getLocalDateValue(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
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

function buildDayOptions(rows: DashboardBranchDailyPoint[]) {
  return Array.from(new Set(rows.map((row) => getMonthDay(row.fecha))))
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: formatMonthDay(value) }));
}

function getBranchSalesValue(row: DashboardBranchDailyPoint, metric: BranchSalesMetric) {
  if (metric === "delivery") return row.deliverySales;
  if (metric === "salon") return row.salonSales;
  return row.sales;
}

function buildBranchYearSales(
  rows: DashboardBranchDailyPoint[],
  metric: BranchSalesMetric,
  getYear: (value: string) => string,
) {
  return Array.from(
    rows.reduce((map, row) => {
      const year = getYear(row.fecha);
      const key = String(row.branchId ?? row.branch);
      const entry = map.get(key) ?? { label: row.branch };
      entry[year] = Number(entry[year] ?? 0) + getBranchSalesValue(row, metric);
      map.set(key, entry);
      return map;
    }, new Map<string, DashboardBranchesChartPoint>()),
  )
    .sort((a, b) => {
      const totalA = Object.entries(a[1]).reduce((sum, [key, value]) => key === "label" ? sum : sum + Number(value), 0);
      const totalB = Object.entries(b[1]).reduce((sum, [key, value]) => key === "label" ? sum : sum + Number(value), 0);
      return totalB - totalA;
    })
    .map(([, value]) => value);
}

function buildChannelShareRowsByYearAndBranch(
  rows: DashboardBranchDailyPoint[],
  getYear: (value: string) => string,
) {
  return Array.from(
    rows.reduce((map, row) => {
      const year = getYear(row.fecha);
      const branchKey = String(row.branchId ?? row.branch);
      const key = `${year}__${branchKey}`;
      const current = map.get(key) ?? {
        year,
        branch: row.branch,
        salonSales: 0,
        deliverySales: 0,
      };

      current.salonSales += row.salonSales;
      current.deliverySales += row.deliverySales;
      map.set(key, current);
      return map;
    }, new Map<string, { year: string; branch: string; salonSales: number; deliverySales: number }>()),
  )
    .map(([, value]) => {
      const total = value.salonSales + value.deliverySales;
      return {
        year: value.year,
        branch: value.branch,
        label: `${value.branch} - ${value.year}`,
        Salón: total > 0 ? (value.salonSales / total) * 100 : 0,
        Delivery: total > 0 ? (value.deliverySales / total) * 100 : 0,
      };
    })
    .sort((a, b) => {
      const branchDiff = a.branch.localeCompare(b.branch, "es");
      if (branchDiff !== 0) return branchDiff;
      return Number(a.year) - Number(b.year);
    });
}

export function DashboardBranchesSection({ branches }: { branches: DashboardBranchesData }) {
  const currentDateValue = getLocalDateValue(new Date());
  const currentYear = Number(getDateYear(currentDateValue));
  const currentWeek = getIsoWeekNumber(currentDateValue);
  const weekOptions = useMemo(() => buildWeekOptions(currentYear), [currentYear]);
  const dateBounds = useMemo(() => {
    const dates = branches.dailyRows.map((row) => row.fecha).sort((a, b) => a.localeCompare(b));
    return {
      min: dates[0] ?? "",
      max: dates.at(-1) ?? "",
    };
  }, [branches.dailyRows]);
  const monthBounds = useMemo(
    () => ({
      min: dateBounds.min ? getYearMonth(dateBounds.min) : "",
      max: dateBounds.max ? getYearMonth(dateBounds.max) : "",
    }),
    [dateBounds.max, dateBounds.min],
  );
  const [filterMode, setFilterMode] = useState<BranchesFilterMode>("week");
  const availableYears = useMemo(
    () => Array.from(new Set(branches.dailyRows.map((row) => getComparisonYear(row.fecha, filterMode)))).sort((a, b) => Number(a) - Number(b)),
    [branches.dailyRows, filterMode],
  );
  const [selectedMonth, setSelectedMonth] = useState(monthBounds.max ? monthBounds.max.slice(5, 7) : "1");
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [selectedDay, setSelectedDay] = useState(dateBounds.max ? getMonthDay(dateBounds.max) : "01-01");
  const [selectedYears, setSelectedYears] = useState(availableYears);
  const dayOptions = useMemo(() => buildDayOptions(branches.dailyRows), [branches.dailyRows]);

  const filteredRows = useMemo(() => {
    if (filterMode === "week") {
      return branches.dailyRows.filter((row) => {
        return getIsoWeekNumber(row.fecha) === selectedWeek.padStart(2, "0");
      });
    }

    if (filterMode === "day") {
      return branches.dailyRows.filter((row) => {
        return getMonthDay(row.fecha) === selectedDay;
      });
    }

    return branches.dailyRows.filter((row) => {
      return getDateMonth(row.fecha).padStart(2, "0") === selectedMonth.padStart(2, "0");
    });
  }, [
    branches.dailyRows,
    filterMode,
    selectedDay,
    selectedMonth,
    selectedWeek,
  ]);
  const filteredRowsByYear = useMemo(
    () => filteredRows.filter((row) => selectedYears.includes(getComparisonYear(row.fecha, filterMode))),
    [filteredRows, filterMode, selectedYears],
  );
  const getActiveComparisonYear = useMemo(
    () => (value: string) => getComparisonYear(value, filterMode),
    [filterMode],
  );
  const comparisonYears = useMemo(
    () => availableYears.filter((year) => selectedYears.includes(year)),
    [availableYears, selectedYears],
  );
  const branchYearTotalSales = useMemo(() => buildBranchYearSales(filteredRowsByYear, "total", getActiveComparisonYear), [filteredRowsByYear, getActiveComparisonYear]);
  const branchYearDeliverySales = useMemo(() => buildBranchYearSales(filteredRowsByYear, "delivery", getActiveComparisonYear), [filteredRowsByYear, getActiveComparisonYear]);
  const branchYearSalonSales = useMemo(() => buildBranchYearSales(filteredRowsByYear, "salon", getActiveComparisonYear), [filteredRowsByYear, getActiveComparisonYear]);
  const channelShareRows = useMemo(() => buildChannelShareRowsByYearAndBranch(filteredRowsByYear, getActiveComparisonYear), [filteredRowsByYear, getActiveComparisonYear]);
  const dailyTrend: DashboardBranchesChartPoint[] = [];
  const monthlyTrend: DashboardBranchesChartPoint[] = [];

  return (
    <section id="sucursales" className="space-y-4 scroll-mt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle
          eyebrow="Ventas totales"
          title="Rendimiento por sede"
          description="Comparativo de ventas, ticket, volumen y variedad entre sucursales."
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
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground" htmlFor="branches-month">
                Mes
              </label>
              <select
                id="branches-month"
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
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground" htmlFor="branches-week">
                Semana
              </label>
              <select
                id="branches-week"
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
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground" htmlFor="branches-day">
                Día
              </label>
              <select
                id="branches-day"
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

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Ventas por sucursal</CardTitle>
            <p className="text-sm text-muted-foreground">Compara el total vendido por sede para la misma semana, mes o día en cada año.</p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="total" className="space-y-4">
              <TabsList className="h-10 rounded-xl">
                <TabsTrigger value="total" className="rounded-lg px-4">
                  Ventas totales
                </TabsTrigger>
                <TabsTrigger value="delivery" className="rounded-lg px-4">
                  Delivery
                </TabsTrigger>
                <TabsTrigger value="salon" className="rounded-lg px-4">
                  Salón
                </TabsTrigger>
              </TabsList>

              <TabsContent value="total" className="mt-0">
                <DashboardBranchesMetricView
                  data={branchYearTotalSales}
                  keys={comparisonYears}
                  chart="bar"
                  labelHeader="Sucursal"
                  showValueLabels
                  largeText
                  barLayout="horizontal"
                />
              </TabsContent>
              <TabsContent value="delivery" className="mt-0">
                <DashboardBranchesMetricView
                  data={branchYearDeliverySales}
                  keys={comparisonYears}
                  chart="bar"
                  labelHeader="Sucursal"
                  showValueLabels
                  largeText
                  barLayout="horizontal"
                />
              </TabsContent>
              <TabsContent value="salon" className="mt-0">
                <DashboardBranchesMetricView
                  data={branchYearSalonSales}
                  keys={comparisonYears}
                  chart="bar"
                  labelHeader="Sucursal"
                  showValueLabels
                  largeText
                  barLayout="horizontal"
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Salón y delivery por año</CardTitle>
          <p className="text-sm text-muted-foreground">Porcentaje de venta en salón y delivery durante el período seleccionado.</p>
        </CardHeader>
        <CardContent>
          <DashboardBranchesMetricView
            data={channelShareRows}
            keys={["Salón", "Delivery"]}
            chart="bar"
            valueFormat="percent"
            labelHeader="Sucursal / año"
            showValueLabels
            barLayout="horizontal"
            stackedBars
          />
        </CardContent>
      </Card>

      <section className="hidden">
        <Card>
          <CardHeader>
            <CardTitle>Tendencia diaria por año</CardTitle>
            <p className="text-sm text-muted-foreground">Compara el mismo día y mes entre los años del subrango.</p>
          </CardHeader>
          <CardContent>
            <DashboardBranchesMetricView data={dailyTrend} keys={comparisonYears} chart="line" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Acumulado mensual por año</CardTitle>
            <p className="text-sm text-muted-foreground">Cada color representa un año dentro del subrango seleccionado.</p>
          </CardHeader>
          <CardContent>
            <DashboardBranchesMetricView data={monthlyTrend} keys={comparisonYears} chart="bar" />
          </CardContent>
        </Card>
      </section>

     
    </section>
  );
}

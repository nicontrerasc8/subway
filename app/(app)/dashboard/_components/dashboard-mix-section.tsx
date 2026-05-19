"use client";

import { useMemo, useState } from "react";

import { DashboardBranchesMetricView, DashboardProductComparisonView } from "@/app/(app)/dashboard/_components/dashboard-overview-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  DashboardMixCategoryDailyPoint,
  DashboardMixData,
  DashboardMixProductComparisonPoint,
  DashboardMixProductDailyPoint,
  DashboardMixProductPoint,
} from "@/modules/dashboard/services/dashboard-mix";

type MixFilterMode = "month" | "week" | "day";

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

function getDateYear(value: string) {
  return value.slice(0, 4);
}

function getYearMonth(value: string) {
  return value.slice(0, 7);
}

function getMonthDay(value: string) {
  return value.slice(5, 10);
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

function buildProductComparison(rows: DashboardMixProductDailyPoint[]) {
  const allProducts = Array.from(
    rows.reduce((map, row) => {
      const current = map.get(row.reference) ?? {
        referencia: row.reference,
        producto: row.product,
        categoria: row.category,
        ventas: 0,
        unidades: 0,
      };
      current.ventas += row.sales;
      current.unidades += row.units;
      map.set(row.reference, current);
      return map;
    }, new Map<string, DashboardMixProductPoint>()),
  )
    .map(([, value]) => value)
    .sort((a, b) => b.ventas - a.ventas);

  const yearKeys = Array.from(new Set(rows.map((row) => getDateYear(row.fecha))).values()).sort((a, b) => Number(a) - Number(b));
  const branchKeys = Array.from(
    rows.reduce((map, row) => {
      map.set(row.branch, (map.get(row.branch) ?? 0) + row.sales);
      return map;
    }, new Map<string, number>()),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([branch]) => branch);

  const comparison = Array.from(
    rows.reduce((map, row) => {
      const current = map.get(row.reference) ?? {
        referencia: row.reference,
        producto: row.product,
        categoria: row.category,
        label: row.product,
        ventas: 0,
        unidades: 0,
        byYear: {},
        byBranch: {},
        byBranchYear: {},
      };
      const year = getDateYear(row.fecha);
      current.ventas += row.sales;
      current.unidades += row.units;
      current.byYear[year] = (current.byYear[year] ?? 0) + row.sales;
      if (branchKeys.includes(row.branch)) {
        current.byBranch[row.branch] = (current.byBranch[row.branch] ?? 0) + row.sales;
        current.byBranchYear[`${row.branch}__${year}`] = (current.byBranchYear[`${row.branch}__${year}`] ?? 0) + row.sales;
      }
      map.set(row.reference, current);
      return map;
    }, new Map<string, DashboardMixProductComparisonPoint>()),
  )
    .map(([, value]) => value)
    .sort((a, b) => b.ventas - a.ventas);

  return { comparison, yearKeys, branchKeys, allProducts };
}

function buildCategoryComparison(rows: DashboardMixCategoryDailyPoint[]) {
  const yearKeys = Array.from(new Set(rows.map((row) => getDateYear(row.fecha))).values()).sort((a, b) => Number(a) - Number(b));
  const branchKeys = Array.from(
    rows.reduce((map, row) => {
      map.set(row.branch, (map.get(row.branch) ?? 0) + row.sales);
      return map;
    }, new Map<string, number>()),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([branch]) => branch);

  const comparison = Array.from(
    rows.reduce((map, row) => {
      const current = map.get(row.category) ?? {
        referencia: row.category,
        producto: row.category,
        categoria: "Categoría",
        label: row.category,
        ventas: 0,
        unidades: 0,
        byYear: {},
        byBranch: {},
        byBranchYear: {},
      };
      const year = getDateYear(row.fecha);
      current.ventas += row.sales;
      current.unidades += row.units;
      current.byYear[year] = (current.byYear[year] ?? 0) + row.sales;
      if (branchKeys.includes(row.branch)) {
        current.byBranch[row.branch] = (current.byBranch[row.branch] ?? 0) + row.sales;
        current.byBranchYear[`${row.branch}__${year}`] = (current.byBranchYear[`${row.branch}__${year}`] ?? 0) + row.sales;
      }
      map.set(row.category, current);
      return map;
    }, new Map<string, DashboardMixProductComparisonPoint>()),
  )
    .map(([, value]) => value)
    .sort((a, b) => b.ventas - a.ventas);

  return { comparison, yearKeys, branchKeys };
}

function buildCategoryShareByBranchYear(rows: DashboardMixCategoryDailyPoint[]) {
  const grouped = rows.reduce((map, row) => {
    const year = getDateYear(row.fecha);
    const branchKey = `${year}__${String(row.branchId ?? row.branch)}`;
    const current = map.get(branchKey) ?? {
      label: `${row.branch} - ${year}`,
      branch: row.branch,
      year,
      totalSales: 0,
      categories: {} as Record<string, number>,
    };

    current.totalSales += row.sales;
    current.categories[row.category] = (current.categories[row.category] ?? 0) + row.sales;
    map.set(branchKey, current);
    return map;
  }, new Map<string, {
    label: string;
    branch: string;
    year: string;
    totalSales: number;
    categories: Record<string, number>;
  }>());

  const categoryTotals = new Map<string, number>();
  for (const item of grouped.values()) {
    for (const [category, sales] of Object.entries(item.categories)) {
      categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + sales);
    }
  }

  const categoryKeys = Array.from(categoryTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category);

  const data = Array.from(grouped.values())
    .sort((a, b) => {
      const branchDiff = a.branch.localeCompare(b.branch, "es");
      if (branchDiff !== 0) return branchDiff;
      return Number(a.year) - Number(b.year);
    })
    .map((item) => {
      const point: { label: string; year: string; [key: string]: string | number } = { label: item.label, year: item.year };
      for (const category of categoryKeys) {
        point[category] = item.totalSales > 0 ? ((item.categories[category] ?? 0) / item.totalSales) * 100 : 0;
      }
      return point;
    });

  return { data, categoryKeys };
}

export function DashboardMixSection({ mix }: { mix: DashboardMixData }) {
  const dateBounds = useMemo(() => {
    const dates = mix.categoryDailyRows.map((row) => row.fecha).sort((a, b) => a.localeCompare(b));
    return {
      min: dates[0] ?? "",
      max: dates.at(-1) ?? "",
    };
  }, [mix.categoryDailyRows]);
  const monthBounds = useMemo(
    () => ({
      min: dateBounds.min ? getYearMonth(dateBounds.min) : "",
      max: dateBounds.max ? getYearMonth(dateBounds.max) : "",
    }),
    [dateBounds.max, dateBounds.min],
  );
  const defaultWeekYear = dateBounds.max ? Number(getDateYear(dateBounds.max)) : Number(new Date().getFullYear());
  const [filterMode, setFilterMode] = useState<MixFilterMode>("week");
  const [selectedMonth, setSelectedMonth] = useState(monthBounds.max ? monthBounds.max.slice(5, 7) : "1");
  const [selectedWeek, setSelectedWeek] = useState(dateBounds.max ? getIsoWeekNumber(dateBounds.max) : "01");
  const [selectedDay, setSelectedDay] = useState(dateBounds.max ? getMonthDay(dateBounds.max) : "01-01");

  const weekOptions = useMemo(() => buildWeekOptions(defaultWeekYear), [defaultWeekYear]);
  const filteredCategories = useMemo(() => {
    const periodRows = (() => {
      if (filterMode === "week") {
        return mix.categoryDailyRows.filter((row) => getIsoWeekNumber(row.fecha) === selectedWeek.padStart(2, "0"));
      }

      if (filterMode === "day") {
        return mix.categoryDailyRows.filter((row) => getMonthDay(row.fecha) === selectedDay);
      }

      return mix.categoryDailyRows.filter((row) => getDateMonth(row.fecha).padStart(2, "0") === selectedMonth.padStart(2, "0"));
    })();

    return periodRows;
  }, [filterMode, mix.categoryDailyRows, selectedDay, selectedMonth, selectedWeek]);
  const filteredProducts = useMemo(() => {
    const periodRows = (() => {
      if (filterMode === "week") {
        return mix.productDailyRows.filter((row) => getIsoWeekNumber(row.fecha) === selectedWeek.padStart(2, "0"));
      }

      if (filterMode === "day") {
        return mix.productDailyRows.filter((row) => getMonthDay(row.fecha) === selectedDay);
      }

      return mix.productDailyRows.filter((row) => getDateMonth(row.fecha).padStart(2, "0") === selectedMonth.padStart(2, "0"));
    })();

    return periodRows;
  }, [filterMode, mix.productDailyRows, selectedDay, selectedMonth, selectedWeek]);

  const categories = useMemo(() => buildCategoryComparison(filteredCategories), [filteredCategories]);
  const categoryShare = useMemo(() => buildCategoryShareByBranchYear(filteredCategories), [filteredCategories]);
  const categoryShareYears = useMemo(
    () => Array.from(new Set(categoryShare.data.map((item) => String(item.year)))).sort((a, b) => Number(a) - Number(b)),
    [categoryShare.data],
  );
  const [selectedCategoryShareYears, setSelectedCategoryShareYears] = useState(categoryShareYears);
  const activeCategoryShareYears = selectedCategoryShareYears.filter((year) => categoryShareYears.includes(year));
  const categoryShareData = categoryShare.data.filter((item) => activeCategoryShareYears.includes(String(item.year)));
  const products = useMemo(() => buildProductComparison(filteredProducts), [filteredProducts]);

  return (
    <section id="mix" className="space-y-4 scroll-mt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle
          eyebrow="Mix"
          title="Categorías y productos"
          description="Comparativo de categorías y productos líderes con filtro activo de fecha y sucursal."
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
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground" htmlFor="mix-month">
                Mes
              </label>
              <select
                id="mix-month"
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
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground" htmlFor="mix-week">
                Semana
              </label>
              <select
                id="mix-week"
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
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground" htmlFor="mix-day">
                Día
              </label>
              <input
                id="mix-day"
                type="date"
                value={`2024-${selectedDay}`}
                onChange={(event) => setSelectedDay(getMonthDay(event.target.value))}
                className="h-10 w-full rounded-lg border border-border bg-input px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          ) : null}

        </div>
      </div>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Peso de categorías por sucursal y año</CardTitle>
          <p className="text-sm text-muted-foreground">
            Participación porcentual de cada categoría dentro de la venta de cada sucursal para el período seleccionado.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Años</p>
            <div className="flex flex-wrap gap-2">
              {categoryShareYears.map((year) => (
                <label key={year} className="inline-flex h-8 items-center gap-2 rounded-full border px-3 text-sm">
                  <input
                    type="checkbox"
                    checked={activeCategoryShareYears.includes(year)}
                    onChange={(event) => {
                      setSelectedCategoryShareYears((current) => {
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
          <DashboardBranchesMetricView
            data={categoryShareData}
            keys={categoryShare.categoryKeys}
            chart="bar"
            valueFormat="percent"
            labelHeader="Sucursal / año"
            showValueLabels
            barLayout="horizontal"
            stackedBars
          />
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader><CardTitle>Categorías</CardTitle></CardHeader>
        <CardContent>
          <DashboardProductComparisonView
            data={categories.comparison}
            yearKeys={categories.yearKeys}
            branchKeys={categories.branchKeys}
            description="Todas las categorías con el filtro activo de fecha y sucursal."
            searchPlaceholder="Buscar categoría"
            emptyMessage="No hay categorías visibles con estos filtros."
          />
        </CardContent>
      </Card>

      <section className="grid gap-4">
        <Card>
          <CardHeader><CardTitle>Productos</CardTitle></CardHeader>
          <CardContent>
            <DashboardProductComparisonView
              data={products.comparison}
              yearKeys={products.yearKeys}
              branchKeys={products.branchKeys}
            />
          </CardContent>
        </Card>
      </section>
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";

import {
  DashboardBranchesMultiBarChart,
  DashboardMixChart,
  DashboardProductComparisonView,
  DashboardSimpleBarChart,
} from "@/app/(app)/dashboard/_components/dashboard-overview-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type {
  DashboardMixCategoryDailyPoint,
  DashboardMixData,
  DashboardMixPoint,
  DashboardMixProductComparisonPoint,
  DashboardMixProductDailyPoint,
  DashboardMixProductPoint,
} from "@/modules/dashboard/services/dashboard-mix";

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

function getDateMonth(value: string) {
  return String(Number(value.slice(5, 7)));
}

function getMonthLabel(month: string) {
  return new Intl.DateTimeFormat("es-PE", { month: "short" }).format(
    new Date(2024, Number(month) - 1, 1),
  );
}

function topCategorySales(rows: DashboardMixCategoryDailyPoint[]): DashboardMixPoint[] {
  return Array.from(
    rows.reduce((map, row) => {
      map.set(row.category, (map.get(row.category) ?? 0) + row.sales);
      return map;
    }, new Map<string, number>()),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }));
}

function topCategoryUnits(rows: DashboardMixCategoryDailyPoint[]): DashboardMixPoint[] {
  return Array.from(
    rows.reduce((map, row) => {
      map.set(row.category, (map.get(row.category) ?? 0) + row.units);
      return map;
    }, new Map<string, number>()),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }));
}

function buildMonthlyCategoryTrend(rows: DashboardMixCategoryDailyPoint[]) {
  const categoryTotals = new Map<string, number>();
  const monthlyMap = new Map<string, { label: string; [key: string]: string | number }>();

  for (const row of rows) {
    const month = getDateMonth(row.fecha);
    const key = month.padStart(2, "0");
    const current = monthlyMap.get(key) ?? { label: getMonthLabel(month) };
    current[row.category] = Number(current[row.category] ?? 0) + row.sales;
    monthlyMap.set(key, current);
    categoryTotals.set(row.category, (categoryTotals.get(row.category) ?? 0) + row.sales);
  }

  return {
    trend: Array.from(monthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, value]) => value),
    keys: Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([category]) => category),
  };
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

export function DashboardMixSection({ mix }: { mix: DashboardMixData }) {
  const dateBounds = useMemo(() => {
    const dates = mix.categoryDailyRows.map((row) => row.fecha).sort((a, b) => a.localeCompare(b));
    return {
      min: dates[0] ?? "",
      max: dates.at(-1) ?? "",
    };
  }, [mix.categoryDailyRows]);
  const [dateFrom, setDateFrom] = useState(dateBounds.min);
  const [dateTo, setDateTo] = useState(dateBounds.max);

  const filteredCategories = useMemo(() => {
    const from = dateFrom || dateBounds.min;
    const to = dateTo || dateBounds.max;
    const [start, end] = from && to && from > to ? [to, from] : [from, to];

    return mix.categoryDailyRows.filter((row) => {
      if (start && row.fecha < start) return false;
      if (end && row.fecha > end) return false;
      return true;
    });
  }, [dateBounds.max, dateBounds.min, dateFrom, dateTo, mix.categoryDailyRows]);
  const filteredProducts = useMemo(() => {
    const from = dateFrom || dateBounds.min;
    const to = dateTo || dateBounds.max;
    const [start, end] = from && to && from > to ? [to, from] : [from, to];

    return mix.productDailyRows.filter((row) => {
      if (start && row.fecha < start) return false;
      if (end && row.fecha > end) return false;
      return true;
    });
  }, [dateBounds.max, dateBounds.min, dateFrom, dateTo, mix.productDailyRows]);

  const topCategories = useMemo(() => topCategorySales(filteredCategories), [filteredCategories]);
  const categoryUnits = useMemo(() => topCategoryUnits(filteredCategories), [filteredCategories]);
  const monthlyCategory = useMemo(() => buildMonthlyCategoryTrend(filteredCategories), [filteredCategories]);
  const products = useMemo(() => buildProductComparison(filteredProducts), [filteredProducts]);

  return (
    <section id="mix" className="space-y-4 scroll-mt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle
          eyebrow="Mix"
          title="Categorías, productos y composición"
          description="Peso de categorías, productos líderes y composición comercial."
        />
        <div className="grid gap-3 rounded-2xl border bg-card p-3 sm:grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_auto] sm:items-end">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground" htmlFor="mix-date-from">
              Fecha desde
            </label>
            <input
              id="mix-date-from"
              type="date"
              min={dateBounds.min}
              max={dateBounds.max}
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-10 rounded-lg border border-border bg-input px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground" htmlFor="mix-date-to">
              Fecha hasta
            </label>
            <input
              id="mix-date-to"
              type="date"
              min={dateBounds.min}
              max={dateBounds.max}
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="h-10 rounded-lg border border-border bg-input px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setDateFrom(dateBounds.min);
              setDateTo(dateBounds.max);
            }}
            className="h-10 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            Todo
          </button>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader><CardTitle>Ventas por categoría</CardTitle></CardHeader>
          <CardContent className="grid gap-5 2xl:grid-cols-[280px_minmax(0,1fr)] 2xl:items-center">
            <div className="min-w-0">
              <DashboardMixChart data={topCategories} />
            </div>
            <div className="grid min-w-0 gap-2 sm:grid-cols-2">
              {topCategories.map((item) => (
                <div key={item.label} className="min-w-0 rounded-xl border px-3 py-2">
                  <p className="truncate text-sm font-medium">{item.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{formatCurrency(item.value)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader><CardTitle>Unidades por categoría</CardTitle></CardHeader>
          <CardContent>
            <DashboardSimpleBarChart data={categoryUnits} name="Unidades" valueFormat="number" />
          </CardContent>
        </Card>
      </section>

      <Card className="min-w-0">
        <CardHeader><CardTitle>Tendencia mensual por categoría</CardTitle></CardHeader>
        <CardContent>
          <DashboardBranchesMultiBarChart data={monthlyCategory.trend} keys={monthlyCategory.keys} />
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

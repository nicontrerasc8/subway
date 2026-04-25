"use client";

import { useMemo, useState } from "react";

import { DashboardBranchesMetricView } from "@/app/(app)/dashboard/_components/dashboard-overview-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import type { DashboardCommercialInsightsData } from "@/modules/dashboard/services/dashboard-commercial-insights";
import type { DashboardBranchesChartPoint } from "@/modules/dashboard/services/dashboard-branches";
import type { DashboardMixCategoryDailyPoint, DashboardMixData } from "@/modules/dashboard/services/dashboard-mix";

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

function formatPercent(value: number) {
  return new Intl.NumberFormat("es-PE", {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(value);
}

function buildCategoryComparison(rows: DashboardMixCategoryDailyPoint[]) {
  const categoryTotals = new Map<string, number>();
  const byCategory = new Map<string, Record<string, number>>();
  const yearKeys = Array.from(new Set(rows.map((row) => getDateYear(row.fecha)))).sort((a, b) => Number(a) - Number(b));
  const totalUnits = rows.reduce((sum, row) => sum + row.units, 0);

  for (const row of rows) {
    const year = getDateYear(row.fecha);
    const current = byCategory.get(row.category) ?? {};
    current[year] = (current[year] ?? 0) + row.units;
    byCategory.set(row.category, current);
    categoryTotals.set(row.category, (categoryTotals.get(row.category) ?? 0) + row.units);
  }

  const categoryKeys = Array.from(categoryTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([category]) => category);

  const chartData = categoryKeys.map((category) =>
    yearKeys.reduce<DashboardBranchesChartPoint>(
      (point, year) => {
        point[year] = byCategory.get(category)?.[year] ?? 0;
        return point;
      },
      { label: category },
    ),
  );

  const shares = categoryKeys.map((category) => {
    const units = categoryTotals.get(category) ?? 0;
    return {
      label: category,
      units,
      share: totalUnits > 0 ? units / totalUnits : 0,
    };
  });

  return { yearKeys, chartData, shares };
}

export function DashboardFamiliesSection({
  commercial,
  mix,
}: {
  commercial: DashboardCommercialInsightsData;
  mix: DashboardMixData;
}) {
  const dateBounds = useMemo(() => {
    const dates = mix.categoryDailyRows.map((row) => row.fecha).sort((a, b) => a.localeCompare(b));
    return {
      min: dates[0] ?? "",
      max: dates.at(-1) ?? "",
    };
  }, [mix.categoryDailyRows]);
  const [dateFrom, setDateFrom] = useState(dateBounds.min);
  const [dateTo, setDateTo] = useState(dateBounds.max);

  const filteredRows = useMemo(() => {
    const from = dateFrom || dateBounds.min;
    const to = dateTo || dateBounds.max;
    const [start, end] = from && to && from > to ? [to, from] : [from, to];

    return mix.categoryDailyRows.filter((row) => {
      if (start && row.fecha < start) return false;
      if (end && row.fecha > end) return false;
      return true;
    });
  }, [dateBounds.max, dateBounds.min, dateFrom, dateTo, mix.categoryDailyRows]);
  const categoryComparison = useMemo(() => buildCategoryComparison(filteredRows), [filteredRows]);
  const fallbackComparison = {
    yearKeys: commercial.yearKeys,
    chartData: commercial.productGroupsByYear,
    shares: commercial.productGroupShares,
  };
  const comparison = filteredRows.length ? categoryComparison : fallbackComparison;

  return (
    <section id="familias" className="space-y-4 scroll-mt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle
          eyebrow="Familias"
          title="Mix tipo Excel"
          description="Categorías de la base de datos comparadas año contra año y con participación sobre unidades."
        />
        <div className="grid gap-3 rounded-2xl border bg-card p-3 sm:grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_auto] sm:items-end">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground" htmlFor="families-date-from">
              Fecha desde
            </label>
            <input
              id="families-date-from"
              type="date"
              min={dateBounds.min}
              max={dateBounds.max}
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-10 rounded-lg border border-border bg-input px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground" htmlFor="families-date-to">
              Fecha hasta
            </label>
            <input
              id="families-date-to"
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

      <section className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Unidades por categoría</CardTitle>
            <p className="text-sm text-muted-foreground">Comparativo anual usando las mismas categorías del mix comercial.</p>
          </CardHeader>
          <CardContent>
            <DashboardBranchesMetricView
              data={comparison.chartData}
              keys={comparison.yearKeys}
              chart="bar"
              valueFormat="number"
              labelHeader="Categoría"
            />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader><CardTitle>Peso de categorías comerciales</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {comparison.shares.map((item) => (
            <div key={item.label} className="rounded-2xl border p-4">
              <p className="font-medium">{item.label}</p>
              <p className="mt-3 text-2xl font-semibold">{formatPercent(item.share)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{formatNumber(item.units)} unidades visibles</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";

import { DashboardBranchesMetricView } from "@/app/(app)/dashboard/_components/dashboard-overview-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type {
  DashboardBranchDailyPoint,
  DashboardBranchRankingPoint,
  DashboardBranchesChartPoint,
  DashboardBranchesData,
  DashboardBranchesKpis,
} from "@/modules/dashboard/services/dashboard-branches";

function KpiCard({
  title,
  value,
  helper,
}: {
  title: string;
  value: string;
  helper: string;
}) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="mt-2 text-sm text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}

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

function getDateDay(value: string) {
  return Number(value.slice(8, 10));
}

function getMonthLabel(month: string) {
  return new Intl.DateTimeFormat("es-PE", { month: "short" }).format(
    new Date(2024, Number(month) - 1, 1),
  );
}

function getDayComparisonKey(fecha: string) {
  const month = getDateMonth(fecha);
  const day = getDateDay(fecha);

  return {
    key: `${month.padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    label: `${day} ${getMonthLabel(month)}`,
  };
}

function buildKpis(rows: DashboardBranchDailyPoint[]): DashboardBranchesKpis {
  const totalSales = rows.reduce((sum, row) => sum + row.sales, 0);
  const totalUnits = rows.reduce((sum, row) => sum + row.units, 0);
  const totalOperations = rows.reduce((sum, row) => sum + row.operations, 0);
  const totalProducts = rows.reduce((sum, row) => sum + row.products, 0);
  const activeBranches = new Set(rows.map((row) => String(row.branchId ?? row.branch))).size;

  return {
    totalSales,
    totalUnits,
    totalOperations,
    averageTicket: totalOperations > 0 ? totalSales / totalOperations : 0,
    activeBranches,
    averageProductsPerDay: rows.length > 0 ? totalProducts / rows.length : 0,
  };
}

function buildRanking(rows: DashboardBranchDailyPoint[]): DashboardBranchRankingPoint[] {
  return Array.from(
    rows.reduce((map, row) => {
      const key = String(row.branchId ?? row.branch);
      const current = map.get(key) ?? {
        branchId: row.branchId,
        branch: row.branch,
        sales: 0,
        units: 0,
        operations: 0,
        averageTicket: 0,
        averageProducts: 0,
        productDays: 0,
      };

      current.sales += row.sales;
      current.units += row.units;
      current.operations += row.operations;
      current.averageProducts += row.products;
      current.productDays += 1;
      current.averageTicket = current.operations > 0 ? current.sales / current.operations : 0;
      map.set(key, current);
      return map;
    }, new Map<string, DashboardBranchRankingPoint & { productDays: number }>()),
  )
    .map(([, value]) => ({
      branchId: value.branchId,
      branch: value.branch,
      sales: value.sales,
      units: value.units,
      operations: value.operations,
      averageTicket: value.averageTicket,
      averageProducts: value.productDays > 0 ? value.averageProducts / value.productDays : 0,
    }))
    .sort((a, b) => b.sales - a.sales);
}

function buildDailyTrend(rows: DashboardBranchDailyPoint[]) {
  return Array.from(
    rows.reduce((map, row) => {
      const year = getDateYear(row.fecha);
      const dayKey = getDayComparisonKey(row.fecha);
      const entry = map.get(dayKey.key) ?? { label: dayKey.label };
      entry[year] = Number(entry[year] ?? 0) + row.sales;
      map.set(dayKey.key, entry);
      return map;
    }, new Map<string, DashboardBranchesChartPoint>()),
  )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, value]) => value);
}

function buildMonthlyTrend(rows: DashboardBranchDailyPoint[]) {
  return Array.from(
    rows.reduce((map, row) => {
      const year = getDateYear(row.fecha);
      const month = getDateMonth(row.fecha);
      const entry = map.get(month.padStart(2, "0")) ?? { label: getMonthLabel(month) };
      entry[year] = Number(entry[year] ?? 0) + row.sales;
      map.set(month.padStart(2, "0"), entry);
      return map;
    }, new Map<string, DashboardBranchesChartPoint>()),
  )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, value]) => value);
}

export function DashboardBranchesSection({ branches }: { branches: DashboardBranchesData }) {
  const dateBounds = useMemo(() => {
    const dates = branches.dailyRows.map((row) => row.fecha).sort((a, b) => a.localeCompare(b));
    return {
      min: dates[0] ?? "",
      max: dates.at(-1) ?? "",
    };
  }, [branches.dailyRows]);
  const [dateFrom, setDateFrom] = useState(dateBounds.min);
  const [dateTo, setDateTo] = useState(dateBounds.max);

  const filteredRows = useMemo(() => {
    const from = dateFrom || dateBounds.min;
    const to = dateTo || dateBounds.max;
    const [start, end] = from && to && from > to ? [to, from] : [from, to];

    return branches.dailyRows.filter((row) => {
      if (start && row.fecha < start) return false;
      if (end && row.fecha > end) return false;
      return true;
    });
  }, [branches.dailyRows, dateBounds.max, dateBounds.min, dateFrom, dateTo]);

  const comparisonYears = useMemo(
    () => Array.from(new Set(filteredRows.map((row) => getDateYear(row.fecha)))).sort((a, b) => Number(a) - Number(b)),
    [filteredRows],
  );
  const kpis = useMemo(() => buildKpis(filteredRows), [filteredRows]);
  const ranking = useMemo(() => buildRanking(filteredRows), [filteredRows]);
  const dailyTrend = useMemo(() => buildDailyTrend(filteredRows), [filteredRows]);
  const monthlyTrend = useMemo(() => buildMonthlyTrend(filteredRows), [filteredRows]);

  return (
    <section id="sucursales" className="space-y-4 scroll-mt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle
          eyebrow="Sucursales"
          title="Rendimiento por sede"
          description="Comparativo de ventas, ticket, volumen y variedad entre sucursales."
        />
        <div className="grid gap-3 rounded-2xl border bg-card p-3 sm:grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_auto] sm:items-end">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground" htmlFor="branches-date-from">
              Fecha desde
            </label>
            <input
              id="branches-date-from"
              type="date"
              min={dateBounds.min}
              max={dateBounds.max}
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-10 rounded-lg border border-border bg-input px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground" htmlFor="branches-date-to">
              Fecha hasta
            </label>
            <input
              id="branches-date-to"
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard title="Ventas sucursales" value={formatCurrency(kpis.totalSales)} helper="Suma de ventas visibles en el subrango." />
        <KpiCard title="Sucursales activas" value={formatNumber(kpis.activeBranches)} helper="Sedes con datos para este corte." />
        <KpiCard title="SKUs por día" value={formatNumber(kpis.averageProductsPerDay)} helper="Promedio de variedad diaria visible." />
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
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

      <Card>
        <CardHeader><CardTitle>Ranking de sucursales</CardTitle></CardHeader>
        <CardContent className="grid gap-3 xl:grid-cols-2">
          {ranking.length ? (
            ranking.slice(0, 8).map((branch) => (
              <div key={`${branch.branchId}-${branch.branch}`} className="rounded-2xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{branch.branch}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatNumber(branch.units)} unidades · {formatNumber(branch.operations)} operaciones
                    </p>
                  </div>
                  <div className="grid gap-1 text-right sm:grid-cols-3 sm:gap-6">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Ventas</p>
                      <p className="font-semibold">{formatCurrency(branch.sales)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Ticket</p>
                      <p className="font-semibold">{formatCurrency(branch.averageTicket)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">SKUs</p>
                      <p className="font-semibold">{formatNumber(branch.averageProducts)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No hay sucursales visibles con este subrango.</p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

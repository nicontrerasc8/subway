"use client";

import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { DashboardOverviewData, DashboardOverviewKpis } from "@/modules/dashboard/services/dashboard-overview";

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

function buildKpis(rows: DashboardOverviewData["dailyRows"]): DashboardOverviewKpis {
  const totalSales = rows.reduce((sum, row) => sum + row.sales, 0);
  const totalUnits = rows.reduce((sum, row) => sum + row.units, 0);
  const totalOperations = rows.reduce((sum, row) => sum + row.operations, 0);
  const totalProducts = rows.reduce((sum, row) => sum + row.products, 0);
  const totalPaymentAmount = rows.reduce((sum, row) => sum + row.paymentAmount, 0);
  const reconciliationDelta = rows.reduce((sum, row) => sum + row.reconciliationDelta, 0);

  return {
    totalSales,
    totalUnits,
    totalOperations,
    averageTicket: totalOperations > 0 ? totalPaymentAmount / totalOperations : 0,
    averageDailyProducts: rows.length > 0 ? totalProducts / rows.length : 0,
    reconciliationDelta,
  };
}

export function DashboardSummarySection({ overview }: { overview: DashboardOverviewData }) {
  const dateBounds = useMemo(() => {
    const dates = overview.dailyRows.map((row) => row.fecha).sort((a, b) => a.localeCompare(b));
    return {
      min: dates[0] ?? "",
      max: dates.at(-1) ?? "",
    };
  }, [overview.dailyRows]);
  const [dateFrom, setDateFrom] = useState(dateBounds.min);
  const [dateTo, setDateTo] = useState(dateBounds.max);

  const filteredRows = useMemo(() => {
    const from = dateFrom || dateBounds.min;
    const to = dateTo || dateBounds.max;
    const [start, end] = from && to && from > to ? [to, from] : [from, to];

    return overview.dailyRows.filter((row) => {
      if (start && row.fecha < start) return false;
      if (end && row.fecha > end) return false;
      return true;
    });
  }, [dateBounds.max, dateBounds.min, dateFrom, dateTo, overview.dailyRows]);
  const kpis = useMemo(() => buildKpis(filteredRows), [filteredRows]);

  return (
    <section id="resumen" className="space-y-4 scroll-mt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle
          eyebrow="Inicio"
          title="Resumen ejecutivo"
          description="Indicadores principales de venta, volumen, ticket y cuadre para el periodo filtrado."
        />
        <div className="grid gap-3 rounded-2xl border bg-card p-3 sm:grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_auto] sm:items-end">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground" htmlFor="summary-date-from">
              Fecha desde
            </label>
            <input
              id="summary-date-from"
              type="date"
              min={dateBounds.min}
              max={dateBounds.max}
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-10 rounded-lg border border-border bg-input px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground" htmlFor="summary-date-to">
              Fecha hasta
            </label>
            <input
              id="summary-date-to"
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
        <KpiCard title="Ventas totales" value={formatCurrency(kpis.totalSales)} helper="Acumulado visible para el subrango activo." />
        <KpiCard title="Unidades" value={formatNumber(kpis.totalUnits)} helper="Volumen total vendido." />
        <KpiCard title="Operaciones" value={formatNumber(kpis.totalOperations)} helper="Total de operaciones registradas." />
        <KpiCard title="Ticket promedio" value={formatCurrency(kpis.averageTicket)} helper="Importe total entre operaciones." />
        <KpiCard title="Productos por día" value={formatNumber(kpis.averageDailyProducts)} helper="Promedio de SKUs visibles por día." />
        <KpiCard title="Diferencia de cuadre" value={formatCurrency(kpis.reconciliationDelta)} helper="Suma de diferencias productos vs pagos." />
      </div>
    </section>
  );
}

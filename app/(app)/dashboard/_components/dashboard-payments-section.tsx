"use client";

import { useMemo, useState } from "react";

import { DashboardBranchesMetricView, DashboardMixChart } from "@/app/(app)/dashboard/_components/dashboard-overview-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type {
  DashboardPaymentMethodDailyPoint,
  DashboardPaymentMethodPoint,
  DashboardPaymentsBranchPoint,
  DashboardPaymentsChartPoint,
  DashboardPaymentsData,
  DashboardPaymentsKpis,
  DashboardPaymentTicketDailyPoint,
} from "@/modules/dashboard/services/dashboard-payments";

const MIX_DOT_COLORS = ["#3b6ea8", "#7b61a8", "#2f8f83", "#c07a43", "#b85778", "#5f7f52", "#7a8ea6", "#9a6f4f"];

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

function buildKpis(
  ticketRows: DashboardPaymentTicketDailyPoint[],
  paymentRows: DashboardPaymentMethodDailyPoint[],
): DashboardPaymentsKpis {
  const totalAmount = ticketRows.reduce((sum, row) => sum + row.amount, 0);
  const totalOperations = ticketRows.reduce((sum, row) => sum + row.operations, 0);
  const activeBranches = new Set(ticketRows.map((row) => String(row.branchId ?? row.branch))).size;
  const activeMethods = new Set(paymentRows.map((row) => row.method)).size;

  return {
    totalAmount,
    totalOperations,
    averageTicket: totalOperations > 0 ? totalAmount / totalOperations : 0,
    activeBranches,
    activeMethods,
  };
}

function buildPaymentsByBranch(rows: DashboardPaymentTicketDailyPoint[]): DashboardPaymentsBranchPoint[] {
  return Array.from(
    rows.reduce((map, row) => {
      const key = String(row.branchId ?? row.branch);
      const current = map.get(key) ?? {
        branchId: row.branchId,
        branch: row.branch,
        amount: 0,
        operations: 0,
        averageTicket: 0,
      };
      current.amount += row.amount;
      current.operations += row.operations;
      current.averageTicket = current.operations > 0 ? current.amount / current.operations : 0;
      map.set(key, current);
      return map;
    }, new Map<string, DashboardPaymentsBranchPoint>()),
  )
    .map(([, value]) => value)
    .sort((a, b) => b.amount - a.amount);
}

function buildPaymentMix(rows: DashboardPaymentMethodDailyPoint[]): DashboardPaymentMethodPoint[] {
  return Array.from(
    rows.reduce((map, row) => {
      map.set(row.method, (map.get(row.method) ?? 0) + row.amount);
      return map;
    }, new Map<string, number>()),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }));
}

function buildTicketTrend(rows: DashboardPaymentTicketDailyPoint[]) {
  return Array.from(
    rows.reduce((map, row) => {
      const year = getDateYear(row.fecha);
      const dayKey = getDayComparisonKey(row.fecha);
      const current = map.get(dayKey.key) ?? { label: dayKey.label };
      const amountKey = `${year}__amount`;
      const operationsKey = `${year}__operations`;
      current[amountKey] = Number(current[amountKey] ?? 0) + row.amount;
      current[operationsKey] = Number(current[operationsKey] ?? 0) + row.operations;
      current[year] = Number(current[operationsKey] ?? 0) > 0 ? Number(current[amountKey] ?? 0) / Number(current[operationsKey]) : 0;
      map.set(dayKey.key, current);
      return map;
    }, new Map<string, DashboardPaymentsChartPoint>()),
  )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, value]) => value);
}

function buildAmountTrend(rows: DashboardPaymentTicketDailyPoint[]) {
  return Array.from(
    rows.reduce((map, row) => {
      const year = getDateYear(row.fecha);
      const dayKey = getDayComparisonKey(row.fecha);
      const entry = map.get(dayKey.key) ?? { label: dayKey.label };
      entry[year] = Number(entry[year] ?? 0) + row.amount;
      map.set(dayKey.key, entry);
      return map;
    }, new Map<string, DashboardPaymentsChartPoint>()),
  )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, value]) => value);
}

export function DashboardPaymentsSection({ payments }: { payments: DashboardPaymentsData }) {
  const dateBounds = useMemo(() => {
    const dates = payments.ticketDailyRows.map((row) => row.fecha).sort((a, b) => a.localeCompare(b));
    return {
      min: dates[0] ?? "",
      max: dates.at(-1) ?? "",
    };
  }, [payments.ticketDailyRows]);
  const [dateFrom, setDateFrom] = useState(dateBounds.min);
  const [dateTo, setDateTo] = useState(dateBounds.max);

  const filteredTicketRows = useMemo(() => {
    const from = dateFrom || dateBounds.min;
    const to = dateTo || dateBounds.max;
    const [start, end] = from && to && from > to ? [to, from] : [from, to];

    return payments.ticketDailyRows.filter((row) => {
      if (start && row.fecha < start) return false;
      if (end && row.fecha > end) return false;
      return true;
    });
  }, [dateBounds.max, dateBounds.min, dateFrom, dateTo, payments.ticketDailyRows]);
  const filteredPaymentRows = useMemo(() => {
    const from = dateFrom || dateBounds.min;
    const to = dateTo || dateBounds.max;
    const [start, end] = from && to && from > to ? [to, from] : [from, to];

    return payments.paymentDailyRows.filter((row) => {
      if (start && row.fecha < start) return false;
      if (end && row.fecha > end) return false;
      return true;
    });
  }, [dateBounds.max, dateBounds.min, dateFrom, dateTo, payments.paymentDailyRows]);
  const comparisonYears = useMemo(
    () => Array.from(new Set(filteredTicketRows.map((row) => getDateYear(row.fecha)))).sort((a, b) => Number(a) - Number(b)),
    [filteredTicketRows],
  );
  const kpis = useMemo(() => buildKpis(filteredTicketRows, filteredPaymentRows), [filteredPaymentRows, filteredTicketRows]);
  const ticketTrend = useMemo(() => buildTicketTrend(filteredTicketRows), [filteredTicketRows]);
  const amountTrend = useMemo(() => buildAmountTrend(filteredTicketRows), [filteredTicketRows]);
  const paymentMix = useMemo(() => buildPaymentMix(filteredPaymentRows), [filteredPaymentRows]);
  const paymentsByBranch = useMemo(() => buildPaymentsByBranch(filteredTicketRows), [filteredTicketRows]);

  return (
    <section id="pagos" className="space-y-4 scroll-mt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle
          eyebrow="Pagos"
          title="Medios de pago y ticket"
          description="Importe cobrado, operaciones, ticket promedio y mix de formas de pago."
        />
        <div className="grid gap-3 rounded-2xl border bg-card p-3 sm:grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_auto] sm:items-end">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground" htmlFor="payments-date-from">
              Fecha desde
            </label>
            <input
              id="payments-date-from"
              type="date"
              min={dateBounds.min}
              max={dateBounds.max}
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-10 rounded-lg border border-border bg-input px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground" htmlFor="payments-date-to">
              Fecha hasta
            </label>
            <input
              id="payments-date-to"
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard title="Importe total" value={formatCurrency(kpis.totalAmount)} helper="Total cobrado en el subrango." />
        <KpiCard title="Operaciones" value={formatNumber(kpis.totalOperations)} helper="Operaciones registradas." />
        <KpiCard title="Ticket promedio" value={formatCurrency(kpis.averageTicket)} helper="Importe medio por operación." />
        <KpiCard title="Sucursales activas" value={formatNumber(kpis.activeBranches)} helper="Sedes con pagos." />
        <KpiCard title="Medios visibles" value={formatNumber(kpis.activeMethods)} helper="Formas de pago presentes." />
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ticket por año</CardTitle>
            <p className="text-sm text-muted-foreground">Compara el ticket promedio del mismo día y mes entre años para el subrango.</p>
          </CardHeader>
          <CardContent>
            <DashboardBranchesMetricView data={ticketTrend} keys={comparisonYears} chart="line" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Importe diario por año</CardTitle>
            <p className="text-sm text-muted-foreground">Cada color representa el importe cobrado por año dentro del subrango.</p>
          </CardHeader>
          <CardContent>
            <DashboardBranchesMetricView data={amountTrend} keys={comparisonYears} chart="line" />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card className="min-w-0">
          <CardHeader><CardTitle>Mix de medios de pago</CardTitle></CardHeader>
          <CardContent className="grid gap-4 2xl:grid-cols-[260px_minmax(0,1fr)] 2xl:items-center">
            <DashboardMixChart data={paymentMix} />
            <div className="grid min-w-0 gap-2">
              {paymentMix.map((item, index) => (
                <div key={item.label} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: MIX_DOT_COLORS[index % MIX_DOT_COLORS.length] }} />
                    <span className="truncate text-sm">{item.label}</span>
                  </div>
                  <span className="shrink-0 text-sm font-medium">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Ranking de sucursales por pagos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {paymentsByBranch.slice(0, 8).map((branch) => (
              <div key={`${branch.branchId}-${branch.branch}`} className="rounded-2xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{branch.branch}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatNumber(branch.operations)} operaciones registradas
                    </p>
                  </div>
                  <div className="grid gap-1 text-right sm:grid-cols-2 sm:gap-6">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Importe</p>
                      <p className="font-semibold">{formatCurrency(branch.amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Ticket</p>
                      <p className="font-semibold">{formatCurrency(branch.averageTicket)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </section>
  );
}

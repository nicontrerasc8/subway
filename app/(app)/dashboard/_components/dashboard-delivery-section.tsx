"use client";

import { useMemo, useState } from "react";

import { DashboardBranchesMetricView } from "@/app/(app)/dashboard/_components/dashboard-overview-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { normalizeText } from "@/modules/dashboard/lib/subway-product-category";
import type {
  DashboardPaymentMethodDailyPoint,
  DashboardPaymentTicketDailyPoint,
  DashboardPaymentsChartPoint,
  DashboardPaymentsData,
} from "@/modules/dashboard/services/dashboard-payments";

type DeliveryTotals = {
  sales: number;
  transactions: number;
};

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

function getDeliveryPlatform(value: string) {
  const normalized = normalizeText(value);
  if (normalized.includes("PEYA") || normalized.includes("PEDIDOS")) return "Peya";
  if (normalized.includes("RAPPI")) return "Rappi";
  if (normalized.includes("TURBO")) return "Turbo";
  if (normalized.includes("DIDI")) return "Didi";
  return null;
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("es-PE", {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(value);
}

function formatDeltaPercent(current: number, previous: number) {
  if (previous === 0) return current === 0 ? "0%" : "Sin base";
  return formatPercent((current - previous) / previous);
}

function getComparisonYears(rows: Array<{ fecha: string }>) {
  const years = Array.from(new Set(rows.map((row) => getDateYear(row.fecha)))).sort((a, b) => Number(a) - Number(b));
  const currentYear = years.at(-1) ?? null;
  const previousYear =
    currentYear && years.includes(String(Number(currentYear) - 1))
      ? String(Number(currentYear) - 1)
      : years.at(-2) ?? null;

  return {
    currentYear,
    previousYear,
    yearKeys: [previousYear, currentYear].filter(Boolean) as string[],
  };
}

function buildTotalsByYear(rows: DashboardPaymentTicketDailyPoint[]) {
  return rows.reduce((map, row) => {
    const year = getDateYear(row.fecha);
    const current = map.get(year) ?? { sales: 0, transactions: 0 };
    current.sales += row.amount;
    current.transactions += row.operations;
    map.set(year, current);
    return map;
  }, new Map<string, DeliveryTotals>());
}

function buildDeliveryByYear(rows: DashboardPaymentMethodDailyPoint[]) {
  return rows.reduce((map, row) => {
    const platform = getDeliveryPlatform(row.method);
    if (!platform) return map;

    const year = getDateYear(row.fecha);
    const current = map.get(year) ?? { sales: 0, transactions: 0 };
    current.sales += row.amount;
    current.transactions += row.operations;
    map.set(year, current);
    return map;
  }, new Map<string, DeliveryTotals>());
}

function buildDeliveryByPlatform(rows: DashboardPaymentMethodDailyPoint[]) {
  const byPlatform = new Map<string, Record<string, DeliveryTotals>>();

  for (const row of rows) {
    const platform = getDeliveryPlatform(row.method);
    if (!platform) continue;

    const year = getDateYear(row.fecha);
    const current = byPlatform.get(platform) ?? {};
    current[year] = current[year] ?? { sales: 0, transactions: 0 };
    current[year].sales += row.amount;
    current[year].transactions += row.operations;
    byPlatform.set(platform, current);
  }

  return byPlatform;
}

function getPlatformKeys(byPlatform: Map<string, Record<string, DeliveryTotals>>, yearKeys: string[]) {
  const preferredOrder = ["Peya", "Rappi", "Turbo", "Didi"];
  return Array.from(byPlatform.keys()).sort((a, b) => {
    const aIndex = preferredOrder.indexOf(a);
    const bIndex = preferredOrder.indexOf(b);
    if (aIndex !== -1 || bIndex !== -1) {
      return (aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex) - (bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex);
    }

    const aTotal = yearKeys.reduce((sum, year) => sum + (byPlatform.get(a)?.[year]?.sales ?? 0), 0);
    const bTotal = yearKeys.reduce((sum, year) => sum + (byPlatform.get(b)?.[year]?.sales ?? 0), 0);
    return bTotal - aTotal;
  });
}

function buildPlatformChart(
  platforms: string[],
  yearKeys: string[],
  byPlatform: Map<string, Record<string, DeliveryTotals>>,
  metric: "sales" | "transactions" | "ticket",
): DashboardPaymentsChartPoint[] {
  return platforms.map((platform) => {
    const byYear = byPlatform.get(platform) ?? {};

    return yearKeys.reduce<DashboardPaymentsChartPoint>(
      (point, year) => {
        const values = byYear[year] ?? { sales: 0, transactions: 0 };
        point[year] =
          metric === "ticket"
            ? values.transactions > 0
              ? values.sales / values.transactions
              : 0
            : values[metric];
        return point;
      },
      { label: platform },
    );
  });
}

export function DashboardDeliverySection({ payments }: { payments: DashboardPaymentsData }) {
  const dateBounds = useMemo(() => {
    const dates = payments.paymentDailyRows.map((row) => row.fecha).sort((a, b) => a.localeCompare(b));
    return {
      min: dates[0] ?? "",
      max: dates.at(-1) ?? "",
    };
  }, [payments.paymentDailyRows]);
  const [dateFrom, setDateFrom] = useState(dateBounds.min);
  const [dateTo, setDateTo] = useState(dateBounds.max);

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

  const { currentYear, previousYear, yearKeys } = useMemo(() => getComparisonYears(filteredPaymentRows), [filteredPaymentRows]);
  const totalsByYear = useMemo(() => buildTotalsByYear(filteredTicketRows), [filteredTicketRows]);
  const deliveryByYear = useMemo(() => buildDeliveryByYear(filteredPaymentRows), [filteredPaymentRows]);
  const byPlatform = useMemo(() => buildDeliveryByPlatform(filteredPaymentRows), [filteredPaymentRows]);
  const platformKeys = useMemo(() => getPlatformKeys(byPlatform, yearKeys), [byPlatform, yearKeys]);
  const deliverySalesByPlatform = useMemo(
    () => buildPlatformChart(platformKeys, yearKeys, byPlatform, "sales"),
    [byPlatform, platformKeys, yearKeys],
  );
  const deliveryTransactionsByPlatform = useMemo(
    () => buildPlatformChart(platformKeys, yearKeys, byPlatform, "transactions"),
    [byPlatform, platformKeys, yearKeys],
  );
  const deliveryTicketByPlatform = useMemo(
    () => buildPlatformChart(platformKeys, yearKeys, byPlatform, "ticket"),
    [byPlatform, platformKeys, yearKeys],
  );

  const currentDelivery = currentYear ? deliveryByYear.get(currentYear) ?? { sales: 0, transactions: 0 } : { sales: 0, transactions: 0 };
  const previousDelivery = previousYear ? deliveryByYear.get(previousYear) ?? { sales: 0, transactions: 0 } : { sales: 0, transactions: 0 };
  const currentTotal = currentYear ? totalsByYear.get(currentYear) ?? { sales: 0, transactions: 0 } : { sales: 0, transactions: 0 };
  const previousTotal = previousYear ? totalsByYear.get(previousYear) ?? { sales: 0, transactions: 0 } : { sales: 0, transactions: 0 };
  const currentTicket = currentDelivery.transactions > 0 ? currentDelivery.sales / currentDelivery.transactions : 0;
  const previousTicket = previousDelivery.transactions > 0 ? previousDelivery.sales / previousDelivery.transactions : 0;

  return (
    <section id="delivery" className="space-y-4 scroll-mt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle
          eyebrow="Delivery"
          title="Comparativo anual por app"
          description={`Ventas, transacciones y ticket promedio de las apps presentes entre ${previousYear ?? "AA"} y ${currentYear ?? "actual"}.`}
        />
        <div className="grid gap-3 rounded-2xl border bg-card p-3 sm:grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_auto] sm:items-end">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground" htmlFor="delivery-date-from">
              Fecha desde
            </label>
            <input
              id="delivery-date-from"
              type="date"
              min={dateBounds.min}
              max={dateBounds.max}
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-10 rounded-lg border border-border bg-input px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground" htmlFor="delivery-date-to">
              Fecha hasta
            </label>
            <input
              id="delivery-date-to"
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
        <KpiCard
          title="Venta delivery"
          value={formatCurrency(currentDelivery.sales)}
          helper={`${formatDeltaPercent(currentDelivery.sales, previousDelivery.sales)} vs ${previousYear ?? "AA"}.`}
        />
        <KpiCard
          title="Txs delivery"
          value={formatNumber(currentDelivery.transactions)}
          helper={`${formatDeltaPercent(currentDelivery.transactions, previousDelivery.transactions)} vs ${previousYear ?? "AA"}.`}
        />
        <KpiCard
          title="Ticket delivery"
          value={formatCurrency(currentTicket)}
          helper={`${formatDeltaPercent(currentTicket, previousTicket)} vs ${previousYear ?? "AA"}.`}
        />
        <KpiCard
          title="Peso delivery"
          value={formatPercent(currentTotal.sales > 0 ? currentDelivery.sales / currentTotal.sales : 0)}
          helper={`Antes: ${formatPercent(previousTotal.sales > 0 ? previousDelivery.sales / previousTotal.sales : 0)} de la venta.`}
        />
        <KpiCard
          title="Base comparativa"
          value={currentYear ?? "-"}
          helper={`Contra ${previousYear ?? "sin año anterior"} en el subrango.`}
        />
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Venta por app</CardTitle>
            <p className="text-sm text-muted-foreground">Apps presentes en pagos comparadas año contra año.</p>
          </CardHeader>
          <CardContent>
            <DashboardBranchesMetricView data={deliverySalesByPlatform} keys={yearKeys} chart="bar" labelHeader="App" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Transacciones por app</CardTitle>
            <p className="text-sm text-muted-foreground">Volumen de pedidos por plataforma para detectar crecimiento real.</p>
          </CardHeader>
          <CardContent>
            <DashboardBranchesMetricView data={deliveryTransactionsByPlatform} keys={yearKeys} chart="bar" valueFormat="number" labelHeader="App" />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Ticket promedio por app</CardTitle>
          <p className="text-sm text-muted-foreground">Importe promedio por transacción en cada plataforma.</p>
        </CardHeader>
        <CardContent>
          <DashboardBranchesMetricView data={deliveryTicketByPlatform} keys={yearKeys} chart="bar" labelHeader="App" />
        </CardContent>
      </Card>
    </section>
  );
}

import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency, formatDateOnly, formatNumber } from "@/lib/utils";
import { DashboardDailySalesChart, DashboardSimpleBarChart } from "@/app/(app)/dashboard/_components/dashboard-overview-charts";
import { getDashboardAudit, type DashboardAuditSearchParams } from "@/modules/dashboard/services/dashboard-audit";

type PageProps = {
  searchParams: Promise<DashboardAuditSearchParams>;
};

function buildHref(
  current: { year: string | null; month: string | null },
  patch: Partial<{ year: string | null; month: string | null }>,
) {
  const params = new URLSearchParams();
  const next = { ...current, ...patch };

  if (next.year) params.set("year", next.year);
  if (next.month) params.set("month", next.month);

  const query = params.toString();
  return query ? `/dashboard/subway/auditoria?${query}` : "/dashboard/subway/auditoria";
}

function FilterChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

export default async function SubwayAuditPage({ searchParams }: PageProps) {
  const dashboard = await getDashboardAudit(await searchParams);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-border bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,194,10,0.18),transparent_30%),linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Auditoria</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-foreground">Control de calidad y descuadre por import</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Vista enfocada en diferencias entre productos y pagos, con alertas por sucursal e importacion.</p>
        <div className="mt-5 inline-flex rounded-full border border-border bg-background/80 px-4 py-2 text-sm text-muted-foreground">{dashboard.activePeriodLabel}</div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Ano</p>
              <div className="flex flex-wrap gap-2">
                {dashboard.availableYears.map((year) => <FilterChip key={year} href={buildHref(dashboard.filters, { year, month: null })} active={dashboard.filters.year === year} label={year} />)}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Mes</p>
              <div className="flex flex-wrap gap-2">
                <FilterChip href={buildHref(dashboard.filters, { month: null })} active={dashboard.filters.month === null} label="Todos" />
                {dashboard.availableMonths.map((month) => <FilterChip key={month} href={buildHref(dashboard.filters, { month })} active={dashboard.filters.month === month} label={month} />)}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:col-span-2 xl:grid-cols-3">
          <Card><CardHeader><CardTitle>Imports</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{formatNumber(dashboard.kpis.totalImports)}</p><p className="mt-2 text-sm text-muted-foreground">Lotes visibles.</p></CardContent></Card>
          <Card><CardHeader><CardTitle>Cuadrados</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{formatNumber(dashboard.kpis.balancedImports)}</p><p className="mt-2 text-sm text-muted-foreground">Con diferencia cercana a cero.</p></CardContent></Card>
          <Card><CardHeader><CardTitle>Con delta</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{formatNumber(dashboard.kpis.importsWithDelta)}</p><p className="mt-2 text-sm text-muted-foreground">Requieren revision.</p></CardContent></Card>
          <Card><CardHeader><CardTitle>Total productos</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{formatCurrency(dashboard.kpis.totalProducts)}</p></CardContent></Card>
          <Card><CardHeader><CardTitle>Total pagos</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{formatCurrency(dashboard.kpis.totalPayments)}</p></CardContent></Card>
          <Card><CardHeader><CardTitle>Delta acumulado</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{formatCurrency(dashboard.kpis.totalDelta)}</p></CardContent></Card>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card><CardHeader><CardTitle>Tendencia del delta</CardTitle></CardHeader><CardContent><DashboardDailySalesChart data={dashboard.deltaTrend} /></CardContent></Card>
        <Card><CardHeader><CardTitle>Delta por sucursal</CardTitle></CardHeader><CardContent><DashboardSimpleBarChart data={dashboard.deltasByBranch} /></CardContent></Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Mayores diferencias</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {dashboard.largestDeltas.map((item) => (
              <div key={item.importId} className="rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{item.sucursal}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{formatDateOnly(item.fecha)} · {item.sourceKey ?? "sin origen"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(item.diferencia)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Ops {formatNumber(item.totalOperaciones)}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Imports recientes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {dashboard.recentImports.map((item) => (
              <div key={`${item.importId}-recent`} className="rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{item.sucursal}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{formatDateOnly(item.fecha)} · {item.sourceKey ?? "sin origen"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(item.totalProductos)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Pagos {formatCurrency(item.totalPagos)}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

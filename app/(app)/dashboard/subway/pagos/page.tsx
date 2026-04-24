import { DashboardRangeFilterForm } from "@/app/(app)/dashboard/_components/dashboard-range-filter-form";
import {
  DashboardBranchesMetricView,
  DashboardMixChart,
} from "@/app/(app)/dashboard/_components/dashboard-overview-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { getDashboardPayments, type DashboardPaymentsSearchParams } from "@/modules/dashboard/services/dashboard-payments";

type PageProps = {
  searchParams: Promise<DashboardPaymentsSearchParams>;
};

export default async function SubwayPaymentsPage({ searchParams }: PageProps) {
  const dashboard = await getDashboardPayments(await searchParams);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-border bg-[radial-gradient(circle_at_top_left,rgba(255,194,10,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(239,68,68,0.16),transparent_30%),linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Pagos y ticket</p>
        <h1 className="mt-2 max-w-3xl text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">
          Medios de pago, ticket promedio y tracción por sucursal
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Esta vista trabaja sobre pagos consolidados y sirve para comparar ticket promedio, importe total y mix de medios de pago.
        </p>
        <div className="mt-4 inline-flex rounded-full border border-border bg-background/80 px-3.5 py-1.5 text-sm text-muted-foreground">
          {dashboard.activePeriodLabel}
        </div>
      </section>

      <Card>
        <CardHeader className="pb-4"><CardTitle>Filtros</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <DashboardRangeFilterForm
            action="/dashboard/subway/pagos"
            filters={dashboard.filters}
            availableYears={dashboard.availableYears}
            branch={dashboard.filters.branch}
            branches={dashboard.availableBranches}
            layout="inline"
          />
        </CardContent>
      </Card>

      <section>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader><CardTitle>Importe total</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatCurrency(dashboard.kpis.totalAmount)}</p>
              <p className="mt-2 text-sm text-muted-foreground">Total cobrado en el periodo.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Operaciones</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatNumber(dashboard.kpis.totalOperations)}</p>
              <p className="mt-2 text-sm text-muted-foreground">Cantidad de operaciones registradas.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Ticket promedio</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatCurrency(dashboard.kpis.averageTicket)}</p>
              <p className="mt-2 text-sm text-muted-foreground">Importe medio por operación.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Sucursales activas</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatNumber(dashboard.kpis.activeBranches)}</p>
              <p className="mt-2 text-sm text-muted-foreground">Sedes con movimiento en pagos.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Medios visibles</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatNumber(dashboard.kpis.activeMethods)}</p>
              <p className="mt-2 text-sm text-muted-foreground">Formas de pago presentes en el corte.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ticket por año</CardTitle>
            <p className="text-sm text-muted-foreground">Compara el ticket promedio del mismo día y mes entre años para la sucursal filtrada.</p>
          </CardHeader>
          <CardContent>
            <DashboardBranchesMetricView
              data={dashboard.ticketTrend}
              keys={dashboard.branchKeys}
              chart="line"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Importe diario por año</CardTitle>
            <p className="text-sm text-muted-foreground">Cada color representa el importe cobrado por año según la sucursal filtrada.</p>
          </CardHeader>
          <CardContent>
            <DashboardBranchesMetricView
              data={dashboard.amountTrend}
              keys={dashboard.branchKeys}
              chart="bar"
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader><CardTitle>Mix de medios de pago</CardTitle></CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-[220px_1fr] lg:items-center">
            <DashboardMixChart data={dashboard.paymentMix} />
            <div className="space-y-2">
              {dashboard.paymentMix.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2">
                  <span className="text-sm">{item.label}</span>
                  <span className="text-sm font-medium">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Ranking de sucursales por pagos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {dashboard.paymentsByBranch.length ? (
              dashboard.paymentsByBranch.map((branch) => (
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
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No hay pagos visibles con estos filtros.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

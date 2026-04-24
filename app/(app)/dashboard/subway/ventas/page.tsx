import { DashboardRangeFilterForm } from "@/app/(app)/dashboard/_components/dashboard-range-filter-form";
import { DashboardBranchesMultiBarChart, DashboardBranchesMultiLineChart } from "@/app/(app)/dashboard/_components/dashboard-overview-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { getDashboardBranches, type DashboardBranchesSearchParams } from "@/modules/dashboard/services/dashboard-branches";

type PageProps = {
  searchParams: Promise<DashboardBranchesSearchParams>;
};

export default async function SubwaySalesPage({ searchParams }: PageProps) {
  const dashboard = await getDashboardBranches(await searchParams);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-border bg-[radial-gradient(circle_at_top_left,rgba(0,137,56,0.2),transparent_28%),radial-gradient(circle_at_top_right,rgba(37,99,235,0.16),transparent_30%),linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Comparativo entre sucursales</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-foreground">
          Rendimiento comercial, ticket y volumen por sede
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Esta vista compara sucursales sobre la capa diaria consolidada, enfocada en ventas, operaciones y variedad de surtido.
        </p>
        <div className="mt-5 inline-flex rounded-full border border-border bg-background/80 px-4 py-2 text-sm text-muted-foreground">
          {dashboard.activePeriodLabel}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <DashboardRangeFilterForm
              action="/dashboard/subway/ventas"
              filters={dashboard.filters}
              availableYears={dashboard.availableYears}
              branch={dashboard.filters.branch}
              branches={dashboard.availableBranches}
            />
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:col-span-2 xl:grid-cols-3">
          <Card>
            <CardHeader><CardTitle>Ventas totales</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{formatCurrency(dashboard.kpis.totalSales)}</p>
              <p className="mt-2 text-sm text-muted-foreground">Suma de ventas visibles en el comparativo.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Operaciones</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{formatNumber(dashboard.kpis.totalOperations)}</p>
              <p className="mt-2 text-sm text-muted-foreground">Operaciones registradas en el periodo.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Ticket promedio</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{formatCurrency(dashboard.kpis.averageTicket)}</p>
              <p className="mt-2 text-sm text-muted-foreground">Promedio global por operación.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Unidades</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{formatNumber(dashboard.kpis.totalUnits)}</p>
              <p className="mt-2 text-sm text-muted-foreground">Volumen agregado vendido.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Sucursales activas</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{formatNumber(dashboard.kpis.activeBranches)}</p>
              <p className="mt-2 text-sm text-muted-foreground">Sedes con datos para este corte.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Productos por día</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{formatNumber(dashboard.kpis.averageProductsPerDay)}</p>
              <p className="mt-2 text-sm text-muted-foreground">Promedio de variedad diaria visible.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tendencia diaria por año</CardTitle>
            <p className="text-sm text-muted-foreground">Compara el mismo día y mes entre los años del rango.</p>
          </CardHeader>
          <CardContent>
            <DashboardBranchesMultiLineChart data={dashboard.dailyTrend} keys={dashboard.branchKeys} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Acumulado mensual por año</CardTitle>
            <p className="text-sm text-muted-foreground">Cada color representa un año dentro del rango filtrado.</p>
          </CardHeader>
          <CardContent>
            <DashboardBranchesMultiBarChart data={dashboard.monthlyTrend} keys={dashboard.branchKeys} />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Ranking de sucursales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dashboard.branchRanking.length ? (
            dashboard.branchRanking.map((branch) => (
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
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">SKUs por día</p>
                      <p className="font-semibold">{formatNumber(branch.averageProducts)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No hay sucursales visibles con estos filtros.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

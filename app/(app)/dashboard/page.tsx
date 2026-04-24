import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  DashboardBranchesMultiBarChart,
  DashboardDailySalesChart,
  DashboardMixChart,
  DashboardMonthlySalesChart,
} from "@/app/(app)/dashboard/_components/dashboard-overview-charts";
import { DashboardRangeFilterForm } from "@/app/(app)/dashboard/_components/dashboard-range-filter-form";
import { getDashboardOverview, type DashboardOverviewSearchParams } from "@/modules/dashboard/services/dashboard-overview";

type DashboardPageProps = {
  searchParams: Promise<DashboardOverviewSearchParams>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = await searchParams;
  const dashboard = await getDashboardOverview(resolvedSearchParams);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-border bg-[radial-gradient(circle_at_top_left,rgba(255,194,10,0.2),transparent_30%),radial-gradient(circle_at_top_right,rgba(0,137,56,0.18),transparent_26%),linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Resumen ejecutivo</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-foreground">
          Ventas, ticket y cuadre por sucursal desde la capa normalizada
        </h1>

        <div className="mt-5 inline-flex rounded-full border border-border bg-background/80 px-4 py-2 text-sm text-muted-foreground">
          {dashboard.activePeriodLabel}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <DashboardRangeFilterForm
              action="/dashboard"
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
              <p className="mt-2 text-sm text-muted-foreground">Acumulado visible para el filtro activo.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Unidades</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{formatNumber(dashboard.kpis.totalUnits)}</p>
              <p className="mt-2 text-sm text-muted-foreground">Volumen total vendido.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Operaciones</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{formatNumber(dashboard.kpis.totalOperations)}</p>
              <p className="mt-2 text-sm text-muted-foreground">Total de operaciones registradas.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Ticket promedio</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{formatCurrency(dashboard.kpis.averageTicket)}</p>
              <p className="mt-2 text-sm text-muted-foreground">Importe total entre operaciones.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Productos por día</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{formatNumber(dashboard.kpis.averageDailyProducts)}</p>
              <p className="mt-2 text-sm text-muted-foreground">Promedio de SKUs visibles por día.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Diferencia de cuadre</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{formatCurrency(dashboard.kpis.reconciliationDelta)}</p>
              <p className="mt-2 text-sm text-muted-foreground">Suma de diferencias productos vs pagos.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tendencia diaria</CardTitle>
            <p className="text-sm text-muted-foreground">Ventas diarias para el filtro activo.</p>
          </CardHeader>
          <CardContent>
            <DashboardDailySalesChart data={dashboard.dailySales} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comparativo mensual</CardTitle>
            <p className="text-sm text-muted-foreground">Compara meses separados por año cuando el rango incluye varios años.</p>
          </CardHeader>
          <CardContent>
            <DashboardMonthlySalesChart data={dashboard.monthlySales} />
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Días por categoría</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ventas diarias abiertas por categoría para comparar días entre los meses y años seleccionados.
            </p>
          </CardHeader>
          <CardContent>
            <DashboardBranchesMultiBarChart
              data={dashboard.dailyCategorySales}
              keys={dashboard.categoryDailyKeys}
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Sucursales líderes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.branchRanking.length ? (
              dashboard.branchRanking.map((branch) => (
                <div key={`${branch.branchId}-${branch.branch}`} className="rounded-2xl border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">{branch.branch}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatNumber(branch.units)} unidades · {formatNumber(branch.operations)} operaciones
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(branch.sales)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Ticket {formatCurrency(branch.averageTicket)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No hay sucursales con informacion para este filtro.</p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Mix por categoría</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 lg:grid-cols-[220px_1fr] lg:items-center">
              <DashboardMixChart data={dashboard.categoryMix} />
              <div className="space-y-2">
                {dashboard.categoryMix.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2">
                    <span className="text-sm">{item.label}</span>
                    <span className="text-sm font-medium">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mix de pagos</CardTitle>
            </CardHeader>
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
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top productos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.topProducts.length ? (
              dashboard.topProducts.map((product) => (
                <div key={product.referencia} className="rounded-2xl border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">{product.producto}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {product.referencia} · {product.categoria}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(product.ventas)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatNumber(product.unidades)} unidades
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No hay productos visibles.</p>
            )}
          </CardContent>
        </Card>

        {/* <Card>
          <CardHeader>
            <CardTitle>Alertas de cuadre</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.reconciliation.length ? (
              dashboard.reconciliation.map((item) => (
                <div key={item.importId} className="rounded-2xl border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">{item.sucursal}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDateOnly(item.fecha)} · {item.sourceKey ?? "sin origen"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(item.diferencia)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Prod. {formatCurrency(item.totalProductos)} / Pagos {formatCurrency(item.totalPagos)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No hay diferencias visibles en los imports filtrados.</p>
            )}
          </CardContent>
        </Card> */}
      </section>
    </div>
  );
}

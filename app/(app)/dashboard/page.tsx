import { DashboardRangeFilterForm } from "@/app/(app)/dashboard/_components/dashboard-range-filter-form";
import {
  DashboardBranchesMetricView,
  DashboardBranchesMultiBarChart,
  DashboardMixChart,
  DashboardProductComparisonView,
  DashboardSimpleBarChart,
} from "@/app/(app)/dashboard/_components/dashboard-overview-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { getDashboardCommercialInsights } from "@/modules/dashboard/services/dashboard-commercial-insights";
import { getDashboardBranches } from "@/modules/dashboard/services/dashboard-branches";
import { getDashboardMix } from "@/modules/dashboard/services/dashboard-mix";
import { getDashboardOverview, type DashboardOverviewSearchParams } from "@/modules/dashboard/services/dashboard-overview";
import { getDashboardPayments } from "@/modules/dashboard/services/dashboard-payments";

type DashboardPageProps = {
  searchParams: Promise<DashboardOverviewSearchParams>;
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

function formatPercent(value: number) {
  return new Intl.NumberFormat("es-PE", {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(value);
}

function formatDeltaPercent(value: number | null) {
  if (value === null) return "Sin base";
  return formatPercent(value);
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = await searchParams;
  const [overview, branches, payments, mix, commercial] = await Promise.all([
    getDashboardOverview(resolvedSearchParams),
    getDashboardBranches(resolvedSearchParams),
    getDashboardPayments(resolvedSearchParams),
    getDashboardMix(resolvedSearchParams),
    getDashboardCommercialInsights(resolvedSearchParams),
  ]);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-border bg-[radial-gradient(circle_at_top_left,rgba(255,194,10,0.2),transparent_30%),radial-gradient(circle_at_top_right,rgba(0,137,56,0.18),transparent_26%),linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Dashboard Subway</p>
        <h1 className="mt-2 max-w-4xl text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">
          Ventas, sucursales, pagos y mix comercial en una sola vista
        </h1>
        <div className="mt-4 inline-flex rounded-full border border-border bg-background/80 px-3.5 py-1.5 text-sm text-muted-foreground">
          {overview.activePeriodLabel}
        </div>
      </section>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <DashboardRangeFilterForm
            action="/dashboard"
            filters={overview.filters}
            availableYears={overview.availableYears}
            branch={overview.filters.branch}
            branches={overview.availableBranches}
            layout="inline"
          />
        </CardContent>
      </Card>



      <Tabs defaultValue="sucursales" className="space-y-5">
        <div className="overflow-x-auto">
          <TabsList className="h-auto min-w-max rounded-2xl p-1.5">
            <TabsTrigger value="sucursales" className="rounded-xl px-4 py-2">
              Sucursales
            </TabsTrigger>
            <TabsTrigger value="pagos" className="rounded-xl px-4 py-2">
              Pagos
            </TabsTrigger>
            <TabsTrigger value="delivery" className="rounded-xl px-4 py-2">
              Delivery AA
            </TabsTrigger>
            <TabsTrigger value="mix" className="rounded-xl px-4 py-2">
              Mix comercial
            </TabsTrigger>
            <TabsTrigger value="familias" className="rounded-xl px-4 py-2">
              Familias
            </TabsTrigger>
            <TabsTrigger value="resumen" className="rounded-xl px-4 py-2">
              Resumen
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="sucursales" className="mt-0">
          <section id="sucursales" className="space-y-4 scroll-mt-6">
            <SectionTitle
              eyebrow="Sucursales"
              title="Rendimiento por sede"
              description="Comparativo de ventas, ticket, volumen y variedad entre sucursales."
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <KpiCard title="Ventas sucursales" value={formatCurrency(branches.kpis.totalSales)} helper="Suma de ventas visibles en el comparativo." />
              <KpiCard title="Sucursales activas" value={formatNumber(branches.kpis.activeBranches)} helper="Sedes con datos para este corte." />
              <KpiCard title="SKUs por día" value={formatNumber(branches.kpis.averageProductsPerDay)} helper="Promedio de variedad diaria visible." />
            </div>

            <section className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Tendencia diaria por año</CardTitle>
                  <p className="text-sm text-muted-foreground">Compara el mismo día y mes entre los años del rango.</p>
                </CardHeader>
                <CardContent>
                  <DashboardBranchesMetricView data={branches.dailyTrend} keys={branches.branchKeys} chart="line" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Acumulado mensual por año</CardTitle>
                  <p className="text-sm text-muted-foreground">Cada color representa un año dentro del rango filtrado.</p>
                </CardHeader>
                <CardContent>
                  <DashboardBranchesMetricView data={branches.monthlyTrend} keys={branches.branchKeys} chart="bar" />
                </CardContent>
              </Card>
            </section>

            <Card>
              <CardHeader><CardTitle>Ranking de sucursales</CardTitle></CardHeader>
              <CardContent className="grid gap-3 xl:grid-cols-2">
                {branches.branchRanking.length ? (
                  branches.branchRanking.slice(0, 8).map((branch) => (
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
                  <p className="text-sm text-muted-foreground">No hay sucursales visibles con estos filtros.</p>
                )}
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        <TabsContent value="pagos" className="mt-0">
          <section id="pagos" className="space-y-4 scroll-mt-6">
            <SectionTitle
              eyebrow="Pagos"
              title="Medios de pago y ticket"
              description="Importe cobrado, operaciones, ticket promedio y mix de formas de pago."
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <KpiCard title="Importe total" value={formatCurrency(payments.kpis.totalAmount)} helper="Total cobrado en el periodo." />
              <KpiCard title="Operaciones" value={formatNumber(payments.kpis.totalOperations)} helper="Operaciones registradas." />
              <KpiCard title="Ticket promedio" value={formatCurrency(payments.kpis.averageTicket)} helper="Importe medio por operación." />
              <KpiCard title="Sucursales activas" value={formatNumber(payments.kpis.activeBranches)} helper="Sedes con pagos." />
              <KpiCard title="Medios visibles" value={formatNumber(payments.kpis.activeMethods)} helper="Formas de pago presentes." />
            </div>

            <section className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Ticket por año</CardTitle>
                  <p className="text-sm text-muted-foreground">Compara el ticket promedio del mismo día y mes entre años para la sucursal filtrada.</p>
                </CardHeader>
                <CardContent>
                  <DashboardBranchesMetricView data={payments.ticketTrend} keys={payments.branchKeys} chart="line" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Importe diario por año</CardTitle>
                  <p className="text-sm text-muted-foreground">Cada color representa el importe cobrado por año según la sucursal filtrada.</p>
                </CardHeader>
                <CardContent>
                  <DashboardBranchesMetricView data={payments.amountTrend} keys={payments.branchKeys} chart="bar" />
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <Card>
                <CardHeader><CardTitle>Mix de medios de pago</CardTitle></CardHeader>
                <CardContent className="grid gap-3 lg:grid-cols-[220px_1fr] lg:items-center">
                  <DashboardMixChart data={payments.paymentMix} />
                  <div className="space-y-2">
                    {payments.paymentMix.map((item) => (
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
                  {payments.paymentsByBranch.slice(0, 8).map((branch) => (
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
        </TabsContent>

        <TabsContent value="delivery" className="mt-0">
          <section id="delivery" className="space-y-4 scroll-mt-6">
            <SectionTitle
              eyebrow="Delivery"
              title="Comparativo anual por app"
              description={`Ventas, transacciones y ticket promedio por plataforma entre ${commercial.previousYear ?? "AA"} y ${commercial.currentYear ?? "actual"}.`}
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <KpiCard
                title="Venta delivery"
                value={formatCurrency(commercial.kpis.deliverySalesCurrent)}
                helper={`${formatDeltaPercent(commercial.kpis.deliverySalesDelta)} vs ${commercial.previousYear ?? "AA"}.`}
              />
              <KpiCard
                title="Txs delivery"
                value={formatNumber(commercial.kpis.deliveryTransactionsCurrent)}
                helper={`${formatDeltaPercent(commercial.kpis.deliveryTransactionsDelta)} vs ${commercial.previousYear ?? "AA"}.`}
              />
              <KpiCard
                title="Ticket delivery"
                value={formatCurrency(commercial.kpis.deliveryTicketCurrent)}
                helper={`${formatDeltaPercent(commercial.kpis.deliveryTicketDelta)} vs ${commercial.previousYear ?? "AA"}.`}
              />
              <KpiCard
                title="Peso delivery"
                value={formatPercent(commercial.kpis.deliveryShareCurrent)}
                helper={`Antes: ${formatPercent(commercial.kpis.deliverySharePrevious)} de la venta.`}
              />
              <KpiCard
                title="Base comparativa"
                value={commercial.currentYear ?? "-"}
                helper={`Contra ${commercial.previousYear ?? "sin año anterior"} con el filtro activo.`}
              />
            </div>

            <section className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Venta por app</CardTitle>
                  <p className="text-sm text-muted-foreground">Peya, Rappi, Turbo y Didi comparadas año contra año.</p>
                </CardHeader>
                <CardContent>
                  <DashboardBranchesMetricView
                    data={commercial.deliverySalesByPlatform}
                    keys={commercial.yearKeys}
                    chart="bar"
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Transacciones por app</CardTitle>
                  <p className="text-sm text-muted-foreground">Volumen de pedidos por plataforma para detectar crecimiento real.</p>
                </CardHeader>
                <CardContent>
                  <DashboardBranchesMetricView
                    data={commercial.deliveryTransactionsByPlatform}
                    keys={commercial.yearKeys}
                    chart="bar"
                    valueFormat="number"
                  />
                </CardContent>
              </Card>
            </section>

            <Card>
              <CardHeader>
                <CardTitle>Ticket promedio por app</CardTitle>
                <p className="text-sm text-muted-foreground">Importe promedio por transacción en cada plataforma.</p>
              </CardHeader>
              <CardContent>
                <DashboardBranchesMetricView
                  data={commercial.deliveryTicketByPlatform}
                  keys={commercial.yearKeys}
                  chart="bar"
                />
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        <TabsContent value="mix" className="mt-0">
          <section id="mix" className="space-y-4 scroll-mt-6">
            <SectionTitle
              eyebrow="Mix"
              title="Categorías, productos y composición"
              description="Peso de categorías, productos líderes y sucursales con mejor composición comercial."
            />

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
              <Card className="min-w-0 overflow-hidden">
                <CardHeader><CardTitle>Ventas por categoría</CardTitle></CardHeader>
                <CardContent className="grid gap-5 2xl:grid-cols-[280px_minmax(0,1fr)] 2xl:items-center">
                  <div className="min-w-0">
                    <DashboardMixChart data={mix.topCategories} />
                  </div>
                  <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                    {mix.topCategories.map((item) => (
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
                  <DashboardSimpleBarChart data={mix.categoryUnits} name="Unidades" valueFormat="number" />
                </CardContent>
              </Card>
            </section>

            <Card className="min-w-0">
              <CardHeader><CardTitle>Tendencia mensual por categoría</CardTitle></CardHeader>
              <CardContent>
                <DashboardBranchesMultiBarChart data={mix.monthlyCategoryTrend} keys={mix.categoryKeys} />
              </CardContent>
            </Card>

            <section className="grid gap-4">
              <Card>
                <CardHeader><CardTitle>Top productos</CardTitle></CardHeader>
                <CardContent>
                  <DashboardProductComparisonView
                    data={mix.productComparison}
                    yearKeys={mix.productYearKeys}
                    branchKeys={mix.productBranchKeys}
                  />
                </CardContent>
              </Card>
            </section>
          </section>
        </TabsContent>

        <TabsContent value="familias" className="mt-0">
          <section id="familias" className="space-y-4 scroll-mt-6">
            <SectionTitle
              eyebrow="Familias"
              title="Mix tipo Excel"
              description="Categorías de la base de datos comparadas año contra año y con participación sobre unidades."
            />

            <section className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Unidades por categoría</CardTitle>
                  <p className="text-sm text-muted-foreground">Comparativo anual usando las mismas categorías del mix comercial.</p>
                </CardHeader>
                <CardContent>
                  <DashboardBranchesMetricView
                    data={commercial.productGroupsByYear}
                    keys={commercial.yearKeys}
                    chart="bar"
                    valueFormat="number"
                  />
                </CardContent>
              </Card>
            </section>

            <Card>
              <CardHeader><CardTitle>Peso de categorías comerciales</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {commercial.productGroupShares.map((item) => (
                  <div key={item.label} className="rounded-2xl border p-4">
                    <p className="font-medium">{item.label}</p>
                    <p className="mt-3 text-2xl font-semibold">{formatPercent(item.share)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{formatNumber(item.units)} unidades visibles</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        <TabsContent value="resumen" className="mt-0">
          <section id="resumen" className="space-y-4 scroll-mt-6">
            <SectionTitle
              eyebrow="Inicio"
              title="Resumen ejecutivo"
              description="Indicadores principales de venta, volumen, ticket y cuadre para el periodo filtrado."
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <KpiCard title="Ventas totales" value={formatCurrency(overview.kpis.totalSales)} helper="Acumulado visible para el filtro activo." />
              <KpiCard title="Unidades" value={formatNumber(overview.kpis.totalUnits)} helper="Volumen total vendido." />
              <KpiCard title="Operaciones" value={formatNumber(overview.kpis.totalOperations)} helper="Total de operaciones registradas." />
              <KpiCard title="Ticket promedio" value={formatCurrency(overview.kpis.averageTicket)} helper="Importe total entre operaciones." />
              <KpiCard title="Productos por día" value={formatNumber(overview.kpis.averageDailyProducts)} helper="Promedio de SKUs visibles por día." />
              <KpiCard title="Diferencia de cuadre" value={formatCurrency(overview.kpis.reconciliationDelta)} helper="Suma de diferencias productos vs pagos." />
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

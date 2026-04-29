import { Database, FileClock, Store, TrendingUp } from "lucide-react";
import Link from "next/link";

import { DashboardBranchesMetricView } from "@/app/(app)/dashboard/_components/dashboard-overview-charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableElement,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDateOnly, formatNumber } from "@/lib/utils";
import {
  getHistoricalMetricsDashboard,
  type HistoricalMetricsData,
  type HistoricalMetricsSearchParams,
} from "@/modules/dashboard/services/historical-metrics";
import {
  HistoricalBranchRankingChart,
  HistoricalMixDonut,
  HistoricalMonthlyPerformanceChart,
  HistoricalWeekdayChart,
  HistoricalYearlyComposedChart,
} from "./historical-dashboard-charts";

type PageProps = {
  searchParams: Promise<HistoricalMetricsSearchParams>;
};

function KpiCard({
  title,
  value,
  helper,
  icon: Icon,
}: {
  title: string;
  value: string;
  helper: string;
  icon: typeof Database;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <CardTitle>{title}</CardTitle>
        <div className="rounded-xl border bg-muted p-2 text-muted-foreground">
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="mt-2 text-sm leading-5 text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}

function HistoricalFilterForm({ dashboard }: { dashboard: HistoricalMetricsData }) {
  return (
    <form action="/dashboard/subway/historico" className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_auto] xl:items-end">
      <div className="space-y-1.5">
        <label htmlFor="historical-branch" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Sucursal
        </label>
        <select
          id="historical-branch"
          name="branch"
          defaultValue={dashboard.filters.branch ?? ""}
          className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Todas las sucursales</option>
          {dashboard.availableBranches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="historical-date-from" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Fecha desde
        </label>
        <input
          id="historical-date-from"
          name="dateFrom"
          type="date"
          defaultValue={dashboard.filters.dateFrom ?? ""}
          className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="historical-date-to" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Fecha hasta
        </label>
        <input
          id="historical-date-to"
          name="dateTo"
          type="date"
          defaultValue={dashboard.filters.dateTo ?? ""}
          className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 md:col-span-2 xl:col-span-1">
        <Button type="submit">Filtrar</Button>
        <Link href="/dashboard/subway/historico" className="text-sm font-medium text-muted-foreground transition hover:text-foreground">
          Limpiar
        </Link>
      </div>
    </form>
  );
}

function formatMetricName(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatMetricValue(metric: string, value: number) {
  return metric.startsWith("VENTA_") ? formatCurrency(value) : formatNumber(value);
}

function formatCurrencyTwoDecimals(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatPercent(value: number | null) {
  if (value === null) return "Sin comparación";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

const salesMetrics = ["VENTA_TOTAL", "VENTA_SALON", "VENTA_DELIVERY"];
const clientMetrics = ["CLIENTES_TOTAL", "CLIENTES_SALON", "CLIENTES_DELIVERY"];

export default async function SubwayHistoricalPage({ searchParams }: PageProps) {
  const dashboard = await getHistoricalMetricsDashboard(await searchParams);
  const latestYear = dashboard.yearly.at(-1);
  const bestBranch = dashboard.branchPerformance[0];

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-border bg-[radial-gradient(circle_at_top_left,rgba(0,137,56,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,194,10,0.18),transparent_30%),linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Histórico Subway
        </p>
        <h1 className="mt-2 max-w-4xl text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">
          Data pasada consolidada para comparar contra la operación nueva
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Esta vista lee `historical_metrics_subway` y muestra las métricas antiguas por periodo, sucursal y origen.
        </p>
        <div className="mt-4 inline-flex rounded-full border border-border bg-background/80 px-3.5 py-1.5 text-sm text-muted-foreground">
          {dashboard.activePeriodLabel}
        </div>
      </section>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Filtros de histórico</CardTitle>
          <p className="text-sm text-muted-foreground">
            Estos filtros aplican a todo: tarjetas, lecturas, gráficos, rankings y detalle.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <HistoricalFilterForm dashboard={dashboard} />
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Venta histórica"
          value={formatCurrency(dashboard.kpis.totalSales)}
          helper="Venta total. Salón y delivery se muestran como desglose."
          icon={Database}
        />
        <KpiCard
          title="Clientes históricos"
          value={formatNumber(dashboard.kpis.totalClients)}
          helper="Clientes totales. Salón y delivery se muestran como desglose."
          icon={Store}
        />
        <KpiCard
          title="Ticket promedio"
          value={formatCurrencyTwoDecimals(dashboard.kpis.totalClients > 0 ? dashboard.kpis.totalSales / dashboard.kpis.totalClients : 0)}
          helper="Venta total dividida entre clientes totales."
          icon={TrendingUp}
        />
        <KpiCard
          title="Cobertura"
          value={`${formatNumber(dashboard.kpis.activeBranches)} sedes`}
          helper={`${formatNumber(dashboard.kpis.totalRows)} filas históricas filtradas.`}
          icon={FileClock}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {dashboard.insights.map((insight, index) => (
          <Card key={insight}>
            <CardContent className="pt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Lectura {index + 1}
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground">{insight}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Tabs defaultValue="panorama" className="space-y-5">
        <div className="overflow-x-auto">
          <TabsList className="h-auto min-w-max rounded-2xl p-1.5">
            <TabsTrigger value="panorama" className="rounded-xl px-4 py-2">
              Panorama
            </TabsTrigger>
            <TabsTrigger value="evolucion" className="rounded-xl px-4 py-2">
              Evolución
            </TabsTrigger>
            <TabsTrigger value="sucursales" className="rounded-xl px-4 py-2">
              Sucursales
            </TabsTrigger>
            <TabsTrigger value="operacion" className="rounded-xl px-4 py-2">
              Operación
            </TabsTrigger>
            <TabsTrigger value="datos" className="rounded-xl px-4 py-2">
              Datos
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="panorama" className="mt-0 space-y-4">
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Ventas, delivery y ticket por año</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Muestra si el histórico crece por venta total, ticket promedio o canal delivery.
                </p>
              </CardHeader>
              <CardContent>
                <HistoricalYearlyComposedChart data={dashboard.yearly} />
              </CardContent>
            </Card>

            <div className="grid gap-4">
              <Card>
                <CardHeader><CardTitle>Último año visible</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{latestYear?.label ?? "Sin datos"}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Venta {formatPercent(latestYear?.salesGrowthPct ?? null)} y clientes {formatPercent(latestYear?.clientsGrowthPct ?? null)} frente al año anterior.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Sucursal líder</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{bestBranch?.branch ?? "Sin datos"}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {bestBranch ? `${formatCurrency(bestBranch.ventaTotal)} de venta histórica · ticket ${formatCurrencyTwoDecimals(bestBranch.ticketPromedio)}` : "No hay ranking visible."}
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Mix de venta histórica</CardTitle>
              </CardHeader>
              <CardContent>
                <HistoricalMixDonut data={dashboard.salesMix} valueFormat="currency" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Mix de clientes históricos</CardTitle>
              </CardHeader>
              <CardContent>
                <HistoricalMixDonut data={dashboard.clientMix} valueFormat="number" />
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        <TabsContent value="evolucion" className="mt-0">
          <section className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Evolución mensual con ticket</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Combina venta mensual y ticket promedio para ver calidad de ingreso.
                </p>
              </CardHeader>
              <CardContent>
                <HistoricalMonthlyPerformanceChart data={dashboard.monthlyPerformance} />
              </CardContent>
            </Card>
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Evolución mensual de ventas</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Venta total, salón y delivery según la estructura del Excel histórico.
                </p>
              </CardHeader>
              <CardContent>
                <DashboardBranchesMetricView
                  data={dashboard.monthlySalesTrend}
                  keys={dashboard.salesMetricKeys}
                  chart="bar"
                  valueFormat="currency"
                  labelHeader="Mes"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Evolución mensual de clientes</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Clientes totales, salón y delivery para comparar tráfico histórico.
                </p>
              </CardHeader>
              <CardContent>
                <DashboardBranchesMetricView
                  data={dashboard.monthlyClientTrend}
                  keys={dashboard.clientMetricKeys}
                  chart="bar"
                  valueFormat="number"
                  labelHeader="Mes"
                />
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        <TabsContent value="sucursales" className="mt-0">
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Ranking histórico por venta</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Top de sedes por venta total dentro del filtro activo.
                </p>
              </CardHeader>
              <CardContent>
                <HistoricalBranchRankingChart data={dashboard.branchPerformance} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ranking de ticket</CardTitle>
                <p className="text-sm text-muted-foreground">Sedes con mayor venta por cliente.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {[...dashboard.branchPerformance]
                  .sort((a, b) => b.ticketPromedio - a.ticketPromedio)
                  .slice(0, 7)
                  .map((branch, index) => (
                    <div key={branch.branchId} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{index + 1}. {branch.branch}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatNumber(branch.clientesTotal)} clientes</p>
                      </div>
                      <p className="shrink-0 font-semibold">{formatCurrencyTwoDecimals(branch.ticketPromedio)}</p>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </section>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Resumen por sucursal</CardTitle>
              <p className="text-sm text-muted-foreground">
                Totales históricos agregados por sede.
              </p>
            </CardHeader>
            <CardContent>
              <Table className="max-h-[520px] overflow-auto rounded-2xl">
                <TableElement>
                  <TableHead className="sticky top-0 z-10">
                    <TableRow>
                      <TableHeaderCell>Sucursal</TableHeaderCell>
                      {salesMetrics.map((metric) => (
                        <TableHeaderCell key={metric} className="text-right">
                          {formatMetricName(metric).replace("Venta ", "")}
                        </TableHeaderCell>
                      ))}
                      {clientMetrics.map((metric) => (
                        <TableHeaderCell key={metric} className="text-right">
                          {formatMetricName(metric).replace("Clientes ", "")}
                        </TableHeaderCell>
                      ))}
                      <TableHeaderCell className="text-right">Filas</TableHeaderCell>
                      <TableHeaderCell>Rango</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboard.branchSummary.length ? (
                      dashboard.branchSummary.map((item) => (
                        <TableRow key={item.branchId}>
                          <TableCell className="font-medium">{item.branch}</TableCell>
                          {salesMetrics.map((metric) => (
                            <TableCell key={`${item.branchId}-${metric}`} className="text-right font-medium">
                              {formatCurrency(item.byMetric[metric] ?? 0)}
                            </TableCell>
                          ))}
                          {clientMetrics.map((metric) => (
                            <TableCell key={`${item.branchId}-${metric}`} className="text-right">
                              {formatNumber(item.byMetric[metric] ?? 0)}
                            </TableCell>
                          ))}
                          <TableCell className="text-right">{formatNumber(item.filas)}</TableCell>
                          <TableCell>
                            {formatDateOnly(item.primeraFecha)} - {formatDateOnly(item.ultimaFecha)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">
                          No hay sucursales históricas visibles con estos filtros.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </TableElement>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operacion" className="mt-0">
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.7fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Venta histórica por día de semana</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Ayuda a ubicar los días fuertes del patrón histórico.
                </p>
              </CardHeader>
              <CardContent>
                <HistoricalWeekdayChart data={dashboard.weekdayPerformance} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumen por métrica</CardTitle>
                <p className="text-sm text-muted-foreground">Totales por columna original del Excel.</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {dashboard.metricSummary.map((item) => (
                  <div key={item.metrica} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{formatMetricName(item.metrica)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatNumber(item.filas)} filas</p>
                    </div>
                    <p className="text-sm font-semibold">{formatMetricValue(item.metrica, item.total)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        <TabsContent value="datos" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Detalle histórico</CardTitle>
              <p className="text-sm text-muted-foreground">
                Mostrando las {formatNumber(dashboard.detailRows.length)} filas más recientes de {formatNumber(dashboard.detailRowsTotal)} registros filtrados.
              </p>
            </CardHeader>
            <CardContent>
              <Table className="max-h-[620px] overflow-auto rounded-2xl">
                <TableElement>
                  <TableHead className="sticky top-0 z-10">
                    <TableRow>
                      <TableHeaderCell>Fecha</TableHeaderCell>
                      <TableHeaderCell>Sucursal</TableHeaderCell>
                      <TableHeaderCell>Métrica</TableHeaderCell>
                      <TableHeaderCell className="text-right">Valor</TableHeaderCell>
                      <TableHeaderCell className="text-right">Semana</TableHeaderCell>
                      <TableHeaderCell className="text-right">Día</TableHeaderCell>
                      <TableHeaderCell>Origen</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboard.detailRows.length ? (
                      dashboard.detailRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="whitespace-nowrap">{formatDateOnly(row.fecha)}</TableCell>
                          <TableCell className="font-medium">{row.sucursal}</TableCell>
                          <TableCell>
                            <p>{formatMetricName(row.metrica)}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{row.metrica}</p>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatMetricValue(row.metrica, row.valor)}</TableCell>
                          <TableCell className="text-right">{row.semana}</TableCell>
                          <TableCell className="text-right">{row.diaSemana}</TableCell>
                          <TableCell>
                            <p>{row.sourceKey}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {[row.sourceFileName, row.sourceSheetName].filter(Boolean).join(" · ") || "Sin archivo"}
                            </p>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No hay filas históricas visibles con estos filtros.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </TableElement>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

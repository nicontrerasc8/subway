import { Database, FileClock, Layers3, Store } from "lucide-react";

import { DashboardRangeFilterForm } from "@/app/(app)/dashboard/_components/dashboard-range-filter-form";
import { DashboardBranchesMetricView } from "@/app/(app)/dashboard/_components/dashboard-overview-charts";
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
  type HistoricalMetricsSearchParams,
} from "@/modules/dashboard/services/historical-metrics";

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

const salesMetrics = ["VENTA_TOTAL", "VENTA_SALON", "VENTA_DELIVERY"];
const clientMetrics = ["CLIENTES_TOTAL", "CLIENTES_SALON", "CLIENTES_DELIVERY"];

export default async function SubwayHistoricalPage({ searchParams }: PageProps) {
  const dashboard = await getHistoricalMetricsDashboard(await searchParams);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-border bg-[radial-gradient(circle_at_top_left,rgba(0,137,56,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,194,10,0.18),transparent_30%),linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Historico Subway
        </p>
        <h1 className="mt-2 max-w-4xl text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">
          Data pasada consolidada para comparar contra la operacion nueva
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Esta vista lee `historical_metrics_subway` y muestra las metricas antiguas por periodo, sucursal y origen.
        </p>
        <div className="mt-4 inline-flex rounded-full border border-border bg-background/80 px-3.5 py-1.5 text-sm text-muted-foreground">
          {dashboard.activePeriodLabel}
        </div>
      </section>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <DashboardRangeFilterForm
            action="/dashboard/subway/historico"
            filters={dashboard.filters}
            availableYears={dashboard.availableYears}
            branch={dashboard.filters.branch}
            branches={dashboard.availableBranches}
            layout="inline"
          />
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard
          title="Venta historica"
          value={formatCurrency(dashboard.kpis.totalSales)}
          helper="Suma de VENTA_TOTAL, VENTA_SALON y VENTA_DELIVERY."
          icon={Database}
        />
        <KpiCard
          title="Clientes historicos"
          value={formatNumber(dashboard.kpis.totalClients)}
          helper="Suma de CLIENTES_TOTAL, CLIENTES_SALON y CLIENTES_DELIVERY."
          icon={Store}
        />
        <KpiCard
          title="Filas"
          value={formatNumber(dashboard.kpis.totalRows)}
          helper="Registros historicos incluidos en el filtro."
          icon={FileClock}
        />
        <KpiCard
          title="Metricas"
          value={formatNumber(dashboard.kpis.activeMetrics)}
          helper="Tipos de metrica presentes."
          icon={Layers3}
        />
        <KpiCard
          title="Sucursales"
          value={formatNumber(dashboard.kpis.activeBranches)}
          helper="Sedes con data historica visible."
          icon={Store}
        />
        <KpiCard
          title="Venta por dia"
          value={formatCurrency(dashboard.kpis.averageSalesPerDay)}
          helper="Promedio diario de venta historica."
          icon={Database}
        />
        <KpiCard
          title="Clientes por dia"
          value={formatNumber(dashboard.kpis.averageClientsPerDay)}
          helper="Promedio diario de clientes historicos."
          icon={Database}
        />
      </section>

      <Tabs defaultValue="metricas" className="space-y-5">
        <div className="overflow-x-auto">
          <TabsList className="h-auto min-w-max rounded-2xl p-1.5">
            <TabsTrigger value="metricas" className="rounded-xl px-4 py-2">
              Metricas
            </TabsTrigger>
            <TabsTrigger value="evolucion" className="rounded-xl px-4 py-2">
              Evolucion
            </TabsTrigger>
            <TabsTrigger value="sucursales" className="rounded-xl px-4 py-2">
              Sucursales
            </TabsTrigger>
            <TabsTrigger value="detalle" className="rounded-xl px-4 py-2">
              Detalle
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="metricas" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Resumen por metrica</CardTitle>
              <p className="text-sm text-muted-foreground">
                Totales de la data vieja agrupados por el campo `metrica`.
              </p>
            </CardHeader>
            <CardContent>
              <Table className="max-h-[520px] overflow-auto rounded-2xl">
                <TableElement>
                  <TableHead className="sticky top-0 z-10">
                    <TableRow>
                      <TableHeaderCell>Metrica</TableHeaderCell>
                      <TableHeaderCell className="text-right">Total</TableHeaderCell>
                      <TableHeaderCell className="text-right">Promedio</TableHeaderCell>
                      <TableHeaderCell className="text-right">Filas</TableHeaderCell>
                      <TableHeaderCell className="text-right">Sucursales</TableHeaderCell>
                      <TableHeaderCell>Rango</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboard.metricSummary.length ? (
                      dashboard.metricSummary.map((item) => (
                        <TableRow key={item.metrica}>
                          <TableCell>
                            <p className="font-medium">{formatMetricName(item.metrica)}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{item.metrica}</p>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatMetricValue(item.metrica, item.total)}
                          </TableCell>
                          <TableCell className="text-right">{formatMetricValue(item.metrica, item.promedio)}</TableCell>
                          <TableCell className="text-right">{formatNumber(item.filas)}</TableCell>
                          <TableCell className="text-right">{formatNumber(item.sucursales)}</TableCell>
                          <TableCell>
                            {formatDateOnly(item.primeraFecha)} - {formatDateOnly(item.ultimaFecha)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No hay data historica visible con estos filtros.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </TableElement>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evolucion" className="mt-0">
          <section className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Evolucion mensual de ventas</CardTitle>
                <p className="text-sm text-muted-foreground">
                  VENTA_TOTAL, VENTA_SALON y VENTA_DELIVERY segun la estructura del Excel historico.
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
                <CardTitle>Evolucion mensual de clientes</CardTitle>
                <p className="text-sm text-muted-foreground">
                  CLIENTES_TOTAL, CLIENTES_SALON y CLIENTES_DELIVERY para comparar trafico antiguo.
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
          <Card>
            <CardHeader>
              <CardTitle>Resumen por sucursal</CardTitle>
              <p className="text-sm text-muted-foreground">
                Totales historicos agregados por sede.
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
                          No hay sucursales historicas visibles con estos filtros.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </TableElement>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detalle" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Detalle historico</CardTitle>
              <p className="text-sm text-muted-foreground">
                Mostrando las {formatNumber(dashboard.detailRows.length)} filas mas recientes de {formatNumber(dashboard.detailRowsTotal)} registros filtrados.
              </p>
            </CardHeader>
            <CardContent>
              <Table className="max-h-[620px] overflow-auto rounded-2xl">
                <TableElement>
                  <TableHead className="sticky top-0 z-10">
                    <TableRow>
                      <TableHeaderCell>Fecha</TableHeaderCell>
                      <TableHeaderCell>Sucursal</TableHeaderCell>
                      <TableHeaderCell>Metrica</TableHeaderCell>
                      <TableHeaderCell className="text-right">Valor</TableHeaderCell>
                      <TableHeaderCell className="text-right">Semana</TableHeaderCell>
                      <TableHeaderCell className="text-right">Dia</TableHeaderCell>
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
                          No hay filas historicas visibles con estos filtros.
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

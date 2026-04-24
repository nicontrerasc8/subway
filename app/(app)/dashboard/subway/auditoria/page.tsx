import { DashboardRangeFilterForm } from "@/app/(app)/dashboard/_components/dashboard-range-filter-form";
import { DashboardDailySalesChart, DashboardSimpleBarChart } from "@/app/(app)/dashboard/_components/dashboard-overview-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency, formatDateOnly, formatNumber } from "@/lib/utils";
import { getDashboardAudit, type DashboardAuditSearchParams } from "@/modules/dashboard/services/dashboard-audit";

type PageProps = {
  searchParams: Promise<DashboardAuditSearchParams>;
};

function KpiCard({
  title,
  value,
  helper,
  tone = "default",
}: {
  title: string;
  value: string;
  helper: string;
  tone?: "default" | "warning" | "success";
}) {
  return (
    <Card
      className={cn(
        tone === "warning" && "border-amber-300 bg-amber-50/60",
        tone === "success" && "border-emerald-300 bg-emerald-50/60",
      )}
    >
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold">{value}</p>
        <p className="mt-2 text-sm leading-5 text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}

export default async function SubwayAuditPage({ searchParams }: PageProps) {
  const dashboard = await getDashboardAudit(await searchParams);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-border bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,194,10,0.18),transparent_30%),linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Revisión de caja</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-foreground">Ventas cargadas vs pagos registrados</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Cada import compara lo vendido en productos contra lo cobrado en pagos. Si ambos montos son iguales, el import cuadra.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <div className="inline-flex rounded-full border border-border bg-background/80 px-4 py-2 text-sm text-muted-foreground">
            {dashboard.activePeriodLabel}
          </div>
          <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
            Diferencia = productos - pagos
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
          <CardContent>
            <DashboardRangeFilterForm
              action="/dashboard/subway/auditoria"
              filters={dashboard.filters}
              availableYears={dashboard.availableYears}
            />
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:col-span-2 xl:grid-cols-3">
          <KpiCard title="Imports revisados" value={formatNumber(dashboard.kpis.totalImports)} helper="Cantidad de archivos/lotes incluidos con estos filtros." />
          <KpiCard title="Imports que cuadran" value={formatNumber(dashboard.kpis.balancedImports)} helper="La venta en productos coincide con los pagos registrados." tone="success" />
          <KpiCard title="Imports por revisar" value={formatNumber(dashboard.kpis.importsWithDelta)} helper="Tienen alguna diferencia entre productos y pagos." tone="warning" />
          <KpiCard title="Venta en productos" value={formatCurrency(dashboard.kpis.totalProducts)} helper="Suma de lo vendido según el detalle de productos." />
          <KpiCard title="Pagos registrados" value={formatCurrency(dashboard.kpis.totalPayments)} helper="Suma de los cobros cargados en el sistema." />
          <KpiCard
            title="Monto por revisar"
            value={formatCurrency(dashboard.kpis.totalDelta)}
            helper="Diferencia acumulada: productos menos pagos."
            tone={Math.abs(dashboard.kpis.totalDelta) >= 0.01 ? "warning" : "success"}
          />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Diferencia por día</CardTitle>
            <p className="text-sm text-muted-foreground">Cuánto falta o sobra cada día al comparar productos contra pagos.</p>
          </CardHeader>
          <CardContent><DashboardDailySalesChart data={dashboard.deltaTrend} /></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Diferencia por sucursal</CardTitle>
            <p className="text-sm text-muted-foreground">Sucursales con mayor monto pendiente de revisar.</p>
          </CardHeader>
          <CardContent><DashboardSimpleBarChart data={dashboard.deltasByBranch} /></CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Imports que más descuadran</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {dashboard.largestDeltas.map((item) => (
              <div key={item.importId} className="rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{item.sucursal}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{formatDateOnly(item.fecha)} - {item.sourceKey ?? "sin origen"}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Productos {formatCurrency(item.totalProductos)} vs pagos {formatCurrency(item.totalPagos)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(item.diferencia)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatNumber(item.totalOperaciones)} operaciones</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Últimos imports cargados</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {dashboard.recentImports.map((item) => (
              <div key={`${item.importId}-recent`} className="rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{item.sucursal}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{formatDateOnly(item.fecha)} - {item.sourceKey ?? "sin origen"}</p>
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

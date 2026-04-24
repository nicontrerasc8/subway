import { DashboardRangeFilterForm } from "@/app/(app)/dashboard/_components/dashboard-range-filter-form";
import { DashboardBranchesMultiBarChart, DashboardMixChart, DashboardSimpleBarChart } from "@/app/(app)/dashboard/_components/dashboard-overview-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { getDashboardMix, type DashboardMixSearchParams } from "@/modules/dashboard/services/dashboard-mix";

type PageProps = {
  searchParams: Promise<DashboardMixSearchParams>;
};

export default async function SubwayCrossPage({ searchParams }: PageProps) {
  const dashboard = await getDashboardMix(await searchParams);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-border bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(0,137,56,0.12),transparent_30%),linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Mix comercial</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="max-w-4xl text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">
              Categorías, productos y composición del negocio
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Peso de categorías, productos líderes y sucursales con mejor mix.
            </p>
          </div>
          <div className="inline-flex rounded-full border border-border bg-background/80 px-3.5 py-1.5 text-sm text-muted-foreground">
            {dashboard.activePeriodLabel}
          </div>
        </div>
      </section>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <DashboardRangeFilterForm
            action="/dashboard/subway/cruce"
            filters={dashboard.filters}
            availableYears={dashboard.availableYears}
            layout="inline"
          />
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Ventas por categoría</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 2xl:grid-cols-[280px_minmax(0,1fr)] 2xl:items-center">
            <div className="min-w-0">
              <DashboardMixChart data={dashboard.topCategories} />
            </div>
            <div className="grid min-w-0 gap-2 sm:grid-cols-2">
              {dashboard.topCategories.map((item) => (
                <div key={item.label} className="min-w-0 rounded-xl border px-3 py-2">
                  <p className="truncate text-sm font-medium">{item.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{formatCurrency(item.value)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Unidades por categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <DashboardSimpleBarChart
              data={dashboard.categoryUnits}
              name="Unidades"
              valueFormat="number"
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Top productos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {dashboard.topProducts.map((product) => (
              <div key={product.referencia} className="rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{product.producto}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{product.referencia} · {product.categoria}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold">{formatCurrency(product.ventas)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatNumber(product.unidades)} unidades</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Sucursales con mejor mix</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {dashboard.topBranches.map((branch) => (
              <div key={branch.branch} className="rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{branch.branch}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{formatNumber(branch.units)} unidades</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold">{formatCurrency(branch.sales)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatNumber(branch.products)} SKUs/día</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <Card className="min-w-0">
          <CardHeader><CardTitle>Tendencia mensual por categoría</CardTitle></CardHeader>
          <CardContent>
            <DashboardBranchesMultiBarChart data={dashboard.monthlyCategoryTrend} keys={dashboard.categoryKeys} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Ranking global de productos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {dashboard.globalProducts.map((product) => (
              <div key={`global-${product.referencia}`} className="rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{product.producto}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{product.referencia} · {product.categoria}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold">{formatCurrency(product.ventas)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatNumber(product.unidades)} unidades</p>
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

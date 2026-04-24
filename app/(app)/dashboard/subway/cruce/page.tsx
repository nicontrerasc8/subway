import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { DashboardBranchesMultiBarChart, DashboardMixChart, DashboardSimpleBarChart } from "@/app/(app)/dashboard/_components/dashboard-overview-charts";
import { getDashboardMix, type DashboardMixSearchParams } from "@/modules/dashboard/services/dashboard-mix";

type PageProps = {
  searchParams: Promise<DashboardMixSearchParams>;
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
  return query ? `/dashboard/subway/cruce?${query}` : "/dashboard/subway/cruce";
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

export default async function SubwayCrossPage({ searchParams }: PageProps) {
  const dashboard = await getDashboardMix(await searchParams);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-border bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(0,137,56,0.16),transparent_30%),linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Mix comercial</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-foreground">Categorias, productos y composicion del negocio</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Vista para entender el peso de categorias, productos lideres y sucursales con mejor mix.</p>
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

        <div className="grid gap-4 xl:col-span-2 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Ventas por categoria</CardTitle></CardHeader>
            <CardContent className="grid gap-3 lg:grid-cols-[220px_1fr] lg:items-center">
              <DashboardMixChart data={dashboard.topCategories} />
              <div className="space-y-2">
                {dashboard.topCategories.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2">
                    <span className="text-sm">{item.label}</span>
                    <span className="text-sm font-medium">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Unidades por categoria</CardTitle></CardHeader>
            <CardContent><DashboardSimpleBarChart data={dashboard.categoryUnits} /></CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Top productos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {dashboard.topProducts.map((product) => (
              <div key={product.referencia} className="rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{product.producto}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{product.referencia} · {product.categoria}</p>
                  </div>
                  <div className="text-right">
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
                  <div>
                    <p className="font-medium">{branch.branch}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{formatNumber(branch.units)} unidades</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(branch.sales)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatNumber(branch.products)} SKUs/dia</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Tendencia mensual por categoria</CardTitle></CardHeader>
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
                  <div>
                    <p className="font-medium">{product.producto}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{product.referencia} · {product.categoria}</p>
                  </div>
                  <div className="text-right">
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

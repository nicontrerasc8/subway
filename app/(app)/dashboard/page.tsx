import { DashboardRangeFilterForm } from "@/app/(app)/dashboard/_components/dashboard-range-filter-form";
import { DashboardBranchesSection } from "@/app/(app)/dashboard/_components/dashboard-branches-section";
import { DashboardDeliverySection } from "@/app/(app)/dashboard/_components/dashboard-delivery-section";
import { DashboardFamiliesSection } from "@/app/(app)/dashboard/_components/dashboard-families-section";
import { DashboardMixSection } from "@/app/(app)/dashboard/_components/dashboard-mix-section";
import { DashboardPaymentsSection } from "@/app/(app)/dashboard/_components/dashboard-payments-section";
import { DashboardSummarySection } from "@/app/(app)/dashboard/_components/dashboard-summary-section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDashboardCommercialInsights } from "@/modules/dashboard/services/dashboard-commercial-insights";
import { getDashboardBranches } from "@/modules/dashboard/services/dashboard-branches";
import { getDashboardMix } from "@/modules/dashboard/services/dashboard-mix";
import { getDashboardOverview, type DashboardOverviewSearchParams } from "@/modules/dashboard/services/dashboard-overview";
import { getDashboardPayments } from "@/modules/dashboard/services/dashboard-payments";

type DashboardPageProps = {
  searchParams: Promise<DashboardOverviewSearchParams>;
};

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
          <DashboardBranchesSection branches={branches} />
        </TabsContent>

        <TabsContent value="pagos" className="mt-0">
          <DashboardPaymentsSection payments={payments} />
        </TabsContent>
        <TabsContent value="delivery" className="mt-0">
          <DashboardDeliverySection payments={payments} />
        </TabsContent>
        <TabsContent value="mix" className="mt-0">
          <DashboardMixSection mix={mix} />
        </TabsContent>
        <TabsContent value="familias" className="mt-0">
          <DashboardFamiliesSection commercial={commercial} mix={mix} />
        </TabsContent>
        <TabsContent value="resumen" className="mt-0">
          <DashboardSummarySection overview={overview} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

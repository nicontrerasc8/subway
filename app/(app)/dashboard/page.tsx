import { forbidden } from "next/navigation";

import { DashboardBranchesSection } from "@/app/(app)/dashboard/_components/dashboard-branches-section";
import { DashboardDeliverySection } from "@/app/(app)/dashboard/_components/dashboard-delivery-section";
import { DashboardFamiliesSection } from "@/app/(app)/dashboard/_components/dashboard-families-section";
import { DashboardMixSection } from "@/app/(app)/dashboard/_components/dashboard-mix-section";
import { DashboardPaymentsSection } from "@/app/(app)/dashboard/_components/dashboard-payments-section";
import { DashboardSummarySection } from "@/app/(app)/dashboard/_components/dashboard-summary-section";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { canAccessSubwayDashboards } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getDashboardCommercialInsights } from "@/modules/dashboard/services/dashboard-commercial-insights";
import { getDashboardBranches } from "@/modules/dashboard/services/dashboard-branches";
import { getDashboardMix } from "@/modules/dashboard/services/dashboard-mix";
import { getDashboardOverview } from "@/modules/dashboard/services/dashboard-overview";
import { getDashboardPayments } from "@/modules/dashboard/services/dashboard-payments";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user || !canAccessSubwayDashboards(user.role)) {
    forbidden();
  }

  const [overview, branches, payments, mix, commercial] = await Promise.all([
    getDashboardOverview(),
    getDashboardBranches(),
    getDashboardPayments(),
    getDashboardMix(),
    getDashboardCommercialInsights(),
  ]);

  return (
    <div className="space-y-5">
  

      <Tabs defaultValue="sucursales" className="space-y-5">
        <div className="overflow-x-auto">
          <TabsList className="h-auto min-w-max rounded-2xl p-1.5">
            <TabsTrigger value="sucursales" className="rounded-xl px-4 py-2">
              Ventas totales
            </TabsTrigger>
            <TabsTrigger value="pagos" className="rounded-xl px-4 py-2">
              Ticket promedio y Transacciones
            </TabsTrigger>
            <TabsTrigger value="delivery" className="rounded-xl px-4 py-2">
              Delivery por App
            </TabsTrigger>
            <TabsTrigger value="mix" className="rounded-xl px-4 py-2">
              Mix comercial
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

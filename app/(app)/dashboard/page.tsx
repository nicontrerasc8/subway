import { forbidden } from "next/navigation";
import { Download } from "lucide-react";

import { DashboardBranchesSection } from "@/app/(app)/dashboard/_components/dashboard-branches-section";
import { DashboardDeliverySection } from "@/app/(app)/dashboard/_components/dashboard-delivery-section";
import { DashboardMixSection } from "@/app/(app)/dashboard/_components/dashboard-mix-section";
import { DashboardPaymentsSection } from "@/app/(app)/dashboard/_components/dashboard-payments-section";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { canAccessSubwayDashboards } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getDashboardBranches } from "@/modules/dashboard/services/dashboard-branches";
import { getDashboardMix } from "@/modules/dashboard/services/dashboard-mix";
import { getDashboardPayments } from "@/modules/dashboard/services/dashboard-payments";

type DashboardTab = "sucursales" | "pagos" | "delivery" | "mix";

type PageProps = {
  searchParams: Promise<{ tab?: string | string[] }>;
};

function getActiveTab(value: string | string[] | undefined): DashboardTab {
  const tab = Array.isArray(value) ? value[0] : value;
  if (tab === "pagos" || tab === "delivery" || tab === "mix") return tab;
  return "sucursales";
}

async function renderActiveTab(activeTab: DashboardTab) {
  if (activeTab === "pagos") {
    const payments = await getDashboardPayments();
    return <DashboardPaymentsSection payments={payments} />;
  }

  if (activeTab === "delivery") {
    const payments = await getDashboardPayments();
    return <DashboardDeliverySection payments={payments} />;
  }

  if (activeTab === "mix") {
    const mix = await getDashboardMix();
    return <DashboardMixSection mix={mix} />;
  }

  const branches = await getDashboardBranches();
  return <DashboardBranchesSection branches={branches} />;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();

  if (!user || !canAccessSubwayDashboards(user.role)) {
    forbidden();
  }

  const activeTab = getActiveTab((await searchParams).tab);
  const activeContent = await renderActiveTab(activeTab);

  return (
    <div className="space-y-5">
  

      <Tabs value={activeTab} className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="overflow-x-auto">
            <TabsList className="h-auto min-w-max rounded-2xl p-1.5">
              <TabsTrigger value="sucursales" className="rounded-xl px-4 py-2" asChild>
                <a href="/dashboard?tab=sucursales">Ventas totales</a>
              </TabsTrigger>
              <TabsTrigger value="pagos" className="rounded-xl px-4 py-2" asChild>
                <a href="/dashboard?tab=pagos">Ticket promedio y Transacciones</a>
              </TabsTrigger>
              <TabsTrigger value="delivery" className="rounded-xl px-4 py-2" asChild>
                <a href="/dashboard?tab=delivery">Delivery por App</a>
              </TabsTrigger>
              <TabsTrigger value="mix" className="rounded-xl px-4 py-2" asChild>
                <a href="/dashboard?tab=mix">Mix comercial</a>
              </TabsTrigger>
            </TabsList>
          </div>
          <a
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "shrink-0")}
            href="/api/dashboard/export?section=all"
          >
            <Download className="size-4" />
            Exportar Excel
          </a>
        </div>

        <div className="mt-0">{activeContent}</div>
      </Tabs>
    </div>
  );
}

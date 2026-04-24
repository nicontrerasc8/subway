import { forbidden } from "next/navigation";

import { DashboardResetView } from "@/app/(app)/dashboard/_components/dashboard-reset-view";
import { canAccessSellerDashboard } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getExecutiveSalesByClientSummary } from "@/modules/dashboard/services/executive-sales-by-client";

export default async function SellerClientsPage() {
  const user = await getCurrentUser();

  if (!user || !canAccessSellerDashboard(user.role)) {
    forbidden();
  }

  const summary = await getExecutiveSalesByClientSummary();

  return <DashboardResetView title="Mis clientes" route="/dashboard/vendedor/clientes" data={summary} />;
}

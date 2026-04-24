import { forbidden } from "next/navigation";

import { DashboardResetView } from "@/app/(app)/dashboard/_components/dashboard-reset-view";
import { canAccessSellerDashboard } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getSellerDashboardSummary } from "@/modules/dashboard/services/seller-dashboard";

export default async function SellerDashboardPage() {
  const user = await getCurrentUser();

  if (!user || !canAccessSellerDashboard(user.role)) {
    forbidden();
  }

  const summary = await getSellerDashboardSummary();

  return <DashboardResetView title="Panel vendedor" route="/dashboard/vendedor" data={summary} />;
}

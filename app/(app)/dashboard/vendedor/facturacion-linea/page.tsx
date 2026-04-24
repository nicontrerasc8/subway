import { forbidden } from "next/navigation";

import { DashboardResetView } from "@/app/(app)/dashboard/_components/dashboard-reset-view";
import { canAccessSellerDashboard } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getExecutiveBillingByLineSummary } from "@/modules/dashboard/services/executive-billing-by-line";

export default async function SellerBillingByLinePage() {
  const user = await getCurrentUser();

  if (!user || !canAccessSellerDashboard(user.role)) {
    forbidden();
  }

  const summary = await getExecutiveBillingByLineSummary();

  return (
    <DashboardResetView
      title="Mi facturacion por linea"
      route="/dashboard/vendedor/facturacion-linea"
      data={summary}
    />
  );
}

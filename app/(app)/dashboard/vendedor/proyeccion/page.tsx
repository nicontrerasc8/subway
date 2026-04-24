import { forbidden } from "next/navigation";

import { DashboardResetView } from "@/app/(app)/dashboard/_components/dashboard-reset-view";
import { canAccessSellerDashboard } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getExecutiveProjectionMatrixSummary } from "@/modules/dashboard/services/executive-projection-matrix";

export default async function SellerProjectionPage() {
  const user = await getCurrentUser();

  if (!user || !canAccessSellerDashboard(user.role)) {
    forbidden();
  }

  const summary = await getExecutiveProjectionMatrixSummary();

  return <DashboardResetView title="Mi proyeccion" route="/dashboard/vendedor/proyeccion" data={summary} />;
}

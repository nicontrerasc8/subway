import { forbidden } from "next/navigation";

import { DashboardResetView } from "@/app/(app)/dashboard/_components/dashboard-reset-view";
import { canAccessSellerDashboard } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getExecutiveBacklogMatrixSummary } from "@/modules/dashboard/services/executive-backlog-matrix";

export default async function SellerBacklogPage() {
  const user = await getCurrentUser();

  if (!user || !canAccessSellerDashboard(user.role)) {
    forbidden();
  }

  const summary = await getExecutiveBacklogMatrixSummary();

  return <DashboardResetView title="Mi backlog" route="/dashboard/vendedor/backlog" data={summary} />;
}

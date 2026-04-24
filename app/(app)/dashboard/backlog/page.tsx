import { forbidden } from "next/navigation";

import { DashboardResetView } from "@/app/(app)/dashboard/_components/dashboard-reset-view";
import { canAccessExecutiveDashboards } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getBacklogMatrixSummary } from "@/modules/dashboard/services/backlog-matrix";

export default async function BacklogPage() {
  const user = await getCurrentUser();

  if (!user || !canAccessExecutiveDashboards(user.role)) {
    forbidden();
  }

  const summary = await getBacklogMatrixSummary();

  return <DashboardResetView title="Backlog" route="/dashboard/backlog" data={summary} />;
}

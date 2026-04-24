import { forbidden } from "next/navigation";

import { DashboardResetView } from "@/app/(app)/dashboard/_components/dashboard-reset-view";
import { canAccessExecutiveDashboards } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getProjectionMatrixSummary } from "@/modules/dashboard/services/projection-matrix";

export default async function ProjectionPage() {
  const user = await getCurrentUser();

  if (!user || !canAccessExecutiveDashboards(user.role)) {
    forbidden();
  }

  const summary = await getProjectionMatrixSummary();

  return <DashboardResetView title="Proyeccion" route="/dashboard/proyeccion" data={summary} />;
}

import { forbidden } from "next/navigation";

import { DashboardResetView } from "@/app/(app)/dashboard/_components/dashboard-reset-view";
import { canAccessExecutiveDashboards } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getVariationsSummary } from "@/modules/dashboard/services/variations";

export default async function VariacionesPage() {
  const user = await getCurrentUser();

  if (!user || !canAccessExecutiveDashboards(user.role)) {
    forbidden();
  }

  const summary = await getVariationsSummary();

  return <DashboardResetView title="Variaciones" route="/dashboard/variaciones" data={summary} />;
}

import { forbidden } from "next/navigation";

import { DashboardResetView } from "@/app/(app)/dashboard/_components/dashboard-reset-view";
import { canAccessExecutiveDashboards } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getSalesByClientSummary } from "@/modules/dashboard/services/sales-by-client";

export default async function SalesYearComparisonPage() {
  const user = await getCurrentUser();

  if (!user || !canAccessExecutiveDashboards(user.role)) {
    forbidden();
  }

  const summary = await getSalesByClientSummary();

  return <DashboardResetView title="Comparativo anual" route="/dashboard/comparativo-anual" data={summary} />;
}

import { forbidden } from "next/navigation";

import { DashboardResetView } from "@/app/(app)/dashboard/_components/dashboard-reset-view";
import { canAccessExecutiveDashboards } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getSalesByExecutiveSummary } from "@/modules/dashboard/services/sales-by-executive";

export default async function SalesByExecutivePage() {
  const user = await getCurrentUser();

  if (!user || !canAccessExecutiveDashboards(user.role)) {
    forbidden();
  }

  const summary = await getSalesByExecutiveSummary();

  return <DashboardResetView title="Ventas por ejecutivo" route="/dashboard/ejecutivos" data={summary} />;
}

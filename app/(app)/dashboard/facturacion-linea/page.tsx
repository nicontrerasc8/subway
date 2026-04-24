import { forbidden } from "next/navigation";

import { DashboardResetView } from "@/app/(app)/dashboard/_components/dashboard-reset-view";
import { canAccessExecutiveDashboards } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getBillingByLineSummary } from "@/modules/dashboard/services/billing-by-line";

export default async function BillingByLinePage() {
  const user = await getCurrentUser();

  if (!user || !canAccessExecutiveDashboards(user.role)) {
    forbidden();
  }

  const summary = await getBillingByLineSummary();

  return <DashboardResetView title="Facturacion por linea" route="/dashboard/facturacion-linea" data={summary} />;
}

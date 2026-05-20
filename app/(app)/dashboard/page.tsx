import { forbidden } from "next/navigation";

import { DashboardTabs } from "@/app/(app)/dashboard/_components/dashboard-tabs";
import { canAccessSubwayDashboards } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user || !canAccessSubwayDashboards(user.role)) {
    forbidden();
  }

  return (
    <div className="space-y-5">
      <DashboardTabs />
    </div>
  );
}

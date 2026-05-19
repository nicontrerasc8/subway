import { forbidden } from "next/navigation";

import { canAccessSubwayDashboards } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";

export default async function SubwayDashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  if (!user || !canAccessSubwayDashboards(user.role)) {
    forbidden();
  }

  return children;
}

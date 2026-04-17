import { forbidden } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { ImportsPageView } from "@/modules/imports/components/imports-page-view";
import { canAccessImports, listRecentImports } from "@/modules/imports/services/import-service";

export default async function ImportsPage() {
  const user = await getCurrentUser();

  if (!user || !canAccessImports(user.role)) {
    forbidden();
  }

  const imports = await listRecentImports();

  return <ImportsPageView imports={imports} />;
}

import { forbidden } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { canManageImports } from "@/lib/auth/roles";
import { ImportsPageView } from "@/modules/imports/components/imports-page-view";
import {
  canAccessImports,
  listExistingImportSlots,
  listRecentImports,
  listSubwayBranches,
} from "@/modules/imports/services/import-service";

export default async function ImportsPage() {
  const user = await getCurrentUser();

  if (!user || !canAccessImports(user.role)) {
    forbidden();
  }

  const canViewHistory = canManageImports(user.role);
  const [imports, branches, existingImports] = await Promise.all([
    canViewHistory ? listRecentImports() : Promise.resolve([]),
    listSubwayBranches(),
    listExistingImportSlots(),
  ]);

  return <ImportsPageView imports={imports} branches={branches} existingImports={existingImports} canViewHistory={canViewHistory} />;
}

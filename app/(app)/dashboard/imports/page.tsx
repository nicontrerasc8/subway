import { forbidden } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { ImportsPageView } from "@/modules/imports/components/imports-page-view";
import {
  canAccessImports,
  listRecentImports,
  listSubwayBranches,
} from "@/modules/imports/services/import-service";

export default async function ImportsPage() {
  const user = await getCurrentUser();

  if (!user || !canAccessImports(user.role)) {
    forbidden();
  }

  const [imports, branches] = await Promise.all([
    listRecentImports(),
    listSubwayBranches(),
  ]);

  return <ImportsPageView imports={imports} branches={branches} />;
}

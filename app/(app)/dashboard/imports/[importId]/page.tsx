import Link from "next/link";
import { forbidden } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { ImportDetailView } from "@/modules/imports/components/import-detail-view";
import { canAccessImports, getImportDetail } from "@/modules/imports/services/import-service";

export default async function ImportDetailPage(
  props: { params: Promise<{ importId: string }> },
) {
  const user = await getCurrentUser();

  if (!user || !canAccessImports(user.role)) {
    forbidden();
  }

  const { importId } = await props.params;
  const detail = await getImportDetail(importId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
            Edicion de importacion
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {detail.import.file_name}
          </h1>
        </div>
        <Link href="/dashboard/imports">
          <Button variant="secondary">Volver</Button>
        </Link>
      </div>

      <ImportDetailView importRecord={detail.import} rows={detail.rows} audit={detail.audit} />
    </div>
  );
}

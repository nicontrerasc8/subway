import { forbidden } from "next/navigation";

import { DashboardResetView } from "@/app/(app)/dashboard/_components/dashboard-reset-view";
import { canAccessExecutiveDashboards } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getProjectionMatrixSummary } from "@/modules/dashboard/services/projection-matrix";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function getParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function ProjectionDetailPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();

  if (!user || !canAccessExecutiveDashboards(user.role)) {
    forbidden();
  }

  const summary = await getProjectionMatrixSummary();
  const query = await searchParams;

  return (
    <DashboardResetView
      title="Detalle proyeccion"
      route="/dashboard/proyeccion/detalle"
      data={summary}
      filters={{
        scope: getParam(query.scope),
        anio: getParam(query.anio),
        negocio: getParam(query.negocio),
        etapa: getParam(query.etapa),
        situacion: getParam(query.situacion),
        ejecutivo: getParam(query.ejecutivo),
        linea: getParam(query.linea),
        mes: getParam(query.mes),
      }}
    />
  );
}

import { forbidden } from "next/navigation";

import { DashboardResetView } from "@/app/(app)/dashboard/_components/dashboard-reset-view";
import { canAccessSellerDashboard } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getExecutiveProjectionMatrixSummary } from "@/modules/dashboard/services/executive-projection-matrix";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function getParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function SellerProjectionDetailPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();

  if (!user || !canAccessSellerDashboard(user.role)) {
    forbidden();
  }

  const summary = await getExecutiveProjectionMatrixSummary();
  const query = await searchParams;

  return (
    <DashboardResetView
      title="Detalle mi proyeccion"
      route="/dashboard/vendedor/proyeccion/detalle"
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

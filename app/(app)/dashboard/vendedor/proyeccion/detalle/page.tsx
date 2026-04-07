import { Suspense } from "react";
import { forbidden } from "next/navigation";

import { canAccessSellerDashboard } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { BacklogRankingDetailView } from "@/modules/dashboard/components/backlog-ranking-detail-view";
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
  const scope = getParam(query.scope);

  return (
    <Suspense fallback={null}>
      <BacklogRankingDetailView
      summary={summary}
      scope={scope === "clientes" || scope === "ejecutivos" ? scope : "lineas"}
      basePath="/dashboard/vendedor/proyeccion"
      eyebrow="Dashboard ejecutivo"
      title="Detalle de mis rankings de proyección"
      filters={{
        anio: getParam(query.anio),
        negocio: getParam(query.negocio),
        situacion: getParam(query.situacion),
        ejecutivo: getParam(query.ejecutivo),
        linea: getParam(query.linea),
        mes: getParam(query.mes),
      }}
      />
    </Suspense>
  );
}

import { Suspense } from "react";
import { forbidden } from "next/navigation";

import { canAccessExecutiveDashboards } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { BacklogRankingDetailView } from "@/modules/dashboard/components/backlog-ranking-detail-view";
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
  const scope = getParam(query.scope);

  return (
    <Suspense fallback={null}>
      <BacklogRankingDetailView
      summary={summary}
      scope={scope === "clientes" || scope === "ejecutivos" ? scope : "lineas"}
      basePath="/dashboard/proyeccion"
      eyebrow="Dashboard proyección"
      title="Detalle de rankings de proyección"
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

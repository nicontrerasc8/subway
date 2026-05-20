import { canAccessSubwayDashboards } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { getDashboardBranches } from "@/modules/dashboard/services/dashboard-branches";
import { getDashboardMix } from "@/modules/dashboard/services/dashboard-mix";
import { getDashboardPayments } from "@/modules/dashboard/services/dashboard-payments";

export const runtime = "nodejs";

type DashboardSection = "sucursales" | "pagos" | "delivery" | "mix";

function getSection(request: Request): DashboardSection {
  const value = new URL(request.url).searchParams.get("section");
  if (value === "pagos" || value === "delivery" || value === "mix") return value;
  return "sucursales";
}

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "Sesion no valida." }, { status: 401 });
  }

  if (!canAccessSubwayDashboards(user.role)) {
    return Response.json({ error: "No autorizado." }, { status: 403 });
  }

  const section = getSection(request);

  if (section === "mix") {
    return Response.json({ section, data: await getDashboardMix() });
  }

  if (section === "pagos" || section === "delivery") {
    return Response.json({ section, data: await getDashboardPayments() });
  }

  return Response.json({ section, data: await getDashboardBranches() });
}

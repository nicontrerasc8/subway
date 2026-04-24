import type { AppRole } from "@/lib/types/database";

export const importManagerRoles = [
  "administrador_comercial",
] as const satisfies AppRole[];

export const executiveDashboardRoles = [
  "administrador_comercial",
  "gerente_comercial",
  "jefe_area",
  "directorio",
] as const satisfies AppRole[];

export const sellerDashboardRoles = [
  "ejecutivo_ventas",
] as const satisfies AppRole[];

export const roleLabels: Record<AppRole, string> = {
  administrador_comercial: "Administrador Comercial",
  gerente_comercial: "Gerente Comercial",

  
  jefe_area: "Jefe de Area / Linea",
  ejecutivo_ventas: "Ejecutivo de Ventas",
  directorio: "Directorio",
};

export function canManageImports(role: AppRole) {
  return (importManagerRoles as readonly AppRole[]).includes(role);
}

export function canAccessExecutiveDashboards(role: AppRole) {
  return (executiveDashboardRoles as readonly AppRole[]).includes(role);
}

export function canAccessSellerDashboard(role: AppRole) {
  return (sellerDashboardRoles as readonly AppRole[]).includes(role);
}

export function getDefaultDashboardPath() {
  return "/dashboard";
}

export function canAccessSidebarPath(role: AppRole, path: string) {
  if (path === "/dashboard") {
    return true;
  }

  if (path.startsWith("/dashboard/subway")) {
    return true;
  }

  if (path === "/dashboard/imports") {
    return canManageImports(role);
  }

  if (path.startsWith("/dashboard/vendedor")) {
    return canAccessSellerDashboard(role);
  }

  return canAccessExecutiveDashboards(role);
}

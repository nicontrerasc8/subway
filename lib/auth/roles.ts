import type { AppRole } from "@/lib/types/database";

export const importManagerRoles = [
  "administrador_comercial",
] as const satisfies AppRole[];

export const branchImportRoles = [
  "sucursal_1",
  "sucursal_2",
  "sucursal_3",
  "sucursal_4",
  "sucursal_5",
  "sucursal_6",
  "sucursal_7",
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
  sucursal_1: "Sucursal 1",
  sucursal_2: "Sucursal 2",
  sucursal_3: "Sucursal 3",
  sucursal_4: "Sucursal 4",
  sucursal_5: "Sucursal 5",
  sucursal_6: "Sucursal 6",
  sucursal_7: "Sucursal 7",
};

export function canManageImports(role: AppRole) {
  return (importManagerRoles as readonly AppRole[]).includes(role);
}

export function getRoleSucursalId(role: AppRole) {
  if (!(branchImportRoles as readonly AppRole[]).includes(role)) return null;

  return Number(role.replace("sucursal_", ""));
}

export function canImportForBranch(role: AppRole) {
  return getRoleSucursalId(role) !== null;
}

export function canAccessSubwayDashboards(role: AppRole) {
  return !canImportForBranch(role);
}

export function canAccessExecutiveDashboards(role: AppRole) {
  return (executiveDashboardRoles as readonly AppRole[]).includes(role);
}

export function canAccessSellerDashboard(role: AppRole) {
  return (sellerDashboardRoles as readonly AppRole[]).includes(role);
}

export function getDefaultDashboardPath(role?: AppRole) {
  if (role && canImportForBranch(role)) {
    return "/dashboard/imports";
  }

  return "/dashboard";
}

export function canAccessSidebarPath(role: AppRole, path: string) {
  if (path === "/dashboard") {
    return canAccessSubwayDashboards(role);
  }

  if (path.startsWith("/dashboard/subway")) {
    return canAccessSubwayDashboards(role);
  }

  if (path === "/dashboard/imports") {
    return canManageImports(role) || canImportForBranch(role);
  }

  if (path.startsWith("/dashboard/vendedor")) {
    return canAccessSellerDashboard(role);
  }

  return canAccessExecutiveDashboards(role);
}

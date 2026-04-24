import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const PAGE_SIZE = 1000;

type SearchParamValue = string | string[] | undefined;

type ReconciliationRow = {
  import_id: string | null;
  fecha: string | null;
  sucursal_id: number | null;
  sucursal: string | null;
  source_key: string | null;
  total_productos: number | string | null;
  total_pagos: number | string | null;
  total_operaciones: number | string | null;
  diferencia: number | string | null;
};

export type DashboardAuditFilters = {
  year: string | null;
  month: string | null;
};

export type DashboardAuditSearchParams = {
  year?: SearchParamValue;
  month?: SearchParamValue;
};

export type DashboardAuditKpis = {
  totalImports: number;
  balancedImports: number;
  importsWithDelta: number;
  totalProducts: number;
  totalPayments: number;
  totalDelta: number;
};

export type DashboardAuditPoint = {
  label: string;
  value: number;
};

export type DashboardAuditImportPoint = {
  importId: string;
  fecha: string | null;
  sucursal: string;
  sourceKey: string | null;
  totalProductos: number;
  totalPagos: number;
  totalOperaciones: number;
  diferencia: number;
};

export type DashboardAuditData = {
  filters: DashboardAuditFilters;
  availableYears: string[];
  availableMonths: string[];
  activePeriodLabel: string;
  kpis: DashboardAuditKpis;
  deltasByBranch: DashboardAuditPoint[];
  deltaTrend: DashboardAuditPoint[];
  largestDeltas: DashboardAuditImportPoint[];
  recentImports: DashboardAuditImportPoint[];
};

function getParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const parsed = Number(value.replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function getDateYear(value: string | null) {
  if (!value) return null;
  return value.slice(0, 4);
}

function getDateMonth(value: string | null) {
  if (!value) return null;
  return String(Number(value.slice(5, 7)));
}

function getMonthLabel(month: string) {
  return new Intl.DateTimeFormat("es-PE", { month: "short" }).format(
    new Date(2024, Number(month) - 1, 1),
  );
}

async function fetchAllRows<T>(view: string, columns: string) {
  const supabase = await createServerSupabaseClient();
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(view)
      .select(columns)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data ?? []) as T[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

function resolveFilters(searchParams: DashboardAuditSearchParams, rows: ReconciliationRow[]) {
  const requestedYear = getParam(searchParams.year);
  const requestedMonth = getParam(searchParams.month);

  const availableYears = Array.from(
    new Set(rows.map((row) => getDateYear(row.fecha)).filter(Boolean) as string[]),
  ).sort((a, b) => Number(b) - Number(a));
  const availableMonths = Array.from({ length: 12 }, (_, index) => String(index + 1));

  const filters: DashboardAuditFilters = {
    year: requestedYear && availableYears.includes(requestedYear) ? requestedYear : availableYears[0] ?? null,
    month: requestedMonth && availableMonths.includes(requestedMonth) ? requestedMonth : null,
  };

  return {
    filters,
    availableYears,
    availableMonths,
    activePeriodLabel: [
      filters.year ? `Ano ${filters.year}` : "Todos los anos",
      filters.month ? getMonthLabel(filters.month) : "Todos los meses",
      "Control de cuadre",
    ].join(" · "),
  };
}

function matchesFilters(row: { fecha: string | null }, filters: DashboardAuditFilters) {
  if (filters.year && getDateYear(row.fecha) !== filters.year) return false;
  if (filters.month && getDateMonth(row.fecha) !== filters.month) return false;
  return true;
}

export async function getDashboardAudit(
  searchParams: DashboardAuditSearchParams = {},
): Promise<DashboardAuditData> {
  const rows = await fetchAllRows<ReconciliationRow>(
    "v_import_reconciliation",
    "import_id, fecha, sucursal_id, sucursal, source_key, total_productos, total_pagos, total_operaciones, diferencia",
  );

  const { filters, availableYears, availableMonths, activePeriodLabel } = resolveFilters(searchParams, rows);
  const filteredRows = rows.filter((row) => matchesFilters(row, filters));

  const mapped = filteredRows.map((row) => ({
    importId: row.import_id ?? "",
    fecha: row.fecha,
    sucursal: row.sucursal ?? "Sin sucursal",
    sourceKey: row.source_key,
    totalProductos: toNumber(row.total_productos),
    totalPagos: toNumber(row.total_pagos),
    totalOperaciones: toNumber(row.total_operaciones),
    diferencia: toNumber(row.diferencia),
  }));

  const deltasByBranch = Array.from(
    mapped.reduce((map, row) => {
      map.set(row.sucursal, (map.get(row.sucursal) ?? 0) + row.diferencia);
      return map;
    }, new Map<string, number>()),
  )
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .map(([label, value]) => ({ label, value }));

  const deltaTrend = Array.from(
    mapped.reduce((map, row) => {
      const key = row.fecha ?? "Sin fecha";
      map.set(key, (map.get(key) ?? 0) + row.diferencia);
      return map;
    }, new Map<string, number>()),
  )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, value]) => ({ label, value }));

  return {
    filters,
    availableYears,
    availableMonths,
    activePeriodLabel,
    kpis: {
      totalImports: mapped.length,
      balancedImports: mapped.filter((row) => Math.abs(row.diferencia) < 0.01).length,
      importsWithDelta: mapped.filter((row) => Math.abs(row.diferencia) >= 0.01).length,
      totalProducts: mapped.reduce((sum, row) => sum + row.totalProductos, 0),
      totalPayments: mapped.reduce((sum, row) => sum + row.totalPagos, 0),
      totalDelta: mapped.reduce((sum, row) => sum + row.diferencia, 0),
    },
    deltasByBranch,
    deltaTrend,
    largestDeltas: [...mapped].sort((a, b) => Math.abs(b.diferencia) - Math.abs(a.diferencia)).slice(0, 10),
    recentImports: [...mapped].sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? "")).slice(0, 10),
  };
}

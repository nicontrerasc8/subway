import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  formatDateRangeLabel,
  getDateYear,
  getMonthLabel,
  matchesDateRange,
  matchesMonthlyRange,
  resolveDateRangeFilters,
  type DashboardDateRangeFilters,
  type DashboardDateRangeSearchParams,
} from "@/modules/dashboard/lib/date-range-filters";

const PAGE_SIZE = 1000;

type CategoryDailyRow = {
  fecha: string | null;
  sucursal_id: number | null;
  sucursal: string | null;
  categoria: string | null;
  unidades: number | string | null;
  ventas: number | string | null;
};

type ProductDailyRow = {
  fecha: string | null;
  sucursal_id: number | null;
  sucursal: string | null;
  referencia: string | null;
  producto: string | null;
  categoria: string | null;
  unidades: number | string | null;
  ventas: number | string | null;
};

type DailyBranchRow = {
  fecha: string | null;
  sucursal_id: number | null;
  sucursal: string | null;
  ventas_totales: number | string | null;
  unidades_totales: number | string | null;
  productos_distintos: number | string | null;
};

type CategoryMonthlyRow = {
  mes: string | null;
  anio: number | null;
  mes_num: number | null;
  categoria: string | null;
  unidades: number | string | null;
  ventas: number | string | null;
};

type ProductGlobalRow = {
  referencia: string | null;
  producto: string | null;
  categoria: string | null;
  unidades: number | string | null;
  ventas: number | string | null;
};

export type DashboardMixFilters = DashboardDateRangeFilters;

export type DashboardMixSearchParams = DashboardDateRangeSearchParams;

export type DashboardMixPoint = {
  label: string;
  value: number;
};

export type DashboardMixProductPoint = {
  referencia: string;
  producto: string;
  categoria: string;
  ventas: number;
  unidades: number;
};

export type DashboardMixBranchPoint = {
  branch: string;
  sales: number;
  units: number;
  products: number;
};

export type DashboardMixData = {
  filters: DashboardMixFilters;
  availableYears: string[];
  availableMonths: string[];
  activePeriodLabel: string;
  topCategories: DashboardMixPoint[];
  categoryUnits: DashboardMixPoint[];
  monthlyCategoryTrend: Array<{ label: string; [key: string]: string | number }>;
  categoryKeys: string[];
  topProducts: DashboardMixProductPoint[];
  globalProducts: DashboardMixProductPoint[];
  topBranches: DashboardMixBranchPoint[];
};

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const parsed = Number(value.replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : 0;
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

function resolveFilters(searchParams: DashboardMixSearchParams, rows: CategoryDailyRow[]) {
  const availableYears = Array.from(
    new Set(rows.map((row) => getDateYear(row.fecha)).filter(Boolean) as string[]),
  ).sort((a, b) => Number(b) - Number(a));
  const filters = resolveDateRangeFilters(searchParams, availableYears);

  return {
    filters,
    availableYears,
    availableMonths: [],
    activePeriodLabel: [
      formatDateRangeLabel(filters),
      "Mix comercial",
    ].join(" · "),
  };
}

function matchesFilters(row: { fecha: string | null }, filters: DashboardMixFilters) {
  return matchesDateRange(row.fecha, filters);
}

export async function getDashboardMix(
  searchParams: DashboardMixSearchParams = {},
): Promise<DashboardMixData> {
  const [categoryRows, productRows, branchRows, categoryMonthlyRows, productGlobalRows] = await Promise.all([
    fetchAllRows<CategoryDailyRow>(
      "v_sales_category_daily",
      "fecha, sucursal_id, sucursal, categoria, unidades, ventas",
    ),
    fetchAllRows<ProductDailyRow>(
      "v_sales_product_daily",
      "fecha, sucursal_id, sucursal, referencia, producto, categoria, unidades, ventas",
    ),
    fetchAllRows<DailyBranchRow>(
      "v_kpi_daily_branch_full",
      "fecha, sucursal_id, sucursal, ventas_totales, unidades_totales, productos_distintos",
    ),
    fetchAllRows<CategoryMonthlyRow>(
      "v_sales_category_monthly",
      "mes, anio, mes_num, categoria, unidades, ventas",
    ),
    fetchAllRows<ProductGlobalRow>(
      "v_sales_product_global",
      "referencia, producto, categoria, unidades, ventas",
    ),
  ]);

  const { filters, availableYears, availableMonths, activePeriodLabel } = resolveFilters(searchParams, categoryRows);
  const filteredCategories = categoryRows.filter((row) => matchesFilters(row, filters));
  const filteredProducts = productRows.filter((row) => matchesFilters(row, filters));
  const filteredBranches = branchRows.filter((row) => matchesFilters(row, filters));
  const filteredCategoryMonthly = categoryMonthlyRows.filter((row) =>
    matchesMonthlyRange(row, filters),
  );

  const topCategories = Array.from(
    filteredCategories.reduce((map, row) => {
      const key = row.categoria ?? "Sin categoria";
      map.set(key, (map.get(key) ?? 0) + toNumber(row.ventas));
      return map;
    }, new Map<string, number>()),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }));

  const categoryUnits = Array.from(
    filteredCategories.reduce((map, row) => {
      const key = row.categoria ?? "Sin categoria";
      map.set(key, (map.get(key) ?? 0) + toNumber(row.unidades));
      return map;
    }, new Map<string, number>()),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }));

  const topProducts = Array.from(
    filteredProducts.reduce((map, row) => {
      const key = row.referencia ?? row.producto ?? "sin-producto";
      const current = map.get(key) ?? {
        referencia: row.referencia ?? "-",
        producto: row.producto ?? "Sin producto",
        categoria: row.categoria ?? "Sin categoria",
        ventas: 0,
        unidades: 0,
      };
      current.ventas += toNumber(row.ventas);
      current.unidades += toNumber(row.unidades);
      map.set(key, current);
      return map;
    }, new Map<string, DashboardMixProductPoint>()),
  )
    .map(([, value]) => value)
    .sort((a, b) => b.ventas - a.ventas)
    .slice(0, 10);

  const globalProducts = productGlobalRows
    .map((row) => ({
      referencia: row.referencia ?? "-",
      producto: row.producto ?? "Sin producto",
      categoria: row.categoria ?? "Sin categoria",
      ventas: toNumber(row.ventas),
      unidades: toNumber(row.unidades),
    }))
    .sort((a, b) => b.ventas - a.ventas)
    .slice(0, 10);

  const monthlyCategoryMap = new Map<string, { label: string; [key: string]: string | number }>();
  const categoryKeySet = new Set<string>();

  for (const row of filteredCategoryMonthly) {
    const monthLabel = row.mes_num ? getMonthLabel(String(row.mes_num), "short") : "Sin mes";
    const category = row.categoria ?? "Sin categoria";
    categoryKeySet.add(category);

    const current = monthlyCategoryMap.get(monthLabel) ?? { label: monthLabel };
    current[category] = Number(current[category] ?? 0) + toNumber(row.ventas);
    monthlyCategoryMap.set(monthLabel, current);
  }

  const monthlyCategoryTrend = [...monthlyCategoryMap.values()];
  const categoryKeys = [...categoryKeySet].sort((a, b) => a.localeCompare(b)).slice(0, 6);

  const topBranches = Array.from(
    filteredBranches.reduce((map, row) => {
      const key = row.sucursal ?? "Sin sucursal";
      const current = map.get(key) ?? { branch: key, sales: 0, units: 0, products: 0, days: 0 };
      current.sales += toNumber(row.ventas_totales);
      current.units += toNumber(row.unidades_totales);
      current.products += toNumber(row.productos_distintos);
      current.days += 1;
      map.set(key, current);
      return map;
    }, new Map<string, DashboardMixBranchPoint & { days: number }>()),
  )
    .map(([, value]) => ({
      branch: value.branch,
      sales: value.sales,
      units: value.units,
      products: value.days > 0 ? value.products / value.days : 0,
    }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 8);

  return {
    filters,
    availableYears,
    availableMonths,
    activePeriodLabel,
    topCategories,
    categoryUnits,
    monthlyCategoryTrend,
    categoryKeys,
    topProducts,
    globalProducts,
    topBranches,
  };
}

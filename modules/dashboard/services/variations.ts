import "server-only";

import { executiveDashboardRoles } from "@/lib/auth/roles";
import { requireRoleAccess } from "@/lib/auth/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/types/database";

export type VariationRow = {
  importYear: number;
  negocio: string | null;
  grupo: string | null;
  periodo: string | null;
  linea: string;
  previousReal: number;
  currentBudget: number;
  currentReal: number;
  grossMargin: number | null;
};

export type VariationsSummary = {
  years: number[];
  negocios: string[];
  grupos: string[];
  periodos: string[];
  lineas: string[];
  rows: VariationRow[];
};

const MONTHLY_ACCOUNTING_FIELDS = [
  { periodo: "Enero", ventas: "enero_ventas", margenBruto: "enero_margen_bruto" },
  { periodo: "Febrero", ventas: "febrero_ventas", margenBruto: "febrero_margen_bruto" },
  { periodo: "Marzo", ventas: "marzo_ventas", margenBruto: "marzo_margen_bruto" },
  { periodo: "Abril", ventas: "abril_ventas", margenBruto: "abril_margen_bruto" },
  { periodo: "Mayo", ventas: "mayo_ventas", margenBruto: "mayo_margen_bruto" },
  { periodo: "Junio", ventas: "junio_ventas", margenBruto: "junio_margen_bruto" },
  { periodo: "Julio", ventas: "julio_ventas", margenBruto: "julio_margen_bruto" },
  { periodo: "Agosto", ventas: "agosto_ventas", margenBruto: "agosto_margen_bruto" },
  { periodo: "Setiembre", ventas: "setiembre_ventas", margenBruto: "setiembre_margen_bruto" },
  { periodo: "Octubre", ventas: "octubre_ventas", margenBruto: "octubre_margen_bruto" },
  { periodo: "Noviembre", ventas: "noviembre_ventas", margenBruto: "noviembre_margen_bruto" },
  { periodo: "Diciembre", ventas: "diciembre_ventas", margenBruto: "diciembre_margen_bruto" },
] as const;
const MONTHLY_ACCOUNTING_AMOUNT_MULTIPLIER = 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  let normalized = trimmed
    .replace(/\s/g, "")
    .replace(/\$/g, "")
    .replace(/S\/\./gi, "")
    .replace(/S\//gi, "");

  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");

  if (hasComma && hasDot) {
    normalized = normalized.replace(/,/g, "");
  } else if (hasComma) {
    normalized = normalized.replace(",", ".");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeMonthlyAccountingSales(value: unknown) {
  const amount = normalizeNumber(value);
  return amount === null ? null : amount * MONTHLY_ACCOUNTING_AMOUNT_MULTIPLIER;
}

function normalizeMonthlyAccountingGrossMargin(marginValue: unknown, salesAmount: number | null) {
  const margin = normalizeNumber(marginValue);
  if (margin === null || salesAmount === null) return null;

  const ratio = Math.abs(margin) <= 1 ? margin : margin / 100;
  return salesAmount * ratio;
}

async function getLineToBusinessMap() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("imports_subway")
    .select("data, status")
    .eq("status", "processed");

  const lineBusinessCount = new Map<string, Map<string, number>>();

  if (error || !data) return new Map<string, string>();

  for (const item of data as Array<{ data?: unknown }>) {
    if (!isRecord(item.data) || !Array.isArray(item.data.rows)) continue;

    for (const rawRow of item.data.rows) {
      if (!isRecord(rawRow) || !isRecord(rawRow.payload)) continue;

      const linea = normalizeText(rawRow.payload.linea);
      const negocio = normalizeText(rawRow.payload.negocio);

      if (!linea || !negocio) continue;

      const current = lineBusinessCount.get(linea) ?? new Map<string, number>();
      current.set(negocio, (current.get(negocio) ?? 0) + 1);
      lineBusinessCount.set(linea, current);
    }
  }

  const resolved = new Map<string, string>();

  for (const [linea, negocioMap] of lineBusinessCount.entries()) {
    const best = [...negocioMap.entries()].sort((a, b) => b[1] - a[1])[0];
    if (best) resolved.set(linea, best[0]);
  }

  return resolved;
}

export async function getVariationsSummary(): Promise<VariationsSummary> {
  await requireRoleAccess([...executiveDashboardRoles] as AppRole[]);

  const supabase = await createServerSupabaseClient();
  const [{ data, error }, lineToBusiness] = await Promise.all([
    supabase
      .from("accounting_imports")
      .select("anio, data, status")
      .eq("status", "processed")
      .order("anio", { ascending: false }),
    getLineToBusinessMap(),
  ]);

  if (error || !data) {
    return {
      years: [],
      negocios: [],
      grupos: [],
      periodos: [],
      lineas: [],
      rows: [],
    };
  }

  const rows: VariationRow[] = [];
  const yearSet = new Set<number>();
  const negocioSet = new Set<string>();
  const grupoSet = new Set<string>();
  const periodoSet = new Set<string>();
  const lineaSet = new Set<string>();

  for (const item of data as Array<{ anio: number; data?: unknown }>) {
    yearSet.add(item.anio);

    if (!isRecord(item.data) || !Array.isArray(item.data.rows)) continue;

    for (const rawRow of item.data.rows) {
      if (!isRecord(rawRow) || !isRecord(rawRow.payload)) continue;

      const payload = rawRow.payload;
      const linea = normalizeText(payload.linea);
      const negocioDirecto = normalizeText(payload.negocio);
      const grupo = normalizeText(payload.grupo);
      const periodo = normalizeText(payload.periodo);
      const hasMonthlyAccountingFields = MONTHLY_ACCOUNTING_FIELDS.some(
        (field) => field.ventas in payload || field.margenBruto in payload,
      );

      if (hasMonthlyAccountingFields) {
        if (!linea) continue;

        const negocio = negocioDirecto ?? lineToBusiness.get(linea) ?? null;
        lineaSet.add(linea);
        if (negocio) negocioSet.add(negocio);
        if (grupo) grupoSet.add(grupo);

        for (const field of MONTHLY_ACCOUNTING_FIELDS) {
          const ventas = normalizeMonthlyAccountingSales(payload[field.ventas]);
          const grossMargin = normalizeMonthlyAccountingGrossMargin(payload[field.margenBruto], ventas);

          if (ventas === null && grossMargin === null) continue;

          periodoSet.add(field.periodo);
          rows.push({
            importYear: item.anio,
            negocio,
            grupo,
            periodo: field.periodo,
            linea,
            previousReal: 0,
            currentBudget: 0,
            currentReal: ventas ?? 0,
            grossMargin,
          });
        }

        continue;
      }

      const previousReal = normalizeNumber(payload.anio_anterior_real);
      const currentBudget = normalizeNumber(payload.anio_actual_ppto);
      const currentReal = normalizeNumber(payload.anio_actual_real);
      const grossMargin = normalizeNumber(payload.mb);

      if (!linea || previousReal === null || currentBudget === null || currentReal === null) {
        continue;
      }

      lineaSet.add(linea);

      const negocio = negocioDirecto ?? lineToBusiness.get(linea) ?? null;
      if (negocio) negocioSet.add(negocio);
      if (grupo) grupoSet.add(grupo);
      if (periodo) periodoSet.add(periodo);

      rows.push({
        importYear: item.anio,
        negocio,
        grupo,
        periodo,
        linea,
        previousReal,
        currentBudget,
        currentReal,
        grossMargin,
      });
    }
  }

  return {
    years: [...yearSet].sort((a, b) => b - a),
    negocios: [...negocioSet].sort((a, b) => a.localeCompare(b)),
    grupos: [...grupoSet].sort((a, b) => a.localeCompare(b)),
    periodos: [...periodoSet],
    lineas: [...lineaSet].sort((a, b) => a.localeCompare(b)),
    rows,
  };
}

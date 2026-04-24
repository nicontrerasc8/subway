import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SubwaySaleRow = {
  id: number;
  importId: string;
  fileName: string;
  uploadedAt: string;
  fecha: string | null;
  anio: number | null;
  sourceKey: string | null;
  sucursalId: number | null;
  sucursal: string | null;
  rowNumber: number;
  referencia: string;
  descripcion: string;
  categoria: string;
  unidades: number;
  total: number;
};

export type SubwayPaymentRow = {
  id: number;
  importId: string;
  fileName: string;
  uploadedAt: string;
  fecha: string | null;
  anio: number | null;
  sourceKey: string | null;
  sucursalId: number | null;
  sucursal: string | null;
  rowNumber: number;
  formaPago: string;
  importe: number;
  numeroOperaciones: number;
};

export type SubwaySalesSummary = {
  importCount: number;
  paymentImportCount: number;
  rowCount: number;
  paymentRowCount: number;
  totalUnits: number;
  totalSales: number;
  totalPaymentAmount: number;
  totalOperations: number;
  averageTicket: number;
  rows: SubwaySaleRow[];
  paymentRows: SubwayPaymentRow[];
};

type SalesProductDetailRow = {
  id: number;
  import_id: string | null;
  fecha: string | null;
  anio: number | null;
  source_key: string | null;
  sucursal_id: number | null;
  sucursal: string | null;
  referencia: string | null;
  producto: string | null;
  categoria: string | null;
  unidades: number | string | null;
  ventas: number | string | null;
  created_at: string | null;
};

type SalesPaymentDetailRow = {
  id: number;
  import_id: string | null;
  fecha: string | null;
  anio: number | null;
  source_key: string | null;
  sucursal_id: number | null;
  sucursal: string | null;
  forma_pago: string | null;
  importe: number | string | null;
  operaciones: number | string | null;
  created_at: string | null;
};

const PAGE_SIZE = 1000;

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;

  const parsed = Number(value.replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function toText(value: unknown, fallback = "") {
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number") return String(value);
  return fallback;
}

async function fetchSalesProductDetails() {
  const supabase = await createServerSupabaseClient();
  const rows: SalesProductDetailRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("v_sales_product_detail")
      .select("id, import_id, fecha, anio, source_key, sucursal_id, sucursal, referencia, producto, categoria, unidades, ventas, created_at")
      .order("fecha", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data ?? []) as SalesProductDetailRow[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function fetchSalesPaymentDetails() {
  const supabase = await createServerSupabaseClient();
  const rows: SalesPaymentDetailRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("v_sales_payment_detail")
      .select("id, import_id, fecha, anio, source_key, sucursal_id, sucursal, forma_pago, importe, operaciones, created_at")
      .order("fecha", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data ?? []) as SalesPaymentDetailRow[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

export async function getSubwaySalesSummary(): Promise<SubwaySalesSummary> {
  let salesFacts: SalesProductDetailRow[] = [];
  let paymentFacts: SalesPaymentDetailRow[] = [];

  try {
    [salesFacts, paymentFacts] = await Promise.all([
      fetchSalesProductDetails(),
      fetchSalesPaymentDetails(),
    ]);
  } catch (error) {
    console.error("[dashboard][subway-sales] Error al leer vistas Subway", error);

    return {
      importCount: 0,
      paymentImportCount: 0,
      rowCount: 0,
      paymentRowCount: 0,
      totalUnits: 0,
      totalSales: 0,
      totalPaymentAmount: 0,
      totalOperations: 0,
      averageTicket: 0,
      rows: [],
      paymentRows: [],
    };
  }

  const rows = salesFacts.map((fact, index) => ({
    id: fact.id,
    importId: fact.import_id ?? "",
    fileName: "v_sales_product_detail",
    uploadedAt: fact.created_at ?? fact.fecha ?? "",
    fecha: fact.fecha,
    anio: fact.anio,
    sourceKey: fact.source_key,
    sucursalId: fact.sucursal_id,
    sucursal: fact.sucursal,
    rowNumber: index + 1,
    referencia: toText(fact.referencia),
    descripcion: toText(fact.producto),
    categoria: toText(fact.categoria, "OTROS"),
    unidades: toNumber(fact.unidades),
    total: toNumber(fact.ventas),
  }));

  const paymentRows = paymentFacts.map((fact, index) => ({
    id: fact.id,
    importId: fact.import_id ?? "",
    fileName: "v_sales_payment_detail",
    uploadedAt: fact.created_at ?? fact.fecha ?? "",
    fecha: fact.fecha,
    anio: fact.anio,
    sourceKey: fact.source_key,
    sucursalId: fact.sucursal_id,
    sucursal: fact.sucursal,
    rowNumber: index + 1,
    formaPago: toText(fact.forma_pago),
    importe: toNumber(fact.importe),
    numeroOperaciones: toNumber(fact.operaciones),
  }));

  const totalUnits = rows.reduce((sum, row) => sum + row.unidades, 0);
  const totalSales = rows.reduce((sum, row) => sum + row.total, 0);
  const totalPaymentAmount = paymentRows.reduce((sum, row) => sum + row.importe, 0);
  const totalOperations = paymentRows.reduce((sum, row) => sum + row.numeroOperaciones, 0);

  return {
    importCount: new Set(rows.map((row) => row.importId)).size,
    paymentImportCount: new Set(paymentRows.map((row) => row.importId)).size,
    rowCount: rows.length,
    paymentRowCount: paymentRows.length,
    totalUnits,
    totalSales,
    totalPaymentAmount,
    totalOperations,
    averageTicket: totalUnits > 0 ? totalSales / totalUnits : 0,
    rows,
    paymentRows,
  };
}

import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SubwaySaleRow = {
  importId: string;
  fileName: string;
  uploadedAt: string;
  fecha: string | null;
  rowNumber: number;
  referencia: string;
  descripcion: string;
  unidades: number;
  total: number;
};

export type SubwayPaymentRow = {
  importId: string;
  fileName: string;
  uploadedAt: string;
  fecha: string | null;
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

type SalesProductFactRow = {
  import_id: string | null;
  row_number: number;
  fecha: string;
  referencia: string | null;
  producto: string;
  unidades: number | string | null;
  ventas: number | string | null;
  created_at: string | null;
};

type SalesPaymentFactRow = {
  import_id: string | null;
  row_number: number;
  fecha: string;
  forma_pago: string;
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

function toText(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

async function fetchSalesProductFacts() {
  const supabase = await createServerSupabaseClient();
  const rows: SalesProductFactRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("sales_product")
      .select("import_id, row_number, fecha, referencia, producto, unidades, ventas, created_at")
      .order("fecha", { ascending: true })
      .order("row_number", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data ?? []) as SalesProductFactRow[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function fetchSalesPaymentFacts() {
  const supabase = await createServerSupabaseClient();
  const rows: SalesPaymentFactRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("sales_payment")
      .select("import_id, row_number, fecha, forma_pago, importe, operaciones, created_at")
      .order("fecha", { ascending: true })
      .order("row_number", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data ?? []) as SalesPaymentFactRow[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

export async function getSubwaySalesSummary(): Promise<SubwaySalesSummary> {
  let salesFacts: SalesProductFactRow[] = [];
  let paymentFacts: SalesPaymentFactRow[] = [];

  try {
    [salesFacts, paymentFacts] = await Promise.all([
      fetchSalesProductFacts(),
      fetchSalesPaymentFacts(),
    ]);
  } catch (error) {
    console.error("[dashboard][subway-sales] Error al leer sales_product/sales_payment", error);

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

  const rows = salesFacts.map((fact) => ({
    importId: fact.import_id ?? "",
    fileName: "sales_product",
    uploadedAt: fact.created_at ?? fact.fecha,
    fecha: fact.fecha,
    rowNumber: fact.row_number,
    referencia: toText(fact.referencia),
    descripcion: fact.producto,
    unidades: toNumber(fact.unidades),
    total: toNumber(fact.ventas),
  }));

  const paymentRows = paymentFacts.map((fact) => ({
    importId: fact.import_id ?? "",
    fileName: "sales_payment",
    uploadedAt: fact.created_at ?? fact.fecha,
    fecha: fact.fecha,
    rowNumber: fact.row_number,
    formaPago: fact.forma_pago,
    importe: toNumber(fact.importe),
    numeroOperaciones: toNumber(fact.operaciones),
  }));

  const totalUnits = rows.reduce((sum, row) => sum + row.unidades, 0);
  const totalSales = rows.reduce((sum, row) => sum + row.total, 0);
  const totalPaymentAmount = paymentRows.reduce((sum, row) => sum + row.importe, 0);
  const totalOperations = paymentRows.reduce((sum, row) => sum + row.numeroOperaciones, 0);

  return {
    importCount: new Set(rows.map((row) => row.importId || row.fecha || "")).size,
    paymentImportCount: new Set(paymentRows.map((row) => row.importId || row.fecha || "")).size,
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

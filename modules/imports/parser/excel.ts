import ExcelJS from "exceljs";

import {
  normalizeExcelCellValue,
  parseFlexibleNumber,
  type ParsedAxRow,
} from "@/modules/imports/parser/ax-normalizer";

const SUBWAY_IMPORT_COLUMNS = [
  "referencia",
  "descripcion",
  "unidades",
  "total",
] as const;

const FORMA_PEDIDO_IMPORT_COLUMNS = [
  "forma_pago",
  "importe",
  "numero_operaciones",
] as const;

const SUBWAY_SALES_IVA_FACTOR = 1.185;

export const subwayImportSourceKeys = ["ax-commercial", "ax_forma_pedido"] as const;

export type SubwayImportSourceKey = (typeof subwayImportSourceKeys)[number];

function normalizeText(value: unknown) {
  const normalized = normalizeExcelCellValue(value);
  if (typeof normalized === "number") return String(normalized);
  if (typeof normalized !== "string") return "";
  return normalized.trim();
}

function isIgnoredText(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  return (
    normalized === "" ||
    normalized === "referencia" ||
    normalized === "descripcion" ||
    normalized === "unidades" ||
    normalized === "total" ||
    normalized.includes("total seccion")
  );
}

function isIgnoredPaymentText(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  return (
    normalized === "" ||
    normalized === "forma de pago" ||
    normalized === "forma pago" ||
    normalized === "importe" ||
    normalized === "numero de operaciones" ||
    normalized === "nro operaciones" ||
    normalized.includes("total")
  );
}

export interface ParsedWorkbookPreview {
  sheetName: string;
  columns: string[];
  previewRows: Record<string, unknown>[];
  parsedRows: ParsedAxRow[];
}

function parseCommercialWorksheet(worksheet: ExcelJS.Worksheet) {
  const parsedRows: ParsedAxRow[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (row.cellCount === 0) return;

    const referencia = normalizeText(row.getCell("A").value);
    const descripcion = normalizeText(row.getCell("H").value);
    const unidades = parseFlexibleNumber(normalizeExcelCellValue(row.getCell("M").value));
    const totalSinIva = parseFlexibleNumber(normalizeExcelCellValue(row.getCell("O").value));
    const total = totalSinIva === null ? null : totalSinIva * SUBWAY_SALES_IVA_FACTOR;
    const hasProductRef = referencia !== "" && !isIgnoredText(referencia);

    if (!hasProductRef) return;

    if (isIgnoredText(descripcion)) return;

    const payload = {
      referencia,
      descripcion,
      unidades,
      total,
    };

    parsedRows.push({
      rowNumber,
      payload,
      parseStatus: "valid",
      parseErrors: [],
    });
  });

  return {
    columns: [...SUBWAY_IMPORT_COLUMNS],
    parsedRows,
  };
}

function parseFormaPedidoWorksheet(worksheet: ExcelJS.Worksheet) {
  const parsedRows: ParsedAxRow[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (row.cellCount === 0) return;

    const formaPago = normalizeText(row.getCell("A").value);
    const importe = parseFlexibleNumber(normalizeExcelCellValue(row.getCell("I").value));
    const numeroOperaciones = parseFlexibleNumber(
      normalizeExcelCellValue(row.getCell("O").value),
    );
    const hasPaymentMethod = formaPago !== "" && !isIgnoredPaymentText(formaPago);

    if (!hasPaymentMethod) return;

    const payload = {
      forma_pago: formaPago,
      importe,
      numero_operaciones: numeroOperaciones,
    };

    parsedRows.push({
      rowNumber,
      payload,
      parseStatus: "valid",
      parseErrors: [],
    });
  });

  return {
    columns: [...FORMA_PEDIDO_IMPORT_COLUMNS],
    parsedRows,
  };
}

export async function parseAxWorkbook(
  file: File,
  sourceKey: SubwayImportSourceKey = "ax-commercial",
) {
  const workbook = new ExcelJS.Workbook();
  const buffer = Buffer.from(await file.arrayBuffer());

  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error("El archivo no contiene hojas de calculo.");
  }

  const parsed =
    sourceKey === "ax_forma_pedido"
      ? parseFormaPedidoWorksheet(worksheet)
      : parseCommercialWorksheet(worksheet);

  console.groupCollapsed("[imports][parser] Excel recibido");
  console.log("archivo", file.name);
  console.log("source_key", sourceKey);
  console.log("hoja", worksheet.name);
  console.log("columnas_detectadas", parsed.columns);
  console.log("total_filas_parseadas", parsed.parsedRows.length);
  console.log(
    "filas_con_error",
    parsed.parsedRows.filter((row) => row.parseStatus === "error").map((row) => ({
      rowNumber: row.rowNumber,
      parseErrors: row.parseErrors,
      payload: row.payload,
    })),
  );
  console.log(
    "muestra_filas_crudas",
    parsed.parsedRows.slice(0, 5).map((row) => ({
      rowNumber: row.rowNumber,
      payload: row.payload,
    })),
  );
  console.log(
    "muestra_filas_parseadas",
    parsed.parsedRows.slice(0, 5).map((row) => ({
      rowNumber: row.rowNumber,
      parseStatus: row.parseStatus,
      parseErrors: row.parseErrors,
      payload: row.payload,
    })),
  );
  console.groupEnd();

  return {
    sheetName: worksheet.name,
    columns: parsed.columns,
    previewRows: parsed.parsedRows.slice(0, 5).map((row) => row.payload),
    parsedRows: parsed.parsedRows,
  } satisfies ParsedWorkbookPreview;
}

import ExcelJS from "exceljs";

import { normalizeExcelCellValue } from "@/modules/imports/parser/ax-normalizer";

const ACCOUNTING_SECTION_MARKERS = {
  "1. TENSOESTRUCTURA": "Tensoestructura",
  GEOSINTETICOS: "Geosinteticos",
  INDUSTRIAL: "Industrial",
} as const;

const ACCOUNTING_ROWS_BELOW_SECTION_MARKERS = {
  COMERCIAL: "Comercial",
  INDUSTRIAL: "Industrial",
} as const;

const ACCOUNTING_ROWS_BELOW_SECTION_TOTAL_MARKERS = {
  "TOTAL COMERCIAL": "Comercial",
  "TOTAL INDUSTRIAL": "Industrial",
} as const;

const MONTH_COLUMN_PAIRS = [
  { mes: "enero", ventas: "columna_b", margenBruto: "columna_c" },
  { mes: "febrero", ventas: "columna_d", margenBruto: "columna_e" },
  { mes: "marzo", ventas: "columna_f", margenBruto: "columna_g" },
  { mes: "abril", ventas: "columna_h", margenBruto: "columna_i" },
  { mes: "mayo", ventas: "columna_j", margenBruto: "columna_k" },
  { mes: "junio", ventas: "columna_l", margenBruto: "columna_m" },
  { mes: "julio", ventas: "columna_n", margenBruto: "columna_o" },
  { mes: "agosto", ventas: "columna_p", margenBruto: "columna_q" },
  { mes: "setiembre", ventas: "columna_r", margenBruto: "columna_s" },
  { mes: "octubre", ventas: "columna_t", margenBruto: "columna_u" },
  { mes: "noviembre", ventas: "columna_v", margenBruto: "columna_w" },
  { mes: "diciembre", ventas: "columna_x", margenBruto: "columna_y" },
] as const;
const LAST_ACCOUNTING_COLUMN_NUMBER = 25;

type AccountingRowsBelowSection =
  (typeof ACCOUNTING_ROWS_BELOW_SECTION_MARKERS)[keyof typeof ACCOUNTING_ROWS_BELOW_SECTION_MARKERS];

export type AccountingMonthlySectionRow = {
  fila_excel: number;
  linea: unknown;
  meses: Record<
    (typeof MONTH_COLUMN_PAIRS)[number]["mes"],
    {
      ventas: unknown;
      margen_bruto: unknown;
    }
  >;
};

export interface ParsedAccountingRow {
  rowNumber: number;
  payload: Record<string, unknown>;
  parseStatus: "valid" | "error";
  parseErrors: string[];
}

export interface ParsedAccountingWorkbookPreview {
  sheetName: string;
  columns: string[];
  previewRows: Record<string, unknown>[];
  parsedRows: ParsedAccountingRow[];
  rowsBelowSections: Record<AccountingRowsBelowSection, ParsedAccountingRow[]>;
  monthlyRowsBySection: Record<AccountingRowsBelowSection, AccountingMonthlySectionRow[]>;
}

function getExcelColumnName(columnNumber: number) {
  let current = columnNumber;
  let columnName = "";

  while (current > 0) {
    const modulo = (current - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    current = Math.floor((current - modulo) / 26);
  }

  return columnName;
}

function getColumnKey(columnNumber: number) {
  return `columna_${getExcelColumnName(columnNumber).toLowerCase()}`;
}

function normalizeAccountingMarker(value: unknown) {
  if (typeof value !== "string") return null;

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function getColumnAMarker(value: unknown) {
  const normalized = normalizeAccountingMarker(value);
  if (!normalized) return null;

  return (
    ACCOUNTING_SECTION_MARKERS[
      normalized as keyof typeof ACCOUNTING_SECTION_MARKERS
    ] ?? null
  );
}

function getRowsBelowSectionMarker(value: unknown) {
  const normalized = normalizeAccountingMarker(value);
  if (!normalized) return null;

  return (
    ACCOUNTING_ROWS_BELOW_SECTION_MARKERS[
      normalized as keyof typeof ACCOUNTING_ROWS_BELOW_SECTION_MARKERS
    ] ?? null
  );
}

function getRowsBelowSectionTotalMarker(value: unknown) {
  const normalized = normalizeAccountingMarker(value);
  if (!normalized) return null;

  return (
    ACCOUNTING_ROWS_BELOW_SECTION_TOTAL_MARKERS[
      normalized as keyof typeof ACCOUNTING_ROWS_BELOW_SECTION_TOTAL_MARKERS
    ] ?? null
  );
}

function getRowValues(row: ExcelJS.Row) {
  const rawValues = row.values as unknown[];
  const highestColumnNumber = Math.min(
    Math.max(rawValues.length - 1, row.cellCount),
    LAST_ACCOUNTING_COLUMN_NUMBER,
  );

  return Array.from({ length: highestColumnNumber }, (_, index) =>
    normalizeExcelCellValue(rawValues[index + 1]),
  );
}

function buildAccountingPayload(values: unknown[]) {
  const payload = values.reduce<Record<string, unknown>>((acc, value, index) => {
    acc[getColumnKey(index + 1)] = value;
    return acc;
  }, {});
  const columnAMarker = getColumnAMarker(payload.columna_a);

  if (columnAMarker) {
    payload.marca_columna_a = columnAMarker;
  }

  return payload;
}

function getRowsBelowSections(rows: ParsedAccountingRow[]) {
  const rowsBelowSections: Record<AccountingRowsBelowSection, ParsedAccountingRow[]> = {
    Comercial: [],
    Industrial: [],
  };
  let activeSection: AccountingRowsBelowSection | null = null;

  for (const row of rows) {
    const sectionMarker = getRowsBelowSectionMarker(row.payload.columna_a);
    const totalMarker = getRowsBelowSectionTotalMarker(row.payload.columna_a);

    if (sectionMarker) {
      activeSection = sectionMarker;
      continue;
    }

    if (totalMarker && totalMarker === activeSection) {
      activeSection = null;
      continue;
    }

    if (activeSection) {
      rowsBelowSections[activeSection].push(row);
    }
  }

  return rowsBelowSections;
}

function buildMonthlySectionRows(rows: ParsedAccountingRow[]) {
  return rows.map((row) => ({
    fila_excel: row.rowNumber,
    linea: row.payload.columna_a,
    meses: Object.fromEntries(
      MONTH_COLUMN_PAIRS.map((month) => [
        month.mes,
        {
          ventas: row.payload[month.ventas],
          margen_bruto: row.payload[month.margenBruto],
        },
      ]),
    ) as AccountingMonthlySectionRow["meses"],
  }));
}

function buildMonthlyRowsBySection(
  rowsBelowSections: Record<AccountingRowsBelowSection, ParsedAccountingRow[]>,
) {
  return {
    Comercial: buildMonthlySectionRows(rowsBelowSections.Comercial),
    Industrial: buildMonthlySectionRows(rowsBelowSections.Industrial),
  } satisfies Record<AccountingRowsBelowSection, AccountingMonthlySectionRow[]>;
}

export async function parseAccountingWorkbook(file: File) {
  const workbook = new ExcelJS.Workbook();
  const buffer = Buffer.from(await file.arrayBuffer());

  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error("El archivo no contiene hojas de calculo.");
  }

  const parsedRows: ParsedAccountingRow[] = [];
  let maxColumnCount = 0;

  worksheet.eachRow((row, rowNumber) => {
    if (row.cellCount === 0) return;

    const values = getRowValues(row);
    const hasContent = values.some((value) => value !== "");

    if (!hasContent) return;

    maxColumnCount = Math.max(maxColumnCount, values.length);

    parsedRows.push({
      rowNumber,
      payload: buildAccountingPayload(values),
      parseStatus: "valid",
      parseErrors: [],
    });
  });

  const rowsBelowSections = getRowsBelowSections(parsedRows);
  const monthlyRowsBySection = buildMonthlyRowsBySection(rowsBelowSections);

  console.groupCollapsed("[accounting-imports][parser] Excel recibido");
  console.log("archivo", file.name);
  console.log("hoja", worksheet.name);
  console.log(
    "marcas_columna_a",
    Object.entries(ACCOUNTING_SECTION_MARKERS).map(([texto, marca]) => ({
      texto,
      marca,
    })),
  );
  console.log("total_filas_parseadas", parsedRows.length);
  console.log("filas_debajo_de_comercial", rowsBelowSections.Comercial.length);
  console.log("filas_mensuales_comercial", monthlyRowsBySection.Comercial.length);
  console.table(
    monthlyRowsBySection.Comercial.slice(0, 10).map((row) => ({
      fila_excel: row.fila_excel,
      linea: row.linea,
      enero_ventas: row.meses.enero.ventas,
      enero_margen_bruto: row.meses.enero.margen_bruto,
      febrero_ventas: row.meses.febrero.ventas,
      febrero_margen_bruto: row.meses.febrero.margen_bruto,
      marzo_ventas: row.meses.marzo.ventas,
      marzo_margen_bruto: row.meses.marzo.margen_bruto,
      abril_ventas: row.meses.abril.ventas,
      abril_margen_bruto: row.meses.abril.margen_bruto,
      mayo_ventas: row.meses.mayo.ventas,
      mayo_margen_bruto: row.meses.mayo.margen_bruto,
      junio_ventas: row.meses.junio.ventas,
      junio_margen_bruto: row.meses.junio.margen_bruto,
      julio_ventas: row.meses.julio.ventas,
      julio_margen_bruto: row.meses.julio.margen_bruto,
      agosto_ventas: row.meses.agosto.ventas,
      agosto_margen_bruto: row.meses.agosto.margen_bruto,
      setiembre_ventas: row.meses.setiembre.ventas,
      setiembre_margen_bruto: row.meses.setiembre.margen_bruto,
      octubre_ventas: row.meses.octubre.ventas,
      octubre_margen_bruto: row.meses.octubre.margen_bruto,
      noviembre_ventas: row.meses.noviembre.ventas,
      noviembre_margen_bruto: row.meses.noviembre.margen_bruto,
      diciembre_ventas: row.meses.diciembre.ventas,
      diciembre_margen_bruto: row.meses.diciembre.margen_bruto,
    })),
  );
  console.log("filas_debajo_de_industrial", rowsBelowSections.Industrial.length);
  console.log("filas_mensuales_industrial", monthlyRowsBySection.Industrial.length);
  console.table(
    monthlyRowsBySection.Industrial.slice(0, 10).map((row) => ({
      fila_excel: row.fila_excel,
      linea: row.linea,
      enero_ventas: row.meses.enero.ventas,
      enero_margen_bruto: row.meses.enero.margen_bruto,
      febrero_ventas: row.meses.febrero.ventas,
      febrero_margen_bruto: row.meses.febrero.margen_bruto,
      marzo_ventas: row.meses.marzo.ventas,
      marzo_margen_bruto: row.meses.marzo.margen_bruto,
      abril_ventas: row.meses.abril.ventas,
      abril_margen_bruto: row.meses.abril.margen_bruto,
      mayo_ventas: row.meses.mayo.ventas,
      mayo_margen_bruto: row.meses.mayo.margen_bruto,
      junio_ventas: row.meses.junio.ventas,
      junio_margen_bruto: row.meses.junio.margen_bruto,
      julio_ventas: row.meses.julio.ventas,
      julio_margen_bruto: row.meses.julio.margen_bruto,
      agosto_ventas: row.meses.agosto.ventas,
      agosto_margen_bruto: row.meses.agosto.margen_bruto,
      setiembre_ventas: row.meses.setiembre.ventas,
      setiembre_margen_bruto: row.meses.setiembre.margen_bruto,
      octubre_ventas: row.meses.octubre.ventas,
      octubre_margen_bruto: row.meses.octubre.margen_bruto,
      noviembre_ventas: row.meses.noviembre.ventas,
      noviembre_margen_bruto: row.meses.noviembre.margen_bruto,
      diciembre_ventas: row.meses.diciembre.ventas,
      diciembre_margen_bruto: row.meses.diciembre.margen_bruto,
    })),
  );
  console.table(
    parsedRows.slice(0, 10).map((row) => ({
      fila_excel: row.rowNumber,
      columna_a: row.payload.columna_a,
      marca_columna_a: row.payload.marca_columna_a ?? "",
    })),
  );
  console.groupEnd();

  const columns = Array.from({ length: maxColumnCount }, (_, index) =>
    getColumnKey(index + 1),
  );
  if (parsedRows.some((row) => row.payload.marca_columna_a)) {
    columns.push("marca_columna_a");
  }

  return {
    sheetName: worksheet.name,
    columns,
    previewRows: parsedRows.map((row) => row.payload),
    parsedRows,
    rowsBelowSections,
    monthlyRowsBySection,
  } satisfies ParsedAccountingWorkbookPreview;
}

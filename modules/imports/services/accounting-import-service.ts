import "server-only";

import { revalidatePath } from "next/cache";

import { requireRoleAccess } from "@/lib/auth/authorization";
import type { CurrentUser } from "@/lib/auth/session";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ImportRecord } from "@/lib/types/database";
import {
  updateAccountingRowSchema,
  updateImportSchema,
  validateImportFile,
} from "@/lib/validators/imports";
import {
  parseAccountingWorkbook,
  type AccountingMonthlySectionRow,
  type ParsedAccountingRow,
} from "@/modules/imports/parser/accounting";
import {
  buildImportAudit,
  parseImportAudit,
  type ImportAudit,
} from "@/modules/imports/services/import-audit";
import { importAccessRoles } from "@/modules/imports/services/import-service";

type RecentAccountingImportRow = ImportRecord & {
  data?: unknown;
  profiles:
    | Array<{ full_name: string | null; email: string }>
    | { full_name: string | null; email: string }
    | null;
};

type AccountingImportJsonRow = {
  id: number;
  row_number: number;
  parse_status: "valid" | "error";
  parse_errors: string[];
  payload: Record<string, unknown>;
};

type AccountingImportJsonPayload = {
  sheetName: string;
  columns: string[];
  rows: AccountingImportJsonRow[];
  audit: ImportAudit;
};

type AccountingSection = "Comercial" | "Industrial";

type AccountingPreviewSaveRow = Record<string, unknown> & {
  fila_excel?: unknown;
  linea?: unknown;
  negocio?: unknown;
  grupo?: unknown;
};

type AccountingPreviewSaveInput = {
  fileName: string;
  importYear: number;
  sheetName: string;
  monthlyRowsBySection: Partial<Record<AccountingSection, AccountingPreviewSaveRow[]>>;
};

export type AccountingImportRow = {
  id: number;
  row_number: number;
  parse_status: "valid" | "error";
  parse_errors: string[];
  payload: {
    linea: string | null;
    anio_anterior_real: number | null;
    anio_actual_ppto: number | null;
    anio_actual_real: number | null;
    mb: number | null;
    negocio: string | null;
    periodo_desde: string | null;
    periodo_hasta: string | null;
    periodo: string | null;
  };
};

const ACCOUNTING_GROUPS_BY_SECTION = {
  Comercial: [
    "Gaviones",
    "Geoestructuras",
    "Geomembranas",
    "Tuberias",
    "Otros - Geoestructuras",
  ],
  Industrial: [
    "Albergues",
    "Mangas",
    "Almacenes",
    "Otros - industrial",
  ],
} as const;

function normalizeImportRecord(row: RecentAccountingImportRow): ImportRecord {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

  return {
    ...row,
    uploaded_by_profile: profile ?? null,
  };
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNullableString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function assertAccountingGroup(section: AccountingSection, value: unknown) {
  if (typeof value !== "string") {
    throw new Error("Debes seleccionar un grupo para cada fila contable.");
  }

  const normalized = value.trim();
  const allowedGroups = ACCOUNTING_GROUPS_BY_SECTION[section] as readonly string[];

  if (!allowedGroups.includes(normalized)) {
    throw new Error(`El grupo "${normalized}" no es valido para ${section}.`);
  }

  return normalized;
}

function getAccountingBusinessFromSection(section: AccountingSection) {
  return section === "Comercial" ? "Geosinteticos" : "Industrial";
}

function normalizeAccountingImportRow(row: AccountingImportJsonRow): AccountingImportRow {
  return {
    id: row.id,
    row_number: row.row_number,
    parse_status: row.parse_status,
    parse_errors: row.parse_errors,
    payload: {
      linea: toNullableString(row.payload.linea),
      anio_anterior_real: toNullableNumber(row.payload.anio_anterior_real),
      anio_actual_ppto: toNullableNumber(row.payload.anio_actual_ppto),
      anio_actual_real: toNullableNumber(row.payload.anio_actual_real),
      mb: toNullableNumber(row.payload.mb),
      negocio: toNullableString(row.payload.negocio),
      periodo_desde: toNullableString(row.payload.periodo_desde),
      periodo_hasta: toNullableString(row.payload.periodo_hasta),
      periodo: toNullableString(row.payload.periodo),
    },
  };
}

function buildImportData(parsed: Awaited<ReturnType<typeof parseAccountingWorkbook>>) {
  const rows = parsed.parsedRows.map((row) => ({
    id: row.rowNumber,
    row_number: row.rowNumber,
    parse_status: row.parseStatus,
    parse_errors: row.parseErrors,
    payload: row.payload,
  })) satisfies AccountingImportJsonRow[];

  return {
    sheetName: parsed.sheetName,
    columns: parsed.columns,
    rows,
    audit: buildImportAudit({
      rows,
      getRowNumber: (row) => row.row_number,
      getPayload: (row) => row.payload,
      getParseStatus: (row) => row.parse_status,
      getParseErrors: (row) => row.parse_errors,
    }),
  } satisfies AccountingImportJsonPayload;
}

function buildPreviewRows(data: AccountingImportJsonPayload) {
  return data.rows.map((row) => ({
    fila_excel: row.row_number,
    parse_status: row.parse_status,
    ...row.payload,
  }));
}

function buildRowsBelowSectionPreview(rows: ParsedAccountingRow[]) {
  return rows.map((row) => ({
    fila_excel: row.rowNumber,
    parse_status: row.parseStatus,
    ...row.payload,
  }));
}

function flattenMonthlySectionRows(rows: AccountingMonthlySectionRow[]) {
  return rows.map((row) => ({
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
  }));
}

function buildImportSourceRef(fileName: string, userId: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const normalizedFileName = fileName.replace(/[^a-zA-Z0-9._-]+/g, "-");

  return `inline://accounting/${userId}/${timestamp}-${normalizedFileName}`;
}

function parseAccountingImportData(value: unknown): AccountingImportJsonPayload {
  if (!isRecord(value)) {
    return {
      sheetName: "",
      columns: [],
      rows: [],
      audit: buildImportAudit({
        rows: [] as AccountingImportJsonRow[],
        getRowNumber: (row) => row.row_number,
        getPayload: (row) => row.payload,
        getParseStatus: (row) => row.parse_status,
        getParseErrors: (row) => row.parse_errors,
      }),
    };
  }

  const columns = Array.isArray(value.columns)
    ? value.columns.filter((item): item is string => typeof item === "string")
    : [];

  const rows = Array.isArray(value.rows)
    ? value.rows.flatMap((item) => {
        if (!isRecord(item)) return [];

        const rowNumber = toNullableNumber(item.row_number) ?? toNullableNumber(item.id);
        if (rowNumber === null) return [];

        return [
          {
            id: rowNumber,
            row_number: rowNumber,
            parse_status: item.parse_status === "error" ? "error" : "valid",
            parse_errors: Array.isArray(item.parse_errors)
              ? item.parse_errors.filter((error): error is string => typeof error === "string")
              : [],
            payload: isRecord(item.payload) ? item.payload : {},
          } satisfies AccountingImportJsonRow,
        ];
      })
    : [];

  const audit =
    parseImportAudit(value.audit) ??
    buildImportAudit({
      rows,
      getRowNumber: (row) => row.row_number,
      getPayload: (row) => row.payload,
      getParseStatus: (row) => row.parse_status,
      getParseErrors: (row) => row.parse_errors,
    });

  return {
    sheetName: typeof value.sheetName === "string" ? value.sheetName : "",
    columns,
    rows,
    audit,
  };
}

async function getAccountingImportRowForEdit(importId: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("accounting_imports")
    .select("id, data")
    .eq("id", importId)
    .single();

  if (error || !data) {
    throw new Error("No se encontro la importacion contable.");
  }

  return data as { id: string; data?: unknown };
}

export async function createAccountingImportFromUpload(
  file: File,
  currentUser: CurrentUser,
  importYear: number,
) {
  validateImportFile(file);
  const parsed = await parseAccountingWorkbook(file);
  const importData = buildImportData(parsed);

  console.groupCollapsed("[accounting-imports][service] Excel contable leido");
  console.log("archivo", file.name);
  console.log("usuario", currentUser.id);
  console.log("anio_importacion", importYear);
  console.log("hoja", parsed.sheetName);
  console.log("columnas", parsed.columns);
  console.log("filas", importData.rows);
  console.log(
    "filas_debajo_de_comercial",
    buildRowsBelowSectionPreview(parsed.rowsBelowSections.Comercial),
  );
  console.table(buildRowsBelowSectionPreview(parsed.rowsBelowSections.Comercial));
  console.log(
    "filas_mensuales_comercial",
    parsed.monthlyRowsBySection.Comercial,
  );
  console.table(flattenMonthlySectionRows(parsed.monthlyRowsBySection.Comercial));
  console.log(
    "filas_debajo_de_industrial",
    buildRowsBelowSectionPreview(parsed.rowsBelowSections.Industrial),
  );
  console.table(buildRowsBelowSectionPreview(parsed.rowsBelowSections.Industrial));
  console.log(
    "filas_mensuales_industrial",
    parsed.monthlyRowsBySection.Industrial,
  );
  console.table(flattenMonthlySectionRows(parsed.monthlyRowsBySection.Industrial));
  console.table(
    importData.rows.map((row) => ({
      fila_excel: row.row_number,
      columna_a: row.payload.columna_a,
      marca_columna_a: row.payload.marca_columna_a ?? "",
    })),
  );
  console.log("total_filas", parsed.parsedRows.length);
  console.log("filas_validas", importData.audit.validRows);
  console.log("filas_con_error", importData.audit.invalidRows);
  console.log("filas_con_nulos", importData.audit.rowsWithNullValues);
  console.log("nulos_por_campo", importData.audit.nullFieldCounts);
  console.groupEnd();

  return {
    fileName: file.name,
    importYear,
    sheetName: parsed.sheetName,
    columns: parsed.columns,
    previewRows: buildPreviewRows(importData),
    rowsBelowSections: {
      Comercial: buildRowsBelowSectionPreview(parsed.rowsBelowSections.Comercial),
      Industrial: buildRowsBelowSectionPreview(parsed.rowsBelowSections.Industrial),
    },
    monthlyRowsBySection: {
      Comercial: flattenMonthlySectionRows(parsed.monthlyRowsBySection.Comercial),
      Industrial: flattenMonthlySectionRows(parsed.monthlyRowsBySection.Industrial),
    },
    totalRows: parsed.parsedRows.length,
    validRows: importData.audit.validRows,
    errorRows: importData.audit.invalidRows,
  };
}

function normalizeAccountingPreviewSaveRows(input: AccountingPreviewSaveInput) {
  const rows: AccountingImportJsonRow[] = [];

  for (const section of ["Comercial", "Industrial"] as const) {
    const sectionRows = input.monthlyRowsBySection[section] ?? [];

    for (const row of sectionRows) {
      const rowNumber = toNullableNumber(row.fila_excel);

      if (rowNumber === null) {
        throw new Error("No se pudo identificar la fila Excel de una linea contable.");
      }

      rows.push({
        id: rowNumber,
        row_number: rowNumber,
        parse_status: "valid",
        parse_errors: [],
        payload: {
          seccion: section,
          negocio: getAccountingBusinessFromSection(section),
          grupo: assertAccountingGroup(section, row.grupo),
          linea: toNullableString(row.linea),
          enero_ventas: row.enero_ventas ?? null,
          enero_margen_bruto: row.enero_margen_bruto ?? null,
          febrero_ventas: row.febrero_ventas ?? null,
          febrero_margen_bruto: row.febrero_margen_bruto ?? null,
          marzo_ventas: row.marzo_ventas ?? null,
          marzo_margen_bruto: row.marzo_margen_bruto ?? null,
          abril_ventas: row.abril_ventas ?? null,
          abril_margen_bruto: row.abril_margen_bruto ?? null,
          mayo_ventas: row.mayo_ventas ?? null,
          mayo_margen_bruto: row.mayo_margen_bruto ?? null,
          junio_ventas: row.junio_ventas ?? null,
          junio_margen_bruto: row.junio_margen_bruto ?? null,
          julio_ventas: row.julio_ventas ?? null,
          julio_margen_bruto: row.julio_margen_bruto ?? null,
          agosto_ventas: row.agosto_ventas ?? null,
          agosto_margen_bruto: row.agosto_margen_bruto ?? null,
          setiembre_ventas: row.setiembre_ventas ?? null,
          setiembre_margen_bruto: row.setiembre_margen_bruto ?? null,
          octubre_ventas: row.octubre_ventas ?? null,
          octubre_margen_bruto: row.octubre_margen_bruto ?? null,
          noviembre_ventas: row.noviembre_ventas ?? null,
          noviembre_margen_bruto: row.noviembre_margen_bruto ?? null,
          diciembre_ventas: row.diciembre_ventas ?? null,
          diciembre_margen_bruto: row.diciembre_margen_bruto ?? null,
        },
      });
    }
  }

  return rows;
}

export async function saveAccountingImportFromPreview(
  input: AccountingPreviewSaveInput,
  currentUser: CurrentUser,
) {
  const admin = createAdminSupabaseClient();
  const rows = normalizeAccountingPreviewSaveRows(input);
  const audit = buildImportAudit({
    rows,
    getRowNumber: (row) => row.row_number,
    getPayload: (row) => row.payload,
    getParseStatus: (row) => row.parse_status,
    getParseErrors: (row) => row.parse_errors,
  });
  const importData = {
    sheetName: input.sheetName,
    columns: [
      "seccion",
      "negocio",
      "grupo",
      "linea",
      "enero_ventas",
      "enero_margen_bruto",
      "febrero_ventas",
      "febrero_margen_bruto",
      "marzo_ventas",
      "marzo_margen_bruto",
      "abril_ventas",
      "abril_margen_bruto",
      "mayo_ventas",
      "mayo_margen_bruto",
      "junio_ventas",
      "junio_margen_bruto",
      "julio_ventas",
      "julio_margen_bruto",
      "agosto_ventas",
      "agosto_margen_bruto",
      "setiembre_ventas",
      "setiembre_margen_bruto",
      "octubre_ventas",
      "octubre_margen_bruto",
      "noviembre_ventas",
      "noviembre_margen_bruto",
      "diciembre_ventas",
      "diciembre_margen_bruto",
    ],
    rows,
    audit,
  } satisfies AccountingImportJsonPayload;
  const storagePath = buildImportSourceRef(input.fileName, currentUser.id);

  console.groupCollapsed("[accounting-imports][service] Guardando preview categorizado");
  console.log("archivo", input.fileName);
  console.log("usuario", currentUser.id);
  console.log("anio_importacion", input.importYear);
  console.log("hoja", input.sheetName);
  console.log("filas", rows);
  console.groupEnd();

  const { data: importRow, error } = await admin
    .from("accounting_imports")
    .insert({
      file_name: input.fileName,
      storage_path: storagePath,
      anio: input.importYear,
      uploaded_by: currentUser.id,
      status: "processed",
      total_rows: rows.length,
      valid_rows: audit.validRows,
      error_rows: audit.invalidRows,
      sheet_name: input.sheetName,
      notes: `Hoja ${input.sheetName}. Archivo de contabilidad guardado desde preview mensual con grupo por fila.`,
      data: importData,
    })
    .select("id")
    .single();

  if (error || !importRow) {
    throw new Error("No se pudo guardar la importacion contable.");
  }

  revalidatePath("/dashboard/imports");
  revalidatePath("/dashboard");

  return {
    id: importRow.id as string,
    fileName: input.fileName,
    importYear: input.importYear,
    sheetName: input.sheetName,
    totalRows: rows.length,
    validRows: audit.validRows,
    errorRows: audit.invalidRows,
  };
}

export async function listRecentAccountingImports() {
  await requireRoleAccess([...importAccessRoles]);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("accounting_imports")
    .select(
      "id, file_name, storage_path, anio, uploaded_by, uploaded_at, status, total_rows, valid_rows, error_rows, notes, profiles:profiles_subway!accounting_imports_uploaded_by_fkey(full_name, email)",
    )
    .order("uploaded_at", { ascending: false })
    .limit(20);

  if (error) return [];

  return ((data ?? []) as unknown as RecentAccountingImportRow[]).map(normalizeImportRecord);
}

export async function deleteAccountingImport(importId: string) {
  await requireRoleAccess([...importAccessRoles]);

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("accounting_imports")
    .delete()
    .eq("id", importId);

  if (error) {
    throw new Error("No se pudo eliminar la importacion contable.");
  }

  revalidatePath("/dashboard/imports");
  revalidatePath(`/dashboard/imports/contabilidad/${importId}`);
}

export async function getAccountingImportDetail(importId: string) {
  await requireRoleAccess([...importAccessRoles]);

  const supabase = await createServerSupabaseClient();
  const { data: importRow, error: importError } = await supabase
    .from("accounting_imports")
    .select(
      "id, file_name, storage_path, anio, uploaded_by, uploaded_at, status, total_rows, valid_rows, error_rows, notes, data, profiles:profiles_subway!accounting_imports_uploaded_by_fkey(full_name, email)",
    )
    .eq("id", importId)
    .single();

  if (importError || !importRow) {
    throw new Error("No se encontro la importacion contable.");
  }

  const importData = parseAccountingImportData((importRow as { data?: unknown }).data);

  return {
    import: normalizeImportRecord(importRow as unknown as RecentAccountingImportRow),
    rows: importData.rows.map(normalizeAccountingImportRow),
    audit: importData.audit,
  };
}

export async function updateAccountingImportMetadata(
  importId: string,
  input: { anio: number },
) {
  await requireRoleAccess([...importAccessRoles]);

  const parsed = updateImportSchema.parse({
    anio: input.anio,
  });

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("accounting_imports")
    .update(parsed)
    .eq("id", importId);

  if (error) {
    throw new Error("No se pudo actualizar la importacion contable.");
  }

  revalidatePath("/dashboard/imports");
  revalidatePath(`/dashboard/imports/contabilidad/${importId}`);
}

export async function updateAccountingImportRow(
  importId: string,
  rowId: number,
  input: {
    linea: string | null;
    anio_anterior_real: number | null;
    anio_actual_ppto: number | null;
    anio_actual_real: number | null;
    mb: number | null;
    negocio: string | null;
    periodo_desde: string | null;
    periodo_hasta: string | null;
    periodo: string | null;
  },
) {
  await requireRoleAccess([...importAccessRoles]);

  const parsed = updateAccountingRowSchema.parse({
    linea: normalizeOptionalText(input.linea),
    anio_anterior_real: input.anio_anterior_real,
    anio_actual_ppto: input.anio_actual_ppto,
    anio_actual_real: input.anio_actual_real,
    mb: input.mb,
    negocio: normalizeOptionalText(input.negocio),
    periodo_desde: normalizeOptionalText(input.periodo_desde),
    periodo_hasta: normalizeOptionalText(input.periodo_hasta),
    periodo: normalizeOptionalText(input.periodo),
  });

  const importRow = await getAccountingImportRowForEdit(importId);
  const importData = parseAccountingImportData(importRow.data);

  const nextRows = importData.rows.map((row) => {
    if (row.row_number !== rowId) return row;

    return {
      ...row,
      payload: {
        ...row.payload,
        linea: parsed.linea,
        anio_anterior_real: parsed.anio_anterior_real,
        anio_actual_ppto: parsed.anio_actual_ppto,
        anio_actual_real: parsed.anio_actual_real,
        mb: parsed.mb,
        negocio: parsed.negocio,
        periodo_desde: parsed.periodo_desde,
        periodo_hasta: parsed.periodo_hasta,
        periodo: parsed.periodo,
      },
    } satisfies AccountingImportJsonRow;
  });
  const nextAudit = buildImportAudit({
    rows: nextRows,
    getRowNumber: (row) => row.row_number,
    getPayload: (row) => row.payload,
    getParseStatus: (row) => row.parse_status,
    getParseErrors: (row) => row.parse_errors,
  });

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("accounting_imports")
    .update({
      data: {
        ...importData,
        rows: nextRows,
        audit: nextAudit,
      },
      total_rows: nextRows.length,
      valid_rows: nextAudit.validRows,
      error_rows: nextAudit.invalidRows,
    })
    .eq("id", importId);

  if (error) {
    throw new Error("No se pudo actualizar la fila contable.");
  }

  revalidatePath("/dashboard/imports");
  revalidatePath(`/dashboard/imports/contabilidad/${importId}`);
}

export async function deleteAccountingImportRow(importId: string, rowId: number) {
  await requireRoleAccess([...importAccessRoles]);

  const importRow = await getAccountingImportRowForEdit(importId);
  const importData = parseAccountingImportData(importRow.data);
  const nextRows = importData.rows.filter((row) => row.row_number !== rowId);
  const nextAudit = buildImportAudit({
    rows: nextRows,
    getRowNumber: (row) => row.row_number,
    getPayload: (row) => row.payload,
    getParseStatus: (row) => row.parse_status,
    getParseErrors: (row) => row.parse_errors,
  });

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("accounting_imports")
    .update({
      data: {
        ...importData,
        rows: nextRows,
        audit: nextAudit,
      },
      total_rows: nextRows.length,
      valid_rows: nextAudit.validRows,
      error_rows: nextAudit.invalidRows,
    })
    .eq("id", importId);

  if (error) {
    throw new Error("No se pudo eliminar la fila contable.");
  }

  revalidatePath("/dashboard/imports");
  revalidatePath(`/dashboard/imports/contabilidad/${importId}`);
}

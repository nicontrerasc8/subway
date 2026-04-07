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
import { parseAccountingWorkbook } from "@/modules/imports/parser/accounting";
import {
  buildImportAudit,
  parseImportAudit,
  type ImportAudit,
} from "@/modules/imports/services/import-audit";
import { importAccessRoles } from "@/modules/imports/services/import-service";

type RecentAccountingImportRow = ImportRecord & {
  data?: unknown;
  profiles: Array<{ full_name: string | null; email: string }>;
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

const ACCOUNTING_BUSINESSES = [
  "Industrial",
  "Geosinteticos",
  "Tensoestructuras",
] as const;

const ACCOUNTING_PERIODS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Setiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

function normalizeAccountingBusiness(value: string) {
  const normalized = value.trim();

  if (!ACCOUNTING_BUSINESSES.includes(normalized as (typeof ACCOUNTING_BUSINESSES)[number])) {
    throw new Error("Debes seleccionar un negocio contable valido.");
  }

  return normalized;
}

function normalizeAccountingPeriod(value: string) {
  const normalized = value.trim();

  if (!ACCOUNTING_PERIODS.includes(normalized as (typeof ACCOUNTING_PERIODS)[number])) {
    throw new Error("Debes seleccionar un periodo contable valido.");
  }

  return normalized;
}

function buildAccountingPeriodLabel(periodoDesde: string, periodoHasta: string) {
  if (periodoDesde === periodoHasta) return periodoDesde;
  return `${periodoDesde} a ${periodoHasta}`;
}

function normalizeAccountingPeriodRange(desdeRaw: string, hastaRaw: string) {
  const periodoDesde = normalizeAccountingPeriod(desdeRaw);
  const periodoHasta = normalizeAccountingPeriod(hastaRaw);
  const desdeIndex = ACCOUNTING_PERIODS.indexOf(periodoDesde as (typeof ACCOUNTING_PERIODS)[number]);
  const hastaIndex = ACCOUNTING_PERIODS.indexOf(periodoHasta as (typeof ACCOUNTING_PERIODS)[number]);

  if (desdeIndex > hastaIndex) {
    throw new Error("El periodo inicial no puede ser mayor que el periodo final.");
  }

  return {
    periodoDesde,
    periodoHasta,
    periodo: buildAccountingPeriodLabel(periodoDesde, periodoHasta),
  };
}

function normalizeImportRecord(row: RecentAccountingImportRow): ImportRecord {
  return {
    ...row,
    uploaded_by_profile: row.profiles?.[0] ?? null,
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

function buildImportSourceRef(fileName: string, userId: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const normalizedFileName = fileName.replace(/[^a-zA-Z0-9._-]+/g, "-");

  return `inline://accounting/${userId}/${timestamp}-${normalizedFileName}`;
}

function buildImportData(
  parsed: Awaited<ReturnType<typeof parseAccountingWorkbook>>,
  negocio: string,
  periodoRange: { periodo: string; periodoDesde: string; periodoHasta: string },
) {
  const rows = parsed.parsedRows.map((row) => ({
    id: row.rowNumber,
    row_number: row.rowNumber,
    parse_status: row.parseStatus,
    parse_errors: row.parseErrors,
    payload: {
      ...row.payload,
      negocio,
      periodo_desde: periodoRange.periodoDesde,
      periodo_hasta: periodoRange.periodoHasta,
      periodo: periodoRange.periodo,
    },
  })) satisfies AccountingImportJsonRow[];

  return {
    sheetName: parsed.sheetName,
    columns: [...parsed.columns, "negocio", "periodo_desde", "periodo_hasta", "periodo"],
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
  negocioRaw: string,
  periodoDesdeRaw: string,
  periodoHastaRaw: string,
) {
  const admin = createAdminSupabaseClient();
  validateImportFile(file);
  const parsed = await parseAccountingWorkbook(file);
  const negocio = normalizeAccountingBusiness(negocioRaw);
  const periodoRange = normalizeAccountingPeriodRange(periodoDesdeRaw, periodoHastaRaw);
  const storagePath = buildImportSourceRef(file.name, currentUser.id);
  const importData = buildImportData(parsed, negocio, periodoRange);

  console.groupCollapsed("[accounting-imports][service] Resumen de importacion");
  console.log("archivo", file.name);
  console.log("usuario", currentUser.id);
  console.log("anio_importacion", importYear);
  console.log("negocio", negocio);
  console.log("periodo", periodoRange.periodo);
  console.log("hoja", parsed.sheetName);
  console.log("columnas", parsed.columns);
  console.log("total_filas", parsed.parsedRows.length);
  console.log("filas_validas", importData.audit.validRows);
  console.log("filas_con_error", importData.audit.invalidRows);
  console.log("filas_con_nulos", importData.audit.rowsWithNullValues);
  console.log("nulos_por_campo", importData.audit.nullFieldCounts);
  console.groupEnd();

  const { data: importRow, error: importError } = await admin
    .from("accounting_imports")
    .insert({
      file_name: file.name,
      storage_path: storagePath,
      anio: importYear,
      uploaded_by: currentUser.id,
      status: "processing",
      total_rows: parsed.parsedRows.length,
      valid_rows: importData.audit.validRows,
      error_rows: importData.audit.invalidRows,
      sheet_name: parsed.sheetName,
      notes: `Hoja ${parsed.sheetName}. Negocio ${negocio}. Periodo ${periodoRange.periodo}. Archivo de contabilidad persistido en JSON dentro de accounting_imports.data.`,
      data: {},
    })
    .select("id")
    .single();

  if (importError || !importRow) {
    throw new Error("No se pudo registrar la importacion contable.");
  }

  const { error: updateError } = await admin
    .from("accounting_imports")
    .update({
      status: "processed",
      data: importData,
    })
    .eq("id", importRow.id as string);

  if (updateError) {
    await admin
      .from("accounting_imports")
      .update({
        status: "failed",
        notes: "Fallo al guardar el JSON de contabilidad en accounting_imports.data.",
      })
      .eq("id", importRow.id as string);

    throw new Error("No se pudo guardar el JSON de la importacion contable.");
  }

  revalidatePath("/dashboard/imports");
  revalidatePath("/dashboard");

  return {
    id: importRow.id as string,
    fileName: file.name,
    importYear,
    sheetName: parsed.sheetName,
    columns: parsed.columns,
    previewRows: buildPreviewRows(importData),
    totalRows: parsed.parsedRows.length,
    validRows: importData.audit.validRows,
    errorRows: importData.audit.invalidRows,
  };
}

export async function listRecentAccountingImports() {
  await requireRoleAccess([...importAccessRoles]);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("accounting_imports")
    .select(
      "id, file_name, storage_path, anio, uploaded_by, uploaded_at, status, total_rows, valid_rows, error_rows, notes, profiles!accounting_imports_uploaded_by_fkey(full_name, email)",
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
      "id, file_name, storage_path, anio, uploaded_by, uploaded_at, status, total_rows, valid_rows, error_rows, notes, data, profiles!accounting_imports_uploaded_by_fkey(full_name, email)",
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

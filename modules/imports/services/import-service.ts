import "server-only";

import { revalidatePath } from "next/cache";

import { requireRoleAccess } from "@/lib/auth/authorization";
import { canManageImports, importManagerRoles } from "@/lib/auth/roles";
import type { CurrentUser } from "@/lib/auth/session";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AppRole, ImportFactRow, ImportRecord } from "@/lib/types/database";
import {
  updateFactRowSchema,
  validateImportFile,
} from "@/lib/validators/imports";
import { parseAxWorkbook } from "@/modules/imports/parser/excel";
import {
  buildImportAudit,
  parseImportAudit,
  type ImportAudit,
} from "@/modules/imports/services/import-audit";

export const importAccessRoles = importManagerRoles;

type ImportAccessRole = (typeof importAccessRoles)[number];

type RecentImportRow = ImportRecord & {
  data?: unknown;
  profiles: Array<{ full_name: string | null; email: string }>;
};

type ImportJsonRow = {
  id: number;
  row_number: number;
  parse_status: "valid" | "error";
  parse_errors: string[];
  payload: Record<string, unknown>;
};

type ImportJsonPayload = {
  sheetName: string;
  columns: string[];
  rows: ImportJsonRow[];
  audit: ImportAudit;
};

export function canAccessImports(role: AppRole) {
  return canManageImports(role);
}

function normalizeImportRecord(row: RecentImportRow): ImportRecord {
  return {
    ...row,
    anio: null,
    uploaded_by_profile: row.profiles?.[0] ?? null,
  };
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeOptionalDate(value: string | null | undefined) {
  const normalized = normalizeOptionalText(value);
  return normalized ? normalized : null;
}

function normalizeProbability(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return value > 1 ? value / 100 : value;
}

function buildImportSourceRef(fileName: string, userId: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const normalizedFileName = fileName.replace(/[^a-zA-Z0-9._-]+/g, "-");

  return `inline://${userId}/${timestamp}-${normalizedFileName}`;
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

function toNullableBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  return null;
}

function normalizeJsonFactRow(importId: string, row: Record<string, unknown>): ImportFactRow {
  return {
    id: toNullableNumber(row.id) ?? toNullableNumber(row.row_number) ?? 0,
    import_id: toNullableString(row.import_id) ?? importId,
    anio: toNullableNumber(row.anio),
    mes: toNullableNumber(row.mes),
    trimestre: toNullableNumber(row.trimestre),
    semana: toNullableNumber(row.semana),
    fecha_registro: toNullableString(row.fecha_registro),
    fecha_adjudicacion: toNullableString(row.fecha_adjudicacion),
    fecha_facturacion: toNullableString(row.fecha_facturacion),
    situacion: toNullableString(row.situacion),
    orden_venta: toNullableString(row.orden_venta),
    factura: toNullableString(row.factura),
    oc: toNullableString(row.oc),
    proyecto: toNullableString(row.proyecto),
    codigo_articulo: toNullableString(row.codigo_articulo),
    articulo: toNullableString(row.articulo),
    etapa: toNullableString(row.etapa),
    um: toNullableString(row.um),
    motivo_perdida: toNullableString(row.motivo_perdida),
    tipo_pipeline: toNullableString(row.tipo_pipeline),
    licitacion_flag: toNullableBoolean(row.licitacion_flag) ?? false,
    cantidad: toNullableNumber(row.cantidad),
    ventas_monto: toNullableNumber(row.ventas_monto),
    proyeccion_monto: toNullableNumber(row.proyeccion_monto),
    probabilidad_num: normalizeProbability(toNullableNumber(row.probabilidad_num)),
    forecast_ponderado: toNullableNumber(row.forecast_ponderado),
    observaciones: toNullableString(row.observaciones),
    cliente_nombre: toNullableString(row.cliente_nombre),
    cliente_ruc: toNullableString(row.cliente_ruc),
    sector_ax_nombre: toNullableString(row.sector_ax_nombre),
    sector_nombre: toNullableString(row.sector_nombre),
    negocio_nombre: toNullableString(row.negocio_nombre),
    linea_nombre: toNullableString(row.linea_nombre),
    sublinea_nombre: toNullableString(row.sublinea_nombre),
    grupo_nombre: toNullableString(row.grupo_nombre),
    ejecutivo_nombre: toNullableString(row.ejecutivo_nombre),
    costo_monto: toNullableNumber(row.costo_monto),
    margen_monto: toNullableNumber(row.margen_monto),
    porcentaje_num: toNullableNumber(row.porcentaje_num),
  };
}

function mapPayloadToLegacyRow(importId: string, rowNumber: number, payload: Record<string, unknown>) {
  const probability = normalizeProbability(toNullableNumber(payload.probabilidad_num));
  const projection = toNullableNumber(payload.proyeccion_monto);

  return normalizeJsonFactRow(importId, {
    id: rowNumber,
    import_id: importId,
    anio: typeof payload.anio === "number" ? payload.anio : null,
    situacion: payload.situacion,
    fecha_registro: payload.fecha_registro,
    fecha_adjudicacion: payload.fecha_adjudicacion,
    fecha_facturacion: payload.fecha_facturacion,
    mes: typeof payload.mes === "number" ? payload.mes : null,
    trimestre: null,
    semana: typeof payload.semana === "number" ? payload.semana : null,
    orden_venta: payload.orden_venta,
    factura: payload.factura,
    oc: payload.oc,
    proyecto: payload.proyecto,
    codigo_articulo: payload.codigo_articulo,
    articulo: payload.articulo,
    etapa: payload.etapa,
    um: payload.um,
    motivo_perdida: payload.motivo_perdida,
    tipo_pipeline: payload.tipo_pipeline,
    licitacion_flag: payload.licitacion_flag,
    cantidad: payload.cantidad,
    ventas_monto: payload.ventas_monto,
    proyeccion_monto: payload.proyeccion_monto,
    probabilidad_num: probability,
    forecast_ponderado:
      probability !== null && projection !== null ? projection * probability : null,
    observaciones: payload.observaciones,
    cliente_nombre: payload.cliente,
    cliente_ruc: payload.ruc,
    sector_ax_nombre: payload.sector_ax,
    sector_nombre: payload.sector,
    negocio_nombre: payload.negocio,
    linea_nombre: payload.linea,
    sublinea_nombre: payload.sublinea,
    grupo_nombre: payload.grupo,
    ejecutivo_nombre: payload.ejecutivo,
    costo_monto: payload.costo_monto,
    margen_monto: payload.margen_monto,
    porcentaje_num: payload.porcentaje_num,
  });
}

function parseImportData(importId: string, value: unknown): ImportJsonPayload {
  if (!isRecord(value)) {
    return {
      sheetName: "",
      columns: [],
      rows: [],
      audit: buildImportAudit({
        rows: [] as ImportJsonRow[],
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
          } satisfies ImportJsonRow,
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

function buildImportData(parsed: Awaited<ReturnType<typeof parseAxWorkbook>>) {
  const rows = parsed.parsedRows.map((row) => ({
    id: row.rowNumber,
    row_number: row.rowNumber,
    parse_status: row.parseStatus,
    parse_errors: row.parseErrors,
    payload: row.payload,
  })) satisfies ImportJsonRow[];

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
  } satisfies ImportJsonPayload;
}

function collectNormalizedRows(importId: string, data: ImportJsonPayload) {
  return data.rows
    .map((row) => ({
      ...mapPayloadToLegacyRow(importId, row.row_number, row.payload),
    }));
}

function buildPreviewRows(importId: string, data: ImportJsonPayload) {
  return data.rows.map((row) => ({
    fila_excel: row.row_number,
    parse_status: row.parse_status,
    ...row.payload,
  }));
}

function buildImportDebugRows(data: ImportJsonPayload, limit = 10) {
  return data.rows.slice(0, limit).map((row) => ({
    fila_excel: row.row_number,
    parse_status: row.parse_status,
    parse_errors: row.parse_errors,
    payload: row.payload,
  }));
}

function buildImportDebugSummary(data: ImportJsonPayload, limit = 10) {
  return data.rows.slice(0, limit).map((row) => ({
    fila_excel: row.row_number,
    anio: row.payload.anio ?? null,
    mes: row.payload.mes ?? null,
    semana: row.payload.semana ?? null,
    situacion: row.payload.situacion ?? null,
    orden_venta: row.payload.orden_venta ?? null,
    factura: row.payload.factura ?? null,
    sector_ax: row.payload.sector_ax ?? null,
    sector: row.payload.sector ?? null,
    cliente: row.payload.cliente ?? null,
    negocio: row.payload.negocio ?? null,
    linea: row.payload.linea ?? null,
    sublinea: row.payload.sublinea ?? null,
    grupo: row.payload.grupo ?? null,
    probabilidad_num: row.payload.probabilidad_num ?? null,
    ventas_monto: row.payload.ventas_monto ?? null,
    proyeccion_monto: row.payload.proyeccion_monto ?? null,
    costo_monto: row.payload.costo_monto ?? null,
    margen_monto: row.payload.margen_monto ?? null,
    porcentaje_num: row.payload.porcentaje_num ?? null,
    ejecutivo: row.payload.ejecutivo ?? null,
  }));
}

async function getImportRowForEdit(importId: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("imports")
    .select("id, data")
    .eq("id", importId)
    .single();

  if (error || !data) {
    throw new Error("No se encontro la importacion.");
  }

  return data as { id: string; data?: unknown };
}

export async function createImportFromUpload(
  file: File,
  currentUser: CurrentUser,
) {
  const admin = createAdminSupabaseClient();
  validateImportFile(file);
  const parsed = await parseAxWorkbook(file);
  const storagePath = buildImportSourceRef(file.name, currentUser.id);
  const importData = buildImportData(parsed);
  const validRows = importData.audit.validRows;
  const errorRows = importData.audit.invalidRows;

  console.groupCollapsed("[imports][service] Resumen de importacion");
  console.log("archivo", file.name);
  console.log("usuario", currentUser.id);
  console.log("hoja", parsed.sheetName);
  console.log("columnas", parsed.columns);
  console.log("total_filas", parsed.parsedRows.length);
  console.log("filas_validas", validRows);
  console.log("filas_con_error", errorRows);
  console.log("filas_con_nulos", importData.audit.rowsWithNullValues);
  console.log("nulos_por_campo", importData.audit.nullFieldCounts);
  console.log(
    "filas_invalidas_detalle",
    importData.audit.rows.filter((row) => row.hasInvalidData),
  );
  console.groupEnd();

  const { data: importRow, error: importError } = await admin
    .from("imports")
    .insert({
      file_name: file.name,
      storage_path: storagePath,
      anio: null,
      uploaded_by: currentUser.id,
      status: "processing",
      total_rows: parsed.parsedRows.length,
      valid_rows: validRows,
      error_rows: errorRows,
      sheet_name: parsed.sheetName,
      notes: `Hoja ${parsed.sheetName}. Archivo persistido en JSON dentro de imports.data.`,
      data: {},
    })
    .select("id")
    .single();

  if (importError || !importRow) {
    throw new Error("No se pudo registrar la importacion.");
  }

  const importId = importRow.id as string;

  console.groupCollapsed("[imports][service] Payload final para JSON");
  console.log("muestra_filas_json", importData.rows.slice(0, 5));
  console.log("primeras_10_filas_guardadas", buildImportDebugRows(importData, 10));
  console.table(buildImportDebugSummary(importData, 10));
  console.log("audit", importData.audit);
  console.groupEnd();

  const { error: updateError } = await admin
    .from("imports")
    .update({
      status: "processed",
      data: importData,
    })
    .eq("id", importId);

  if (updateError) {
    await admin
      .from("imports")
      .update({
        status: "failed",
        notes: "Fallo al guardar el JSON normalizado en imports.data.",
      })
      .eq("id", importId);

    throw new Error("No se pudo guardar el JSON de la importacion.");
  }

  revalidatePath("/dashboard/imports");
  revalidatePath("/dashboard/imports/[importId]", "page");
  revalidatePath("/dashboard");

  return {
    id: importId,
    fileName: file.name,
    importYear: null,
    sheetName: parsed.sheetName,
    columns: parsed.columns,
    previewRows: buildPreviewRows(importId, importData),
    totalRows: parsed.parsedRows.length,
    validRows: validRows,
    errorRows,
  };
}

export async function listRecentImports() {
  await requireRoleAccess([...importAccessRoles] as ImportAccessRole[]);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("imports")
    .select(
      "id, file_name, storage_path, anio, uploaded_by, uploaded_at, status, total_rows, valid_rows, error_rows, notes, profiles!imports_uploaded_by_fkey(full_name, email)",
    )
    .order("uploaded_at", { ascending: false })
    .limit(20);

  if (error) return [];

  return ((data ?? []) as unknown as RecentImportRow[]).map(normalizeImportRecord);
}

export async function getImportDetail(importId: string) {
  await requireRoleAccess([...importAccessRoles] as ImportAccessRole[]);

  const supabase = await createServerSupabaseClient();
  const { data: importRow, error: importError } = await supabase
    .from("imports")
    .select(
      "id, file_name, storage_path, anio, uploaded_by, uploaded_at, status, total_rows, valid_rows, error_rows, notes, data, profiles!imports_uploaded_by_fkey(full_name, email)",
    )
    .eq("id", importId)
    .single();

  if (importError || !importRow) {
    throw new Error("No se encontro la importacion.");
  }

  const importData = parseImportData(importId, (importRow as { data?: unknown }).data);

  return {
    import: normalizeImportRecord(importRow as unknown as RecentImportRow),
    rows: collectNormalizedRows(importId, importData),
    audit: importData.audit,
  };
}

export async function updateImportMetadata(importId: string) {
  await requireRoleAccess([...importAccessRoles] as ImportAccessRole[]);

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("imports")
    .update({ anio: null })
    .eq("id", importId);

  if (error) {
    throw new Error("No se pudo actualizar la importacion.");
  }

  revalidatePath("/dashboard/imports");
  revalidatePath(`/dashboard/imports/${importId}`);
}

export async function deleteImport(importId: string) {
  await requireRoleAccess([...importAccessRoles] as ImportAccessRole[]);

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("imports")
    .delete()
    .eq("id", importId);

  if (error) {
    throw new Error("No se pudo eliminar la importacion.");
  }

  revalidatePath("/dashboard/imports");
  revalidatePath(`/dashboard/imports/${importId}`);
}

export async function deleteImportFactRow(importId: string, rowId: number) {
  await requireRoleAccess([...importAccessRoles] as ImportAccessRole[]);

  const importRow = await getImportRowForEdit(importId);
  const importData = parseImportData(importId, importRow.data);
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
    .from("imports")
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
    throw new Error("No se pudo eliminar la fila de la importacion.");
  }

  revalidatePath("/dashboard/imports");
  revalidatePath(`/dashboard/imports/${importId}`);
}

export async function updateImportFactRow(
  importId: string,
  rowId: number,
    input: {
    anio: number | null;
    mes: number | null;
    trimestre: number | null;
    semana: number | null;
    fecha_registro: string | null;
    fecha_adjudicacion: string | null;
    fecha_facturacion: string | null;
    situacion: string | null;
    orden_venta: string | null;
    factura: string | null;
    oc: string | null;
    cliente_nombre: string | null;
    cliente_ruc: string | null;
    sector_ax_nombre: string | null;
    sector_nombre: string | null;
    negocio_nombre: string | null;
    linea_nombre: string | null;
    sublinea_nombre: string | null;
    grupo_nombre: string | null;
    ejecutivo_nombre: string | null;
    proyecto: string | null;
    codigo_articulo: string | null;
    articulo: string | null;
    etapa: string | null;
    um: string | null;
    motivo_perdida: string | null;
    tipo_pipeline: string | null;
    licitacion_flag: boolean;
    cantidad: number | null;
    ventas_monto: number | null;
    proyeccion_monto: number | null;
    costo_monto: number | null;
    margen_monto: number | null;
    porcentaje_num: number | null;
    probabilidad_num: number | null;
    observaciones: string | null;
  },
) {
  await requireRoleAccess([...importAccessRoles] as ImportAccessRole[]);

  const parsed = updateFactRowSchema.parse({
    anio: input.anio,
    mes: input.mes,
    trimestre: input.trimestre,
    semana: input.semana,
    fecha_registro: normalizeOptionalDate(input.fecha_registro),
    fecha_adjudicacion: normalizeOptionalDate(input.fecha_adjudicacion),
    fecha_facturacion: normalizeOptionalDate(input.fecha_facturacion),
    situacion: normalizeOptionalText(input.situacion),
    orden_venta: normalizeOptionalText(input.orden_venta),
    factura: normalizeOptionalText(input.factura),
    oc: normalizeOptionalText(input.oc),
    cliente_nombre: normalizeOptionalText(input.cliente_nombre),
    cliente_ruc: normalizeOptionalText(input.cliente_ruc),
    sector_ax_nombre: normalizeOptionalText(input.sector_ax_nombre),
    sector_nombre: normalizeOptionalText(input.sector_nombre),
    negocio_nombre: normalizeOptionalText(input.negocio_nombre),
    linea_nombre: normalizeOptionalText(input.linea_nombre),
    sublinea_nombre: normalizeOptionalText(input.sublinea_nombre),
    grupo_nombre: normalizeOptionalText(input.grupo_nombre),
    ejecutivo_nombre: normalizeOptionalText(input.ejecutivo_nombre),
    proyecto: normalizeOptionalText(input.proyecto),
    codigo_articulo: normalizeOptionalText(input.codigo_articulo),
    articulo: normalizeOptionalText(input.articulo),
    etapa: normalizeOptionalText(input.etapa),
    um: normalizeOptionalText(input.um),
    motivo_perdida: normalizeOptionalText(input.motivo_perdida),
    tipo_pipeline: normalizeOptionalText(input.tipo_pipeline),
    licitacion_flag: input.licitacion_flag,
    cantidad: input.cantidad,
    ventas_monto: input.ventas_monto,
    proyeccion_monto: input.proyeccion_monto,
    costo_monto: input.costo_monto,
    margen_monto: input.margen_monto,
    porcentaje_num: input.porcentaje_num,
    probabilidad_num: input.probabilidad_num,
    observaciones: normalizeOptionalText(input.observaciones),
  });

  const importRow = await getImportRowForEdit(importId);
  const importData = parseImportData(importId, importRow.data);

  const nextRows = importData.rows.map((row) => {
    if (row.row_number !== rowId) return row;

    return {
      ...row,
      payload: {
        ...row.payload,
        anio: parsed.anio,
        mes: parsed.mes,
        semana: parsed.semana,
        fecha_registro: parsed.fecha_registro,
        fecha_adjudicacion: parsed.fecha_adjudicacion,
        fecha_facturacion: parsed.fecha_facturacion,
        situacion: parsed.situacion,
        orden_venta: parsed.orden_venta,
        factura: parsed.factura,
        oc: parsed.oc,
        proyecto: parsed.proyecto,
        codigo_articulo: parsed.codigo_articulo,
        articulo: parsed.articulo,
        etapa: parsed.etapa,
        um: parsed.um,
        motivo_perdida: parsed.motivo_perdida,
        tipo_pipeline: parsed.tipo_pipeline,
        licitacion_flag: parsed.licitacion_flag,
        cantidad: parsed.cantidad,
        ventas_monto: parsed.ventas_monto,
        proyeccion_monto: parsed.proyeccion_monto,
        probabilidad_num: parsed.probabilidad_num,
        observaciones: parsed.observaciones,
        cliente: parsed.cliente_nombre,
        ruc: parsed.cliente_ruc,
        sector_ax: parsed.sector_ax_nombre,
        sector: parsed.sector_nombre,
        negocio: parsed.negocio_nombre,
        linea: parsed.linea_nombre,
        sublinea: parsed.sublinea_nombre,
        grupo: parsed.grupo_nombre,
        ejecutivo: parsed.ejecutivo_nombre,
        costo_monto: parsed.costo_monto,
        margen_monto: parsed.margen_monto,
        porcentaje_num: parsed.porcentaje_num,
      },
    } satisfies ImportJsonRow;
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
    .from("imports")
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
    throw new Error("No se pudo actualizar la fila de la importacion.");
  }

  revalidatePath("/dashboard/imports");
  revalidatePath(`/dashboard/imports/${importId}`);
}

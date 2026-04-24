import "server-only";

import { revalidatePath } from "next/cache";

import { requireRoleAccess } from "@/lib/auth/authorization";
import { canManageImports, importManagerRoles } from "@/lib/auth/roles";
import type { CurrentUser } from "@/lib/auth/session";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AppRole, ImportFactRow, ImportRecord } from "@/lib/types/database";
import {
  importYearSchema,
  updateFactRowSchema,
  updateImportSchema,
  validateImportFile,
} from "@/lib/validators/imports";
import { parseAxWorkbook, type SubwayImportSourceKey } from "@/modules/imports/parser/excel";
import {
  buildImportAudit,
  parseImportAudit,
  type ImportAudit,
} from "@/modules/imports/services/import-audit";

export const importAccessRoles = importManagerRoles;

type ImportAccessRole = (typeof importAccessRoles)[number];
type SupabaseAdminClient = ReturnType<typeof createAdminSupabaseClient>;

type ImportJsonRow = {
  id: number;
  row_number: number;
  parse_status: "valid" | "error";
  parse_errors: string[];
  payload: Record<string, unknown>;
};

type ImportJsonPayload = {
  sourceKey: SubwayImportSourceKey;
  sheetName: string;
  columns: string[];
  rows: ImportJsonRow[];
  audit: ImportAudit;
};

type ImportProfile = { full_name: string | null; email: string };

type RecentImportRow = Omit<ImportRecord, "uploaded_by_profile" | "sucursal"> & {
  data?: unknown;
  profiles:
    | Array<{ full_name: string | null; email: string }>
    | { full_name: string | null; email: string }
    | null;
  sucursales_subway:
    | Array<{ nombre: string | null }>
    | { nombre: string | null }
    | null;
};

export type SubwayBranch = {
  id: number;
  nombre: string;
};

function normalizeImportRecord(row: RecentImportRow): ImportRecord {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const branch = Array.isArray(row.sucursales_subway) ? row.sucursales_subway[0] : row.sucursales_subway;

  return {
    ...row,
    anio: row.anio ?? null,
    uploaded_by_profile: profile ?? null,
    sucursal: branch?.nombre ?? null,
  };
}

export function canAccessImports(role: AppRole) {
  return canManageImports(role);
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeOptionalDate(value: string | null | undefined) {
  const normalized = normalizeOptionalText(value);
  return normalized ? normalized : null;
}

function normalizeImportDate(value: string | null | undefined) {
  const normalized = normalizeOptionalDate(value);
  if (!normalized) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error("La fecha de importacion debe tener formato YYYY-MM-DD.");
  }

  return normalized;
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

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;

  const parsed = Number(value.replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function toRequiredText(value: unknown, fallback: string) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  if (typeof value === "number") return String(value);

  return fallback;
}

function getProductCategory(description: string) {
  const normalized = description
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();

  if (normalized.includes("COMBO")) return "COMBO";
  if (normalized.includes("BEBIDA") || normalized.includes("GASEOSA") || normalized.includes("AGUA")) return "BEBIDA";
  if (normalized.includes("EXTRA") || normalized.includes("ADICIONAL")) return "EXTRA";
  if (normalized.includes("SUB")) return "SUB";

  return "OTROS";
}

function toNullableBoolean(value: unknown): boolean | null {
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
  const subwayReference = payload.referencia ?? payload.codigo_articulo;
  const subwayDescription = payload.descripcion ?? payload.articulo;
  const subwayUnits = payload.unidades ?? payload.cantidad;
  const subwayTotal = payload.total ?? payload.ventas_monto;
  const probability = normalizeProbability(toNullableNumber(payload.probabilidad_num));
  const projection = toNullableNumber(payload.proyeccion_monto);

  return normalizeJsonFactRow(importId, {
    id: rowNumber,
    row_number: rowNumber,
    import_id: importId,
    anio: typeof payload.anio === "number" ? payload.anio : null,
    fecha_registro: payload.fecha_registro,
    fecha_adjudicacion: payload.fecha_adjudicacion,
    fecha_facturacion: payload.fecha_facturacion,
    situacion: payload.situacion,
    orden_venta: payload.orden_venta,
    factura: payload.factura,
    oc: payload.oc,
    proyecto: payload.proyecto,
    codigo_articulo: subwayReference,
    articulo: subwayDescription,
    etapa: payload.etapa,
    um: payload.um,
    motivo_perdida: payload.motivo_perdida,
    tipo_pipeline: payload.tipo_pipeline,
    licitacion_flag: payload.licitacion_flag,
    cantidad: subwayUnits,
    ventas_monto: subwayTotal,
    proyeccion_monto: payload.proyeccion_monto,
    probabilidad_num: probability,
    forecast_ponderado:
      probability !== null && projection !== null ? projection * probability : null,
    observaciones: payload.observaciones ?? payload.forma_pago,
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
      sourceKey: "ax-commercial",
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
    sourceKey:
      value.sourceKey === "ax_forma_pedido" ? "ax_forma_pedido" : "ax-commercial",
    sheetName: typeof value.sheetName === "string" ? value.sheetName : "",
    columns,
    rows,
    audit,
  };
}

function buildImportData(
  parsed: Awaited<ReturnType<typeof parseAxWorkbook>>,
  sourceKey: SubwayImportSourceKey,
) {
  const rows = parsed.parsedRows.map((row) => ({
    id: row.rowNumber,
    row_number: row.rowNumber,
    parse_status: row.parseStatus,
    parse_errors: row.parseErrors,
    payload: row.payload,
  })) satisfies ImportJsonRow[];

  return {
    sourceKey,
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

function buildSalesProductRows(importId: string, data: ImportJsonPayload) {
  return data.rows
    .filter((row) => row.parse_status === "valid")
    .flatMap((row) => {
      const referencia = toNullableString(row.payload.referencia) ?? toNullableString(row.payload.codigo_articulo);
      if (!referencia) return [];

      return [
        {
          import_id: importId,
          referencia,
          unidades: toNumber(row.payload.unidades ?? row.payload.cantidad),
          ventas: toNumber(row.payload.total ?? row.payload.ventas_monto),
        },
      ];
    });
}

function buildSalesPaymentRows(importId: string, data: ImportJsonPayload) {
  return data.rows
    .filter((row) => row.parse_status === "valid")
    .flatMap((row) => {
      const formaPago = toRequiredText(row.payload.forma_pago, "");
      if (!formaPago) return [];

      return [
        {
          import_id: importId,
          forma_pago: formaPago,
          importe: toNumber(row.payload.importe),
          operaciones: Math.trunc(toNumber(row.payload.numero_operaciones)),
        },
      ];
    });
}

function buildProductCatalogRows(data: ImportJsonPayload) {
  const products = new Map<string, { referencia: string; producto: string; categoria: string }>();

  for (const row of data.rows) {
    if (row.parse_status !== "valid") continue;

    const referencia = toNullableString(row.payload.referencia) ?? toNullableString(row.payload.codigo_articulo);
    const producto = toRequiredText(row.payload.descripcion ?? row.payload.articulo, "");

    if (!referencia || !producto) continue;

    products.set(referencia, {
      referencia,
      producto,
      categoria: getProductCategory(producto),
    });
  }

  return [...products.values()];
}

async function syncProductsCatalog(admin: SupabaseAdminClient, data: ImportJsonPayload) {
  const products = buildProductCatalogRows(data);
  if (!products.length) return;

  const { error } = await admin.from("products_subway").upsert(products, {
    onConflict: "referencia",
  });

  if (error) {
    console.error("[imports][service] Error al sincronizar catalogo de productos", error);
    throw new Error("No se pudo sincronizar products_subway.");
  }
}

async function rematerializeSalesFacts(
  admin: SupabaseAdminClient,
  importId: string,
  data: ImportJsonPayload,
) {
  const [{ error: productDeleteError }, { error: paymentDeleteError }] = await Promise.all([
    admin.from("sales_product").delete().eq("import_id", importId),
    admin.from("sales_payment").delete().eq("import_id", importId),
  ]);

  if (productDeleteError || paymentDeleteError) {
    console.error("[imports][service] Error al limpiar hechos Subway", {
      productDeleteError,
      paymentDeleteError,
    });
    throw new Error("No se pudieron limpiar las tablas sales_product/sales_payment.");
  }

  if (data.sourceKey === "ax_forma_pedido") {
    const paymentRows = buildSalesPaymentRows(importId, data);
    if (!paymentRows.length) return;

    const { error } = await admin.from("sales_payment").insert(paymentRows);

    if (error) {
      console.error("[imports][service] Error al guardar sales_payment", error);
      throw new Error("No se pudo guardar la importacion en sales_payment.");
    }

    return;
  }

  await syncProductsCatalog(admin, data);
  const productRows = buildSalesProductRows(importId, data);
  if (!productRows.length) return;

  const { error } = await admin.from("sales_product").insert(productRows);

  if (error) {
    console.error("[imports][service] Error al guardar sales_product", error);
    throw new Error("No se pudo guardar la importacion en sales_product.");
  }
}

function getImportYearFromData(data: ImportJsonPayload) {
  for (const row of data.rows) {
    const parsedYear = importYearSchema.safeParse(row.payload.anio);

    if (parsedYear.success) {
      return parsedYear.data;
    }
  }

  return new Date().getFullYear();
}

function collectNormalizedRows(importId: string, data: ImportJsonPayload) {
  return data.rows.map((row) => ({
    ...mapPayloadToLegacyRow(importId, row.row_number, row.payload),
  }));
}

function buildPreviewRows(importId: string, data: ImportJsonPayload) {
  return data.rows.map((row) => ({
    fila_excel: row.row_number,
    parse_status: row.parse_status,
    ...row.payload,
    import_id: importId,
  }));
}

function buildImportDebugSummary(data: ImportJsonPayload, limit = 10) {
  return data.rows.slice(0, limit).map((row) => ({
    fila_excel: row.row_number,
    referencia: row.payload.referencia ?? null,
    descripcion: row.payload.descripcion ?? null,
    forma_pago: row.payload.forma_pago ?? null,
    unidades: row.payload.unidades ?? null,
    total: row.payload.total ?? null,
    importe: row.payload.importe ?? null,
  }));
}

async function getProfilesById(userIds: string[]) {
  const uniqueIds = [...new Set(userIds)].filter(Boolean);
  if (!uniqueIds.length) return new Map<string, ImportProfile>();

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles_subway")
    .select("id, full_name, email")
    .in("id", uniqueIds);

  if (error) {
    console.error("[imports][service] Error al resolver perfiles", error);
    return new Map<string, ImportProfile>();
  }

  return new Map(
    ((data ?? []) as Array<ImportProfile & { id: string }>).map((profile) => [
      profile.id,
      { full_name: profile.full_name, email: profile.email },
    ]),
  );
}

async function getImportRowForEdit(importId: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("imports_subway")
    .select("id, fecha, data")
    .eq("id", importId)
    .single();

  if (error || !data) {
    throw new Error("No se encontro la importacion.");
  }

  return data as { id: string; fecha: string | null; data?: unknown };
}

export async function listSubwayBranches() {
  await requireRoleAccess([...importAccessRoles] as ImportAccessRole[]);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("sucursales_subway")
    .select("id, nombre")
    .order("nombre", { ascending: true });

  if (error) {
    console.error("[imports][service] Error al listar sucursales", error);
    return [] as SubwayBranch[];
  }

  return ((data ?? []) as Array<{ id: number; nombre: string | null }>).map((branch) => ({
    id: branch.id,
    nombre: branch.nombre ?? `Sucursal ${branch.id}`,
  }));
}

export async function createImportFromUpload(
  file: File,
  currentUser: CurrentUser,
  options: { fecha?: string | null; sourceKey?: SubwayImportSourceKey; sucursalId?: number | null } = {},
) {
  const admin = createAdminSupabaseClient();
  validateImportFile(file);

  const sourceKey = options.sourceKey ?? "ax-commercial";
  const fecha = normalizeImportDate(options.fecha);
  const sucursalId = options.sucursalId;

  if (!fecha) {
    throw new Error("Debes indicar una fecha de venta para la importacion.");
  }

  if (!sucursalId || !Number.isInteger(sucursalId) || sucursalId <= 0) {
    throw new Error("Debes seleccionar una sucursal valida.");
  }

  const parsed = await parseAxWorkbook(file, sourceKey);
  const storagePath = buildImportSourceRef(file.name, currentUser.id);
  const importData = buildImportData(parsed, sourceKey);
  const importYear = fecha ? Number(fecha.slice(0, 4)) : getImportYearFromData(importData);
  const validRows = importData.audit.validRows;
  const errorRows = importData.audit.invalidRows;

  console.groupCollapsed("[imports][service] Resumen de importacion");
  console.log("archivo", file.name);
  console.log("usuario", currentUser.id);
  console.log("sucursal_id", sucursalId);
  console.log("source_key", sourceKey);
  console.log("fecha", fecha);
  console.log("hoja", parsed.sheetName);
  console.log("columnas", parsed.columns);
  console.log("total_filas", parsed.parsedRows.length);
  console.log("filas_validas", validRows);
  console.log("filas_con_error", errorRows);
  console.log("filas_con_nulos", importData.audit.rowsWithNullValues);
  console.log("nulos_por_campo", importData.audit.nullFieldCounts);
  console.table(buildImportDebugSummary(importData, 10));
  console.groupEnd();

  const { data: importRow, error: importError } = await admin
    .from("imports_subway")
    .insert({
      file_name: file.name,
      storage_path: storagePath,
      anio: importYear,
      fecha,
      source_key: sourceKey,
      sucursal_id: sucursalId,
      uploaded_by: currentUser.id,
      status: "processing",
      total_rows: parsed.parsedRows.length,
      valid_rows: validRows,
      error_rows: errorRows,
      sheet_name: parsed.sheetName,
      notes: `Hoja ${parsed.sheetName}. Archivo ${sourceKey} normalizado a tablas Subway.`,
      data: importData,
    })
    .select("id")
    .single();

  if (importError || !importRow) {
    console.error("[imports][service] Error al registrar importacion", importError);
    throw new Error(importError?.message ?? "No se pudo registrar la importacion.");
  }

  const importId = importRow.id as string;

  try {
    await rematerializeSalesFacts(admin, importId, importData);
  } catch (error) {
    await admin
      .from("imports_subway")
      .update({
        status: "failed",
        notes:
          error instanceof Error
            ? error.message
            : "Fallo al materializar la importacion en sales_product/sales_payment.",
      })
      .eq("id", importId);

    throw error;
  }

  const { error: updateError } = await admin
    .from("imports_subway")
    .update({
      status: "processed",
    })
    .eq("id", importId);

  if (updateError) {
    console.error("[imports][service] Error al cerrar importacion", updateError);
    throw new Error("La importacion se cargo, pero no se pudo marcar como procesada.");
  }

  revalidatePath("/dashboard/imports");
  revalidatePath("/dashboard/imports/[importId]", "page");
  revalidatePath("/dashboard");

  return {
    id: importId,
    fileName: file.name,
    importYear,
    sheetName: parsed.sheetName,
    columns: parsed.columns,
    previewRows: buildPreviewRows(importId, importData),
    totalRows: parsed.parsedRows.length,
    validRows,
    errorRows,
  };
}

export async function listRecentImports() {
  await requireRoleAccess([...importAccessRoles] as ImportAccessRole[]);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("imports_subway")
    .select(
      "id, file_name, storage_path, anio, fecha, source_key, sucursal_id, uploaded_by, uploaded_at, status, total_rows, valid_rows, error_rows, notes, sucursales_subway(nombre)",
    )
    .order("uploaded_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[imports][service] Error al listar importaciones", error);
    return [];
  }

  const rows = (data ?? []) as unknown as Array<Omit<RecentImportRow, "profiles">>;
  const profiles = await getProfilesById(rows.map((row) => row.uploaded_by));

  return rows.map((row) =>
    normalizeImportRecord({
      ...row,
      profiles: profiles.get(row.uploaded_by) ?? null,
    }),
  );
}

export async function getImportDetail(importId: string) {
  await requireRoleAccess([...importAccessRoles] as ImportAccessRole[]);

  const supabase = await createServerSupabaseClient();
  const { data: importRow, error: importError } = await supabase
    .from("imports_subway")
    .select(
      "id, file_name, storage_path, anio, fecha, source_key, sucursal_id, uploaded_by, uploaded_at, status, total_rows, valid_rows, error_rows, notes, data, sucursales_subway(nombre)",
    )
    .eq("id", importId)
    .single();

  if (importError || !importRow) {
    throw new Error("No se encontro la importacion.");
  }

  const importData = parseImportData(importId, (importRow as { data?: unknown }).data);
  const row = importRow as unknown as Omit<RecentImportRow, "profiles">;
  const profiles = await getProfilesById([row.uploaded_by]);

  return {
    import: normalizeImportRecord({
      ...row,
      profiles: profiles.get(row.uploaded_by) ?? null,
    }),
    rows: collectNormalizedRows(importId, importData),
    audit: importData.audit,
  };
}

export async function updateImportMetadata(
  importId: string,
  input: { anio: number },
) {
  await requireRoleAccess([...importAccessRoles] as ImportAccessRole[]);
  const parsed = updateImportSchema.parse(input);

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("imports_subway")
    .update({ anio: parsed.anio })
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
  const [{ error: productError }, { error: paymentError }] = await Promise.all([
    admin.from("sales_product").delete().eq("import_id", importId),
    admin.from("sales_payment").delete().eq("import_id", importId),
  ]);

  if (productError || paymentError) {
    throw new Error("No se pudieron limpiar los hechos asociados a la importacion.");
  }

  const { error } = await admin
    .from("imports_subway")
    .delete()
    .eq("id", importId);

  if (error) {
    throw new Error("No se pudo eliminar la importacion.");
  }

  revalidatePath("/dashboard/imports");
  revalidatePath(`/dashboard/imports/${importId}`);
  revalidatePath("/dashboard");
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
    .from("imports_subway")
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

  await rematerializeSalesFacts(admin, importId, {
    ...importData,
    rows: nextRows,
    audit: nextAudit,
  });

  revalidatePath("/dashboard/imports");
  revalidatePath(`/dashboard/imports/${importId}`);
  revalidatePath("/dashboard");
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
        referencia: parsed.codigo_articulo,
        codigo_articulo: parsed.codigo_articulo,
        descripcion: parsed.articulo,
        articulo: parsed.articulo,
        etapa: parsed.etapa,
        um: parsed.um,
        motivo_perdida: parsed.motivo_perdida,
        tipo_pipeline: parsed.tipo_pipeline,
        licitacion_flag: parsed.licitacion_flag,
        unidades: parsed.cantidad,
        cantidad: parsed.cantidad,
        total: parsed.ventas_monto,
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
    .from("imports_subway")
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

  await rematerializeSalesFacts(admin, importId, {
    ...importData,
    rows: nextRows,
    audit: nextAudit,
  });

  revalidatePath("/dashboard/imports");
  revalidatePath(`/dashboard/imports/${importId}`);
  revalidatePath("/dashboard");
}

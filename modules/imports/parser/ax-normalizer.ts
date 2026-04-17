export interface ParsedAxRow {
  rowNumber: number;
  payload: Record<string, unknown>;
  parseStatus: "valid" | "error";
  parseErrors: string[];
}

const HEADER_ALIASES: Record<string, string> = {
  ano: "anio",
  estado: "situacion",
  año: "anio",
  situacion: "situacion",
  mes: "mes",
  semana: "semana",
  "fecha registro": "fecha_registro",
  "fecha de registro": "fecha_registro",
  "fecha ingreso": "fecha_registro",
  "fecha de ingreso": "fecha_registro",
  "fecha adjudicacion": "fecha_adjudicacion",
  "fecha de adjudicacion": "fecha_adjudicacion",
  "fecha factura": "fecha_facturacion",
  "fecha facturacion": "fecha_facturacion",
  "fecha de facturacion": "fecha_facturacion",
  "orden venta": "orden_venta",
  "orden de venta": "orden_venta",
  factura: "factura",
  oc: "oc",
  cliente: "cliente",
  ruc: "ruc",
  "sector ax": "sector_ax",
  sector: "sector",
  negocio: "negocio",
  linea: "linea",
  sublinea: "sublinea",
  "sub linea": "sublinea",
  "sub-linea": "sublinea",
  grupo: "grupo",
  proyecto: "proyecto",
  "nombre de proyecto": "proyecto",
  "codigo articulo": "codigo_articulo",
  codigo: "codigo_articulo",
  articulo: "articulo",
  dimension1: "dimension1",
  dimension2: "dimension2",
  "dimension 3": "dimension3",
  dimension3: "dimension3",
  cantidad: "cantidad",
  um: "um",
  etapa: "etapa",
  "motivo perdida": "motivo_perdida",
  "tipo pipeline": "tipo_pipeline",
  "bl / proy": "tipo_pipeline",
  "bl/proy": "tipo_pipeline",
  pipeline: "pipeline",
  licitacion: "licitacion_flag",
  licitaciones: "licitacion_flag",
  probabilidad: "probabilidad_num",
  ventas: "ventas_monto",
  "ventas s/": "ventas_monto",
  "ventas s/.": "ventas_monto",
  proyeccion: "proyeccion_monto",
  costo: "costo_monto",
  margen: "margen_monto",
  porcentaje: "porcentaje_num",
  ejecutivo: "ejecutivo",
  "ejecutivo de ventas": "ejecutivo",
  observaciones: "observaciones",
};

const MONTH_NAME_MAP: Record<string, number> = {
  enero: 1,
  ene: 1,
  febrero: 2,
  feb: 2,
  marzo: 3,
  mar: 3,
  abril: 4,
  abr: 4,
  mayo: 5,
  may: 5,
  junio: 6,
  jun: 6,
  julio: 7,
  jul: 7,
  agosto: 8,
  ago: 8,
  setiembre: 9,
  set: 9,
  septiembre: 9,
  sep: 9,
  octubre: 10,
  oct: 10,
  noviembre: 11,
  nov: 11,
  diciembre: 12,
  dic: 12,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizeExcelCellValue(value: unknown): unknown {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value;

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (!isRecord(value)) return "";

  if (Array.isArray(value.richText)) {
    const text = value.richText
      .map((item) => (isRecord(item) && typeof item.text === "string" ? item.text : ""))
      .join("")
      .trim();

    return text || "";
  }

  if ("result" in value) {
    return normalizeExcelCellValue(value.result);
  }

  if (typeof value.text === "string") {
    return value.text.trim();
  }

  return "";
}

function normalizeHeader(header: string) {
  const key = header
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  return HEADER_ALIASES[key] ?? key.replace(/\s+/g, "_");
}

export function buildPayloadFromRow(headers: string[], values: unknown[]) {
  return headers.reduce<Record<string, unknown>>((acc, header, index) => {
    acc[normalizeHeader(header)] = normalizeExcelCellValue(values[index]);
    return acc;
  }, {});
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function parseFlexibleNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const sanitized = trimmed
    .replace(/[%\s]/g, "")
    .replace(/[Ss]\/\.?/g, "")
    .replace(/\$/g, "");

  if (!sanitized) return null;

  const commaCount = (sanitized.match(/,/g) ?? []).length;
  const dotCount = (sanitized.match(/\./g) ?? []).length;

  let normalized = sanitized;

  if (commaCount > 0 && dotCount > 0) {
    normalized = sanitized.replace(/,/g, "");
  } else if (commaCount > 0) {
    const lastSegment = sanitized.split(",").at(-1) ?? "";
    normalized =
      commaCount >= 1 && lastSegment.length === 3
        ? sanitized.replace(/,/g, "")
        : sanitized.replace(",", ".");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseIntegerLike(value: unknown) {
  const parsed = parseFlexibleNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function parseMonth(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.getMonth() + 1;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 1 && value <= 12 ? Math.trunc(value) : null;
  }

  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const directNumber = parseIntegerLike(trimmed);
  if (directNumber !== null && directNumber >= 1 && directNumber <= 12) {
    return directNumber;
  }

  const normalized = trimmed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (MONTH_NAME_MAP[normalized]) {
    return MONTH_NAME_MAP[normalized];
  }

  const monthToken = normalized.match(/[a-z]+/)?.[0] ?? "";
  return MONTH_NAME_MAP[monthToken] ?? null;
}

function parseBooleanLike(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (["si", "sí", "yes", "true", "1", "x"].includes(normalized)) return true;
  if (["no", "false", "0"].includes(normalized)) return false;
  return null;
}

function parseDateLike(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const text = normalizeText(value);
  return text ?? null;
}

export function normalizeAxRow(
  rowNumber: number,
  payload: Record<string, unknown>,
): ParsedAxRow {
  const mes = parseMonth(payload.mes);
  const semana = parseIntegerLike(payload.semana);
  const anio = parseIntegerLike(payload.anio);
  const cantidad = parseFlexibleNumber(payload.cantidad);
  const ventasMonto = parseFlexibleNumber(payload.ventas_monto);
  const proyeccionMonto = parseFlexibleNumber(payload.proyeccion_monto);
  const costoMonto = parseFlexibleNumber(payload.costo_monto);
  const margenMonto = parseFlexibleNumber(payload.margen_monto);
  const porcentajeNum = parseFlexibleNumber(payload.porcentaje_num);
  const probabilidadNum = parseFlexibleNumber(payload.probabilidad_num);
  const licitacionFlag = parseBooleanLike(payload.licitacion_flag);

  return {
    rowNumber,
    payload: {
      ...payload,
      anio,
      mes,
      semana,
      fecha_registro: parseDateLike(payload.fecha_registro),
      fecha_adjudicacion: parseDateLike(payload.fecha_adjudicacion),
      fecha_facturacion: parseDateLike(payload.fecha_facturacion),
      situacion: normalizeText(payload.situacion),
      orden_venta: normalizeText(payload.orden_venta),
      factura: normalizeText(payload.factura),
      oc: normalizeText(payload.oc),
      sector_ax: normalizeText(payload.sector_ax),
      sector: normalizeText(payload.sector),
      ruc: normalizeText(payload.ruc),
      cliente: normalizeText(payload.cliente),
      negocio: normalizeText(payload.negocio),
      linea: normalizeText(payload.linea),
      sublinea: normalizeText(payload.sublinea),
      grupo: normalizeText(payload.grupo),
      proyecto: normalizeText(payload.proyecto),
      codigo_articulo: normalizeText(payload.codigo_articulo),
      articulo: normalizeText(payload.articulo),
      dimension1: normalizeText(payload.dimension1),
      dimension2: normalizeText(payload.dimension2),
      dimension3: normalizeText(payload.dimension3),
      cantidad,
      um: normalizeText(payload.um),
      etapa: normalizeText(payload.etapa),
      motivo_perdida: normalizeText(payload.motivo_perdida),
      tipo_pipeline: normalizeText(payload.tipo_pipeline),
      pipeline: normalizeText(payload.pipeline),
      licitacion_flag: licitacionFlag,
      probabilidad_num: probabilidadNum,
      ventas_monto: ventasMonto,
      proyeccion_monto: proyeccionMonto,
      costo_monto: costoMonto,
      margen_monto: margenMonto,
      porcentaje_num: porcentajeNum,
      ejecutivo: normalizeText(payload.ejecutivo),
      observaciones: normalizeText(payload.observaciones),
    },
    parseStatus: "valid",
    parseErrors: [],
  };
}

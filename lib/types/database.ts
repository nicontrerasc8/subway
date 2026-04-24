export type AppRole =
  | "administrador_comercial"
  | "gerente_comercial"
  | "jefe_area"
  | "ejecutivo_ventas"
  | "directorio";

export interface ProfileRecord {
  id: string;
  full_name: string | null;
  email: string;
  role: AppRole;
  is_active: boolean;
  created_at: string;
}

export interface ImportRecord {
  id: string;
  file_name: string;
  storage_path: string | null;
  anio: number | null;
  fecha: string | null;
  source_key?: string | null;
  sucursal_id: number;
  sucursal?: string | null;
  uploaded_by: string;
  uploaded_at: string;
  status: "pending" | "processing" | "processed" | "failed";
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  notes: string | null;
  uploaded_by_profile?: Pick<ProfileRecord, "full_name" | "email"> | null;
}

export interface ImportFactRow {
  id: number;
  import_id: string;
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
  probabilidad_num: number | null;
  forecast_ponderado: number | null;
  observaciones: string | null;
  cliente_nombre: string | null;
  cliente_ruc: string | null;
  sector_ax_nombre: string | null;
  sector_nombre: string | null;
  negocio_nombre: string | null;
  linea_nombre: string | null;
  sublinea_nombre: string | null;
  grupo_nombre: string | null;
  ejecutivo_nombre: string | null;
  costo_monto: number | null;
  margen_monto: number | null;
  porcentaje_num: number | null;
}

import { NextResponse } from "next/server";

import { canManageImports } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import {
  deleteImportFactRow,
  updateImportFactRow,
} from "@/modules/imports/services/import-service";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ importId: string; rowId: string }> },
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Sesion no valida." }, { status: 401 });
    }

    if (!canManageImports(currentUser.role)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { importId, rowId } = await params;
    const body = (await request.json()) as {
      anio?: number | null;
      mes?: number | null;
      trimestre?: number | null;
      semana?: number | null;
      fecha_registro?: string | null;
      fecha_adjudicacion?: string | null;
      fecha_facturacion?: string | null;
      situacion?: string | null;
      orden_venta?: string | null;
      factura?: string | null;
      oc?: string | null;
      cliente_nombre?: string | null;
      cliente_ruc?: string | null;
      sector_ax_nombre?: string | null;
      sector_nombre?: string | null;
      negocio_nombre?: string | null;
      linea_nombre?: string | null;
      sublinea_nombre?: string | null;
      grupo_nombre?: string | null;
      ejecutivo_nombre?: string | null;
      proyecto?: string | null;
      codigo_articulo?: string | null;
      articulo?: string | null;
      etapa?: string | null;
      um?: string | null;
      motivo_perdida?: string | null;
      tipo_pipeline?: string | null;
      licitacion_flag?: boolean;
      cantidad?: number | null;
      ventas_monto?: number | null;
      proyeccion_monto?: number | null;
      costo_monto?: number | null;
      margen_monto?: number | null;
      porcentaje_num?: number | null;
      probabilidad_num?: number | null;
      observaciones?: string | null;
    };

    await updateImportFactRow(importId, Number(rowId), {
      anio: body.anio ?? null,
      mes: body.mes ?? null,
      trimestre: body.trimestre ?? null,
      semana: body.semana ?? null,
      fecha_registro: body.fecha_registro ?? null,
      fecha_adjudicacion: body.fecha_adjudicacion ?? null,
      fecha_facturacion: body.fecha_facturacion ?? null,
      situacion: body.situacion ?? null,
      orden_venta: body.orden_venta ?? null,
      factura: body.factura ?? null,
      oc: body.oc ?? null,
      cliente_nombre: body.cliente_nombre ?? null,
      cliente_ruc: body.cliente_ruc ?? null,
      sector_ax_nombre: body.sector_ax_nombre ?? null,
      sector_nombre: body.sector_nombre ?? null,
      negocio_nombre: body.negocio_nombre ?? null,
      linea_nombre: body.linea_nombre ?? null,
      sublinea_nombre: body.sublinea_nombre ?? null,
      grupo_nombre: body.grupo_nombre ?? null,
      ejecutivo_nombre: body.ejecutivo_nombre ?? null,
      proyecto: body.proyecto ?? null,
      codigo_articulo: body.codigo_articulo ?? null,
      articulo: body.articulo ?? null,
      etapa: body.etapa ?? null,
      um: body.um ?? null,
      motivo_perdida: body.motivo_perdida ?? null,
      tipo_pipeline: body.tipo_pipeline ?? null,
      licitacion_flag: body.licitacion_flag ?? false,
      cantidad: body.cantidad ?? null,
      ventas_monto: body.ventas_monto ?? null,
      proyeccion_monto: body.proyeccion_monto ?? null,
      costo_monto: body.costo_monto ?? null,
      margen_monto: body.margen_monto ?? null,
      porcentaje_num: body.porcentaje_num ?? null,
      probabilidad_num: body.probabilidad_num ?? null,
      observaciones: body.observaciones ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar la fila.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ importId: string; rowId: string }> },
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Sesion no valida." }, { status: 401 });
    }

    if (!canManageImports(currentUser.role)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { importId, rowId } = await params;
    await deleteImportFactRow(importId, Number(rowId));

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo eliminar la fila.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

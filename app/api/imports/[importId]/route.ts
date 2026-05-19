import { NextResponse } from "next/server";

import { canManageImports } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import {
  deleteImport,
  updateImportMetadata,
} from "@/modules/imports/services/import-service";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ importId: string }> },
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Sesion no valida." }, { status: 401 });
    }

    if (!canManageImports(currentUser.role)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { importId } = await params;
    const body = (await request.json().catch(() => null)) as { anio?: number } | null;
    await updateImportMetadata(importId, {
      anio: body?.anio ?? 0,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar la importacion.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ importId: string }> },
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Sesion no valida." }, { status: 401 });
    }

    if (!canManageImports(currentUser.role)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { importId } = await params;
    await deleteImport(importId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo eliminar la importacion.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

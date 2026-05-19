import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { importYearSchema } from "@/lib/validators/imports";
import { canManageAccountingImports } from "@/modules/imports/services/import-service";
import {
  createAccountingImportFromUpload,
  saveAccountingImportFromPreview,
} from "@/modules/imports/services/accounting-import-service";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Sesion no valida." }, { status: 401 });
    }

    if (!canManageAccountingImports(currentUser.role)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as {
        fileName?: string;
        importYear?: number;
        sheetName?: string;
        monthlyRowsBySection?: unknown;
      };

      if (
        typeof body.fileName !== "string" ||
        typeof body.sheetName !== "string" ||
        !body.monthlyRowsBySection ||
        typeof body.monthlyRowsBySection !== "object"
      ) {
        return NextResponse.json(
          { error: "Payload contable invalido para guardar." },
          { status: 400 },
        );
      }

      const result = await saveAccountingImportFromPreview(
        {
          fileName: body.fileName,
          importYear: importYearSchema.parse(body.importYear),
          sheetName: body.sheetName,
          monthlyRowsBySection: body.monthlyRowsBySection as Parameters<
            typeof saveAccountingImportFromPreview
          >[0]["monthlyRowsBySection"],
        },
        currentUser,
      );

      return NextResponse.json(result, { status: 201 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const importYearRaw = formData.get("anio");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Debes adjuntar un archivo Excel valido." },
        { status: 400 },
      );
    }

    const importYear = importYearSchema.parse(importYearRaw);
    const result = await createAccountingImportFromUpload(
      file,
      currentUser,
      importYear,
    );

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo procesar la carga contable.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

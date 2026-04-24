"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ImportRecord } from "@/lib/types/database";
import { formatDateOnly } from "@/lib/utils";
import type { SubwayImportSourceKey } from "@/modules/imports/parser/excel";
import type { SubwayBranch } from "@/modules/imports/services/import-service";

const statusVariantMap = {
  pending: "warning",
  processing: "warning",
  processed: "success",
  failed: "destructive",
} as const;

interface UploadResponse {
  error?: string;
}

const sourceLabelMap: Record<string, string> = {
  "ax-commercial": "Ventas",
  "ax_forma_pedido": "Forma de pedido",
};

function getTodayInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function ImportUploadCard({
  title,
  description,
  sourceKey,
  accentClassName,
  branches,
}: {
  title: string;
  description: string;
  sourceKey: SubwayImportSourceKey;
  accentClassName: string;
  branches: SubwayBranch[];
}) {
  const router = useRouter();
  const fileInputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [fecha, setFecha] = useState(getTodayInputValue);
  const [sucursalId, setSucursalId] = useState(
    branches[0] ? String(branches[0].id) : "",
  );
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!file) {
      toast.error("Selecciona un archivo Excel antes de continuar.");
      return;
    }

    if (!sucursalId) {
      toast.error("Selecciona una sucursal antes de continuar.");
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("fecha", fecha);
        formData.append("source_key", sourceKey);
        formData.append("sucursal_id", sucursalId);

        const response = await fetch("/api/imports", {
          method: "POST",
          body: formData,
        });
        const payload = (await response.json()) as UploadResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? "No se pudo importar el archivo.");
        }

        setFile(null);
        router.refresh();
        toast.success(`${title} importado correctamente.`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Error durante la importacion.",
        );
      }
    });
  }

  return (
    <Card className="overflow-hidden">
      <div className={`h-1 w-full ${accentClassName}`} />
      <CardHeader>
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
          Importar
        </p>
        <CardTitle className="mt-2">{title}</CardTitle>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <label htmlFor={`${fileInputId}-fecha`} className="text-sm font-medium text-foreground">
              Fecha de venta
            </label>
            <Input
              id={`${fileInputId}-fecha`}
              type="date"
              value={fecha}
              onChange={(event) => setFecha(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Esta fecha se guarda en `imports_subway.fecha`.
            </p>
          </div>

          <div className="grid gap-2">
            <label htmlFor={`${fileInputId}-branch`} className="text-sm font-medium text-foreground">
              Sucursal
            </label>
            <select
              id={`${fileInputId}-branch`}
              value={sucursalId}
              onChange={(event) => setSucursalId(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none"
            >
              {branches.length ? (
                branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.nombre}
                  </option>
                ))
              ) : (
                <option value="">Sin sucursales</option>
              )}
            </select>
            <p className="text-xs text-muted-foreground">
              Cada importacion queda asociada a una sucursal concreta.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
          <input
            id={fileInputId}
            type="file"
            accept=".xlsx"
            className="sr-only"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="text-sm font-medium text-foreground">
                Excel de carga
              </p>
              <div className="inline-flex min-h-9 max-w-full items-center rounded-lg border border-dashed border-border bg-background/80 px-3 py-2 text-sm text-foreground shadow-sm">
                <span className="truncate">
                  {file ? file.name : "Ningun archivo seleccionado"}
                </span>
              </div>
            </div>
            <Button
              type="button"
              className="h-11 rounded-lg border-border/70 bg-background px-4 shadow-sm text-black"
              onClick={() => document.getElementById(fileInputId)?.click()}
            >
              <UploadCloud className="size-4" />
              {file ? "Cambiar archivo" : "Seleccionar archivo"}
            </Button>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isPending || !file || !sucursalId}
          className="h-12 w-full rounded-lg bg-[#008938] text-sm font-semibold text-white shadow-[0_12px_30px_rgba(0,137,56,0.22)] transition hover:-translate-y-0.5 hover:bg-[#007a32] hover:shadow-[0_16px_34px_rgba(0,137,56,0.28)] disabled:translate-y-0 disabled:shadow-none"
        >
          {isPending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <UploadCloud className="size-4" />
          )}
          Procesar importacion
        </Button>
      </CardContent>
    </Card>
  );
}

function ImportHistoryCard({ imports }: { imports: ImportRecord[] }) {
  const router = useRouter();
  const [deletingImportId, setDeletingImportId] = useState<string | null>(null);

  async function handleDeleteImport(importId: string) {
    const confirmed = window.confirm(
      "Se eliminara la importacion completa. Esta accion no se puede deshacer.",
    );

    if (!confirmed) return;

    try {
      setDeletingImportId(importId);

      const response = await fetch(`/api/imports/${importId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo eliminar la importacion.");
      }

      router.refresh();
      toast.success("Importacion eliminada.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo eliminar la importacion.",
      );
    } finally {
      setDeletingImportId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial reciente</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3">Archivo</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Sucursal</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Filas</th>
                <th className="px-4 py-3">Validas</th>
                <th className="px-4 py-3">Errores</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {imports.length ? (
                imports.map((item) => (
                  <tr key={item.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium">{item.file_name}</td>
                    <td className="px-4 py-3">
                      <Badge variant={item.source_key === "ax_forma_pedido" ? "warning" : "success"}>
                        {sourceLabelMap[item.source_key ?? "ax-commercial"] ?? item.source_key}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{item.sucursal ?? `Sucursal ${item.sucursal_id}`}</td>
                    <td className="px-4 py-3">
                      {item.uploaded_by_profile?.full_name ??
                        item.uploaded_by_profile?.email ??
                        item.uploaded_by}
                    </td>
                    <td className="px-4 py-3">{formatDateOnly(item.fecha ?? item.uploaded_at)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariantMap[item.status]}>
                        {item.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{item.total_rows}</td>
                    <td className="px-4 py-3">{item.valid_rows}</td>
                    <td className="px-4 py-3">{item.error_rows}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteImport(item.id)}
                        disabled={deletingImportId === item.id}
                      >
                        {deletingImportId === item.id ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                        Borrar
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    No hay importaciones registradas todavia.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function ImportsPageView({
  imports,
  branches,
}: {
  imports: ImportRecord[];
  branches: SubwayBranch[];
}) {
  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
            Centro de importaciones
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Flujo de carga
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Sube archivos de ventas o pagos y guárdalos directamente en el esquema normalizado de Subway.
          </p>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <ImportUploadCard
          title="Subir Excel de ventas"
          description=""
          sourceKey="ax-commercial"
          accentClassName="bg-[#ffc20a]"
          branches={branches}
        />
        <ImportUploadCard
          title="Subir Excel de forma de pedido"
          description="Lee forma de pago en A, importe en I y numero de operaciones en O para poblar sales_payment."
          sourceKey="ax_forma_pedido"
          accentClassName="bg-[#008938]"
          branches={branches}
        />
      </div>
      <ImportHistoryCard imports={imports} />
    </div>
  );
}

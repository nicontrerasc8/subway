"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, PencilLine, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableElement,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import type { ImportRecord } from "@/lib/types/database";
import { formatDateOnly } from "@/lib/utils";
import type { SubwayImportSourceKey } from "@/modules/imports/parser/excel";

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
  ax_forma_pedido: "Forma de pedido",
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
}: {
  title: string;
  description: string;
  sourceKey: SubwayImportSourceKey;
  accentClassName: string;
}) {
  const router = useRouter();
  const fileInputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [fecha, setFecha] = useState(getTodayInputValue);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!file) {
      toast.error("Selecciona un archivo Excel antes de continuar.");
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("fecha", fecha);
        formData.append("source_key", sourceKey);

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
        <div className="grid gap-2">
          <label htmlFor="import-fecha" className="text-sm font-medium text-foreground">
            Fecha de venta
          </label>
          <Input
            id="import-fecha"
            type="date"
            value={fecha}
            onChange={(event) => setFecha(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            El dashboard consolidara ventas con esta fecha.
          </p>
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
                Excel de ventas
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
          disabled={isPending || !file}
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
          <Table>
            <TableElement>
              <TableHead>
                <tr>
                  <TableHeaderCell>Archivo</TableHeaderCell>
                  <TableHeaderCell>Tipo</TableHeaderCell>
                  <TableHeaderCell>Usuario</TableHeaderCell>
                  <TableHeaderCell>Fecha</TableHeaderCell>
                  <TableHeaderCell>Estado</TableHeaderCell>
                  <TableHeaderCell>Filas</TableHeaderCell>
                  <TableHeaderCell>Validas</TableHeaderCell>
                  <TableHeaderCell>Errores</TableHeaderCell>
                  <TableHeaderCell className="text-right">Acciones</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {imports.length ? (
                  imports.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.file_name}</TableCell>
                      <TableCell>
                        <Badge variant={item.source_key === "ax_forma_pedido" ? "warning" : "success"}>
                          {sourceLabelMap[item.source_key ?? "ax-commercial"] ?? item.source_key}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.uploaded_by_profile?.full_name ??
                          item.uploaded_by_profile?.email ??
                          item.uploaded_by}
                      </TableCell>
                      <TableCell>{formatDateOnly(item.fecha ?? item.uploaded_at)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariantMap[item.status]}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.total_rows}</TableCell>
                      <TableCell>{item.valid_rows}</TableCell>
                      <TableCell>{item.error_rows}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                        
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      No hay importaciones registradas todavia.
                    </td>
                  </tr>
                )}
              </TableBody>
            </TableElement>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export function ImportsPageView({ imports }: { imports: ImportRecord[] }) {
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
            Sube un unico Excel para procesar la importacion de Subway.
          </p>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <ImportUploadCard
          title="Subir Excel de ventas"
          description="Se leeran referencia en A, descripcion en H, unidades en M y total en O. El total se multiplicara por 1.105 antes de guardar para incluir IVA."
          sourceKey="ax-commercial"
          accentClassName="bg-[#ffc20a]"
        />
        <ImportUploadCard
          title="Subir Excel de forma de pedido"
          description="Se leeran forma de pago en A, importe en I y numero de operaciones en O."
          sourceKey="ax_forma_pedido"
          accentClassName="bg-[#008938]"
        />
      </div>
      <ImportHistoryCard imports={imports} />
    </div>
  );
}

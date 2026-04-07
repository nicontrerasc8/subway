"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { ImportAudit } from "@/modules/imports/services/import-audit";
import type { AccountingImportRow } from "@/modules/imports/services/accounting-import-service";

const DETAIL_PAGE_SIZE = 12;

function normalizeNumberInput(value: string) {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

type EditableAccountingRowState = {
  linea: string;
  anio_anterior_real: string;
  anio_actual_ppto: string;
  anio_actual_real: string;
  mb: string;
  negocio: string;
  periodo_desde: string;
  periodo_hasta: string;
  periodo: string;
};

function buildEditableRow(row: AccountingImportRow): EditableAccountingRowState {
  return {
    linea: row.payload.linea ?? "",
    anio_anterior_real: row.payload.anio_anterior_real?.toString() ?? "",
    anio_actual_ppto: row.payload.anio_actual_ppto?.toString() ?? "",
    anio_actual_real: row.payload.anio_actual_real?.toString() ?? "",
    mb: row.payload.mb?.toString() ?? "",
    negocio: row.payload.negocio ?? "",
    periodo_desde: row.payload.periodo_desde ?? "",
    periodo_hasta: row.payload.periodo_hasta ?? "",
    periodo: row.payload.periodo ?? "",
  };
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function AccountingImportDetailView({
  importRecord,
  rows,
  audit,
}: {
  importRecord: ImportRecord;
  rows: AccountingImportRow[];
  audit: ImportAudit;
}) {
  const router = useRouter();
  const [isSavingImport, startSavingImport] = useTransition();
  const [isDeletingImport, startDeletingImport] = useTransition();
  const [savingRowId, setSavingRowId] = useState<number | null>(null);
  const [deletingRowId, setDeletingRowId] = useState<number | null>(null);
  const [detailPage, setDetailPage] = useState(1);
  const [importYear, setImportYear] = useState(String(importRecord.anio));
  const [editableRows, setEditableRows] = useState<Record<number, EditableAccountingRowState>>(
    () => Object.fromEntries(rows.map((row) => [row.id, buildEditableRow(row)])),
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(rows.length / DETAIL_PAGE_SIZE)),
    [rows.length],
  );

  const paginatedRows = useMemo(() => {
    const start = (detailPage - 1) * DETAIL_PAGE_SIZE;
    return rows.slice(start, start + DETAIL_PAGE_SIZE);
  }, [detailPage, rows]);

  const rangeStart = rows.length ? (detailPage - 1) * DETAIL_PAGE_SIZE + 1 : 0;
  const rangeEnd = rows.length ? Math.min(detailPage * DETAIL_PAGE_SIZE, rows.length) : 0;

  function patchEditableRow(rowId: number, patch: Partial<EditableAccountingRowState>) {
    setEditableRows((current) => ({
      ...current,
      [rowId]: {
        ...current[rowId],
        ...patch,
      },
    }));
  }

  function handleSaveImport() {
    startSavingImport(async () => {
      try {
        const response = await fetch(`/api/accounting-imports/${importRecord.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            anio: Number(importYear),
          }),
        });

        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "No se pudo actualizar el año.");
        }

        router.refresh();
        toast.success("Año de la importación contable actualizado.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
      }
    });
  }

  function handleDeleteImport() {
    const confirmed = window.confirm(
      "Se eliminará la importación contable completa. Esta acción no se puede deshacer.",
    );

    if (!confirmed) return;

    startDeletingImport(async () => {
      try {
        const response = await fetch(`/api/accounting-imports/${importRecord.id}`, {
          method: "DELETE",
        });

        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "No se pudo eliminar la importación contable.");
        }

        toast.success("Importación contable eliminada.");
        router.push("/dashboard/imports");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudo eliminar la importación contable.",
        );
      }
    });
  }

  async function handleSaveRow(rowId: number) {
    const current = editableRows[rowId];

    try {
      setSavingRowId(rowId);

      const response = await fetch(`/api/accounting-imports/${importRecord.id}/rows/${rowId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          linea: current.linea || null,
          anio_anterior_real: normalizeNumberInput(current.anio_anterior_real),
          anio_actual_ppto: normalizeNumberInput(current.anio_actual_ppto),
          anio_actual_real: normalizeNumberInput(current.anio_actual_real),
          mb: normalizeNumberInput(current.mb),
          negocio: current.negocio || null,
          periodo_desde: current.periodo_desde || null,
          periodo_hasta: current.periodo_hasta || null,
          periodo: current.periodo || null,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo actualizar la fila contable.");
      }

      router.refresh();
      toast.success(`Fila ${rowId} actualizada.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la fila.");
    } finally {
      setSavingRowId(null);
    }
  }

  async function handleDeleteRow(rowId: number) {
    const confirmed = window.confirm(
      `Se eliminará la fila ${rowId} de esta importación contable. Esta acción no se puede deshacer.`,
    );

    if (!confirmed) return;

    try {
      setDeletingRowId(rowId);

      const response = await fetch(`/api/accounting-imports/${importRecord.id}/rows/${rowId}`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo eliminar la fila contable.");
      }

      toast.success(`Fila ${rowId} eliminada.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar la fila.");
    } finally {
      setDeletingRowId(null);
    }
  }

  const nullFieldEntries = Object.entries(audit.nullFieldCounts);
  const invalidRows = audit.rows.filter((row) => row.hasInvalidData);

  return (
    <div className="space-y-6">
      <Card className="border-none bg-[linear-gradient(135deg,#12324f_0%,#1a5672_48%,#2d7f73_100%)] text-white shadow-lg">
        <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-white/70">
              Edición contable
            </p>
            <h2 className="text-3xl font-semibold tracking-tight">
              Filas editables del JSON
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-white/80">
              La edición ahora está preparada para lotes grandes: se muestra por páginas y cada
              fila se puede guardar o borrar de forma independiente.
            </p>
          </div>
          <div className="w-full max-w-xl rounded-[28px] border border-white/15 bg-white/10 p-4 backdrop-blur">
            <div className="flex flex-col gap-4">
            <Field label="Año del lote">
              <Input
                className="h-11 w-full  shadow-sm sm:w-36"
                type="number"
                min={2020}
                max={2100}
                value={importYear}
                onChange={(event) => setImportYear(event.target.value)}
              />
            </Field>
              <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="h-11 flex-1 rounded-2xl bg-white text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-white/92 hover:shadow-[0_14px_30px_rgba(15,23,42,0.24)]"
              onClick={handleSaveImport}
              disabled={isSavingImport}
            >
              {isSavingImport ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Guardar lote
            </Button>
            <Button
              variant="destructive"
              className="h-11 rounded-2xl border border-white/10 bg-rose-500/90 px-5 text-white shadow-sm transition hover:bg-rose-500 sm:min-w-36"
              onClick={handleDeleteImport}
              disabled={isDeletingImport}
            >
              {isDeletingImport ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Borrar lote
            </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div>
            <h3 className="text-lg font-semibold">Log de importacion</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Resumen persistido en base de datos para esta carga contable.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Filas totales</p>
              <p className="mt-2 text-2xl font-semibold">{audit.totalRows}</p>
            </div>
            <div className="rounded-2xl border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Filas con nulos</p>
              <p className="mt-2 text-2xl font-semibold">{audit.rowsWithNullValues}</p>
            </div>
            <div className="rounded-2xl border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Filas invalidas</p>
              <p className="mt-2 text-2xl font-semibold">{audit.rowsWithInvalidData}</p>
            </div>
            <div className="rounded-2xl border bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Valores nulos</p>
              <p className="mt-2 text-2xl font-semibold">{audit.totalNullValues}</p>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border p-4">
              <h4 className="text-sm font-semibold">Nulos por campo</h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {nullFieldEntries.length ? (
                  nullFieldEntries.map(([field, count]) => (
                    <span key={field} className="rounded-full border bg-muted/40 px-3 py-1 text-xs">
                      {field}: {count}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No se detectaron campos nulos.</p>
                )}
              </div>
            </div>
            <div className="rounded-2xl border p-4">
              <h4 className="text-sm font-semibold">Filas con data invalida</h4>
              <div className="mt-3 space-y-2">
                {invalidRows.length ? (
                  invalidRows.map((row) => (
                    <div key={row.rowNumber} className="rounded-xl border bg-muted/30 px-3 py-2 text-sm">
                      Fila {row.rowNumber}: {row.parseErrors.join(" | ")}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No se detectaron filas invalidas.</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Detalle de filas contables</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Se muestran {DETAIL_PAGE_SIZE} filas por página para evitar una vista demasiado
                pesada cuando la importación trae muchos registros.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <span>
                Mostrando {rangeStart}-{rangeEnd} de {rows.length}
              </span>
              <span className="hidden sm:inline">|</span>
              <span>{totalPages} páginas</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table className="min-w-[1500px]">
              <TableElement>
                <TableHead>
                  <tr>
                    <TableHeaderCell>Fila</TableHeaderCell>
                    <TableHeaderCell>Estado</TableHeaderCell>
                    <TableHeaderCell>Línea</TableHeaderCell>
                    <TableHeaderCell>Año anterior real</TableHeaderCell>
                    <TableHeaderCell>Año actual ppto</TableHeaderCell>
                    <TableHeaderCell>Año actual real</TableHeaderCell>
                    <TableHeaderCell>MB</TableHeaderCell>
                    <TableHeaderCell>Negocio</TableHeaderCell>
                    <TableHeaderCell>Periodo desde</TableHeaderCell>
                    <TableHeaderCell>Periodo hasta</TableHeaderCell>
                    <TableHeaderCell>Periodo</TableHeaderCell>
                    <TableHeaderCell className="text-right">Acciones</TableHeaderCell>
                  </tr>
                </TableHead>
                <TableBody>
                  {paginatedRows.map((row) => {
                    const editable = editableRows[row.id];
                    const isSavingRow = savingRowId === row.id;
                    const isDeletingRow = deletingRowId === row.id;

                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium whitespace-nowrap">{row.id}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="space-y-1">
                            <span className="inline-flex rounded-full border border-border bg-muted/60 px-2 py-1 text-xs font-medium">
                              {row.parse_status}
                            </span>
                            {row.parse_errors.length ? (
                              <p className="max-w-52 text-xs text-amber-700">
                                {row.parse_errors.join(" | ")}
                              </p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editable.linea}
                            onChange={(event) =>
                              patchEditableRow(row.id, { linea: event.target.value })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editable.anio_anterior_real}
                            onChange={(event) =>
                              patchEditableRow(row.id, {
                                anio_anterior_real: event.target.value,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editable.anio_actual_ppto}
                            onChange={(event) =>
                              patchEditableRow(row.id, {
                                anio_actual_ppto: event.target.value,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editable.anio_actual_real}
                            onChange={(event) =>
                              patchEditableRow(row.id, {
                                anio_actual_real: event.target.value,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editable.mb}
                            onChange={(event) =>
                              patchEditableRow(row.id, { mb: event.target.value })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editable.negocio}
                            onChange={(event) =>
                              patchEditableRow(row.id, { negocio: event.target.value })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editable.periodo_desde}
                            onChange={(event) =>
                              patchEditableRow(row.id, {
                                periodo_desde: event.target.value,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editable.periodo_hasta}
                            onChange={(event) =>
                              patchEditableRow(row.id, {
                                periodo_hasta: event.target.value,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editable.periodo}
                            onChange={(event) =>
                              patchEditableRow(row.id, { periodo: event.target.value })
                            }
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              className="bg-slate-900 text-white hover:bg-slate-800"
                              onClick={() => handleSaveRow(row.id)}
                              disabled={isSavingRow}
                            >
                              {isSavingRow ? (
                                <LoaderCircle className="size-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="size-4" />
                              )}
                              Guardar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteRow(row.id)}
                              disabled={isDeletingRow}
                            >
                              {isDeletingRow ? (
                                <LoaderCircle className="size-4 animate-spin" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                              Borrar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </TableElement>
            </Table>
          </div>

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Navega por bloques de {DETAIL_PAGE_SIZE} filas para editar importaciones grandes con
              menos carga visual.
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setDetailPage((current) => Math.max(1, current - 1))}
                disabled={detailPage === 1}
              >
                <ChevronLeft className="size-4" />
                Anterior
              </Button>
              <div className="min-w-28 text-center text-sm text-muted-foreground">
                Página {detailPage} de {totalPages}
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setDetailPage((current) => Math.min(totalPages, current + 1))}
                disabled={detailPage === totalPages}
              >
                Siguiente
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

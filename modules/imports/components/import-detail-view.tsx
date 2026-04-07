"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ImportFactRow, ImportRecord } from "@/lib/types/database";
import { formatCurrency } from "@/lib/utils";
import type { ImportAudit } from "@/modules/imports/services/import-audit";

function toInputDate(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function normalizeNumberInput(value: string) {
  if (!value.trim()) return null;
  const normalized = value.replace(/\s/g, "").replace(/,/g, "").replace(/%/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function normalizeIntegerInput(value: string) {
  const number = normalizeNumberInput(value);
  return number === null ? null : Math.trunc(number);
}

function calculateForecastPreview(proyeccion: string, probabilidad: string) {
  const projection = normalizeNumberInput(proyeccion);
  const probability = normalizeNumberInput(probabilidad);

  if (projection === null || probability === null) return null;
  const normalizedProbability = probability > 1 ? probability / 100 : probability;
  return projection * normalizedProbability;
}

type EditableRowState = {
  anio: string;
  mes: string;
  trimestre: string;
  semana: string;
  fecha_registro: string;
  fecha_adjudicacion: string;
  fecha_facturacion: string;
  situacion: string;
  orden_venta: string;
  factura: string;
  oc: string;
  cliente_nombre: string;
  cliente_ruc: string;
  sector_ax_nombre: string;
  sector_nombre: string;
  negocio_nombre: string;
  linea_nombre: string;
  sublinea_nombre: string;
  grupo_nombre: string;
  ejecutivo_nombre: string;
  proyecto: string;
  codigo_articulo: string;
  articulo: string;
  um: string;
  etapa: string;
  motivo_perdida: string;
  tipo_pipeline: string;
  licitacion_flag: boolean;
  cantidad: string;
  ventas_monto: string;
  proyeccion_monto: string;
  costo_monto: string;
  margen_monto: string;
  porcentaje_num: string;
  probabilidad_num: string;
  observaciones: string;
};

function buildEditableRow(row: ImportFactRow): EditableRowState {
  return {
    anio: row.anio?.toString() ?? "",
    mes: row.mes?.toString() ?? "",
    trimestre: row.trimestre?.toString() ?? "",
    semana: row.semana?.toString() ?? "",
    fecha_registro: toInputDate(row.fecha_registro),
    fecha_adjudicacion: toInputDate(row.fecha_adjudicacion),
    fecha_facturacion: toInputDate(row.fecha_facturacion),
    situacion: row.situacion ?? "",
    orden_venta: row.orden_venta ?? "",
    factura: row.factura ?? "",
    oc: row.oc ?? "",
    cliente_nombre: row.cliente_nombre ?? "",
    cliente_ruc: row.cliente_ruc ?? "",
    sector_ax_nombre: row.sector_ax_nombre ?? "",
    sector_nombre: row.sector_nombre ?? "",
    negocio_nombre: row.negocio_nombre ?? "",
    linea_nombre: row.linea_nombre ?? "",
    sublinea_nombre: row.sublinea_nombre ?? "",
    grupo_nombre: row.grupo_nombre ?? "",
    ejecutivo_nombre: row.ejecutivo_nombre ?? "",
    proyecto: row.proyecto ?? "",
    codigo_articulo: row.codigo_articulo ?? "",
    articulo: row.articulo ?? "",
    um: row.um ?? "",
    etapa: row.etapa ?? "",
    motivo_perdida: row.motivo_perdida ?? "",
    tipo_pipeline: row.tipo_pipeline ?? "",
    licitacion_flag: row.licitacion_flag,
    cantidad: row.cantidad?.toString() ?? "",
    ventas_monto: row.ventas_monto?.toString() ?? "",
    proyeccion_monto: row.proyeccion_monto?.toString() ?? "",
    costo_monto: row.costo_monto?.toString() ?? "",
    margen_monto: row.margen_monto?.toString() ?? "",
    porcentaje_num: row.porcentaje_num?.toString() ?? "",
    probabilidad_num:
      row.probabilidad_num === null || row.probabilidad_num === undefined
        ? ""
        : String(Math.round(row.probabilidad_num * 100)),
    observaciones: row.observaciones ?? "",
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

export function ImportDetailView({
  importRecord,
  rows,
  audit,
}: {
  importRecord: ImportRecord;
  rows: ImportFactRow[];
  audit: ImportAudit;
}) {
  const router = useRouter();
  const [isSavingImport, startSavingImport] = useTransition();
  const [isDeletingImport, startDeletingImport] = useTransition();
  const [savingRowId, setSavingRowId] = useState<number | null>(null);
  const [deletingRowId, setDeletingRowId] = useState<number | null>(null);
  const [importYear, setImportYear] = useState(
    importRecord.anio === null ? "" : String(importRecord.anio),
  );
  const [editableRows, setEditableRows] = useState<Record<number, EditableRowState>>(
    () => Object.fromEntries(rows.map((row) => [row.id, buildEditableRow(row)])),
  );

  function patchEditableRow(rowId: number, patch: Partial<EditableRowState>) {
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
        const response = await fetch(`/api/imports/${importRecord.id}`, {
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
        toast.success("Año de la importación actualizado.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
      }
    });
  }

  function handleDeleteImport() {
    const confirmed = window.confirm(
      "Se eliminará la importación completa y todas sus filas normalizadas. Esta acción no se puede deshacer.",
    );

    if (!confirmed) return;

    startDeletingImport(async () => {
      try {
        const response = await fetch(`/api/imports/${importRecord.id}`, {
          method: "DELETE",
        });

        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "No se pudo eliminar la importación.");
        }

        toast.success("Importación eliminada.");
        router.push("/dashboard/imports");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "No se pudo eliminar la importación.",
        );
      }
    });
  }

  async function handleSaveRow(rowId: number) {
    const current = editableRows[rowId];

    try {
      setSavingRowId(rowId);

      const response = await fetch(`/api/imports/${importRecord.id}/rows/${rowId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          anio: normalizeIntegerInput(current.anio),
          mes: normalizeIntegerInput(current.mes),
          trimestre: normalizeIntegerInput(current.trimestre),
          semana: normalizeIntegerInput(current.semana),
          fecha_registro: current.fecha_registro || null,
          fecha_adjudicacion: current.fecha_adjudicacion || null,
          fecha_facturacion: current.fecha_facturacion || null,
          situacion: current.situacion || null,
          orden_venta: current.orden_venta || null,
          factura: current.factura || null,
          oc: current.oc || null,
          cliente_nombre: current.cliente_nombre || null,
          cliente_ruc: current.cliente_ruc || null,
          sector_ax_nombre: current.sector_ax_nombre || null,
          sector_nombre: current.sector_nombre || null,
          negocio_nombre: current.negocio_nombre || null,
          linea_nombre: current.linea_nombre || null,
          sublinea_nombre: current.sublinea_nombre || null,
          grupo_nombre: current.grupo_nombre || null,
          ejecutivo_nombre: current.ejecutivo_nombre || null,
          proyecto: current.proyecto || null,
          codigo_articulo: current.codigo_articulo || null,
          articulo: current.articulo || null,
          um: current.um || null,
          etapa: current.etapa || null,
          motivo_perdida: current.motivo_perdida || null,
          tipo_pipeline: current.tipo_pipeline || null,
          licitacion_flag: current.licitacion_flag,
          cantidad: normalizeNumberInput(current.cantidad),
          ventas_monto: normalizeNumberInput(current.ventas_monto),
          proyeccion_monto: normalizeNumberInput(current.proyeccion_monto),
          costo_monto: normalizeNumberInput(current.costo_monto),
          margen_monto: normalizeNumberInput(current.margen_monto),
          porcentaje_num: normalizeNumberInput(current.porcentaje_num),
          probabilidad_num: normalizeNumberInput(current.probabilidad_num),
          observaciones: current.observaciones || null,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo actualizar la fila.");
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
      `Se eliminará la fila ${rowId} de esta importación. Esta acción no se puede deshacer.`,
    );

    if (!confirmed) return;

    try {
      setDeletingRowId(rowId);

      const response = await fetch(`/api/imports/${importRecord.id}/rows/${rowId}`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo eliminar la fila.");
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
      <Card className="border-none bg-[linear-gradient(135deg,#08263d_0%,#0f3d5e_48%,#3f7ca7_100%)] text-white shadow-lg">
        <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-white/70">
              Edición masiva
            </p>
            <h2 className="text-3xl font-semibold tracking-tight">
              Filas normalizadas editables
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-white/80">
              Edita todos los campos normalizados de esta carga y guarda cada fila cuando esté lista.
            </p>
          </div>
          <div className="w-full max-w-xl rounded-[28px] border border-white/15 bg-white/10 p-4 backdrop-blur">
            <div className="flex flex-col gap-4">
            <Field label="Año del lote">
              <Input
                className="h-11 w-full border-white/10 bg-white/92 text-slate-900 shadow-sm sm:w-36"
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
              className="h-11 rounded-2xl border border-white/10 bg-rose-500/90 px-5 text-white shadow-sm transition hover:bg-rose-500 sm:min-w-32"
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
              Resumen persistido en base de datos para esta carga.
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

      <div className="grid gap-5">
        {rows.map((row) => {
          const editable = editableRows[row.id];
          const isSavingRow = savingRowId === row.id;
          const forecastPreview = calculateForecastPreview(
            editable.proyeccion_monto,
            editable.probabilidad_num,
          );

          return (
            <Card key={row.id} className="overflow-hidden">
              <CardContent className="space-y-5 p-5">
                <div className="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      Fila {row.id}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold">
                      {editable.cliente_nombre || "Sin cliente"}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="rounded-2xl border bg-muted/30 px-4 py-3 text-sm">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Forecast
                      </p>
                      <p className="mt-1 font-semibold">
                        {formatCurrency(forecastPreview ?? row.forecast_ponderado ?? 0)}
                      </p>
                    </div>
                    <Button onClick={() => handleSaveRow(row.id)} disabled={isSavingRow}>
                      {isSavingRow ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                      Guardar fila
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDeleteRow(row.id)}
                      disabled={deletingRowId === row.id}
                    >
                      {deletingRowId === row.id ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                      Borrar fila
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Año">
                    <Input value={editable.anio} onChange={(e) => patchEditableRow(row.id, { anio: e.target.value })} />
                  </Field>
                  <Field label="Mes">
                    <Input value={editable.mes} onChange={(e) => patchEditableRow(row.id, { mes: e.target.value })} />
                  </Field>
                  <Field label="Trimestre">
                    <Input value={editable.trimestre} onChange={(e) => patchEditableRow(row.id, { trimestre: e.target.value })} />
                  </Field>
                  <Field label="Semana">
                    <Input value={editable.semana} onChange={(e) => patchEditableRow(row.id, { semana: e.target.value })} />
                  </Field>

                  <Field label="Fecha de registro">
                    <Input type="date" value={editable.fecha_registro} onChange={(e) => patchEditableRow(row.id, { fecha_registro: e.target.value })} />
                  </Field>
                  <Field label="Fecha de adjudicación">
                    <Input type="date" value={editable.fecha_adjudicacion} onChange={(e) => patchEditableRow(row.id, { fecha_adjudicacion: e.target.value })} />
                  </Field>
                  <Field label="Fecha de facturación">
                    <Input type="date" value={editable.fecha_facturacion} onChange={(e) => patchEditableRow(row.id, { fecha_facturacion: e.target.value })} />
                  </Field>
                  <Field label="Situación">
                    <Input value={editable.situacion} onChange={(e) => patchEditableRow(row.id, { situacion: e.target.value })} />
                  </Field>

                  <Field label="Orden de venta">
                    <Input value={editable.orden_venta} onChange={(e) => patchEditableRow(row.id, { orden_venta: e.target.value })} />
                  </Field>
                  <Field label="Factura">
                    <Input value={editable.factura} onChange={(e) => patchEditableRow(row.id, { factura: e.target.value })} />
                  </Field>
                  <Field label="OC">
                    <Input value={editable.oc} onChange={(e) => patchEditableRow(row.id, { oc: e.target.value })} />
                  </Field>
                  <Field label="Etapa">
                    <Input value={editable.etapa} onChange={(e) => patchEditableRow(row.id, { etapa: e.target.value })} />
                  </Field>

                  <Field label="Cliente">
                    <Input value={editable.cliente_nombre} onChange={(e) => patchEditableRow(row.id, { cliente_nombre: e.target.value })} />
                  </Field>
                  <Field label="RUC">
                    <Input value={editable.cliente_ruc} onChange={(e) => patchEditableRow(row.id, { cliente_ruc: e.target.value })} />
                  </Field>
                  <Field label="Sector">
                    <Input value={editable.sector_nombre} onChange={(e) => patchEditableRow(row.id, { sector_nombre: e.target.value })} />
                  </Field>
                  <Field label="Sector AX">
                    <Input value={editable.sector_ax_nombre} onChange={(e) => patchEditableRow(row.id, { sector_ax_nombre: e.target.value })} />
                  </Field>
                  <Field label="Negocio">
                    <Input value={editable.negocio_nombre} onChange={(e) => patchEditableRow(row.id, { negocio_nombre: e.target.value })} />
                  </Field>

                  <Field label="Línea">
                    <Input value={editable.linea_nombre} onChange={(e) => patchEditableRow(row.id, { linea_nombre: e.target.value })} />
                  </Field>
                  <Field label="SubLÃ­nea">
                    <Input value={editable.sublinea_nombre} onChange={(e) => patchEditableRow(row.id, { sublinea_nombre: e.target.value })} />
                  </Field>
                  <Field label="Grupo">
                    <Input value={editable.grupo_nombre} onChange={(e) => patchEditableRow(row.id, { grupo_nombre: e.target.value })} />
                  </Field>
                  <Field label="Ejecutivo">
                    <Input value={editable.ejecutivo_nombre} onChange={(e) => patchEditableRow(row.id, { ejecutivo_nombre: e.target.value })} />
                  </Field>
                  <Field label="Proyecto">
                    <Input value={editable.proyecto} onChange={(e) => patchEditableRow(row.id, { proyecto: e.target.value })} />
                  </Field>
                  <Field label="Código">
                    <Input value={editable.codigo_articulo} onChange={(e) => patchEditableRow(row.id, { codigo_articulo: e.target.value })} />
                  </Field>

                  <Field label="Artículo">
                    <Input value={editable.articulo} onChange={(e) => patchEditableRow(row.id, { articulo: e.target.value })} />
                  </Field>
                  <Field label="UM">
                    <Input value={editable.um} onChange={(e) => patchEditableRow(row.id, { um: e.target.value })} />
                  </Field>
                  <Field label="Cantidad">
                    <Input value={editable.cantidad} onChange={(e) => patchEditableRow(row.id, { cantidad: e.target.value })} />
                  </Field>
                  <Field label="Motivo pérdida">
                    <Input value={editable.motivo_perdida} onChange={(e) => patchEditableRow(row.id, { motivo_perdida: e.target.value })} />
                  </Field>

                  <Field label="BL / Proy">
                    <Input value={editable.tipo_pipeline} onChange={(e) => patchEditableRow(row.id, { tipo_pipeline: e.target.value })} />
                  </Field>
                  <Field label="Ventas S/">
                    <Input value={editable.ventas_monto} onChange={(e) => patchEditableRow(row.id, { ventas_monto: e.target.value })} />
                  </Field>
                  <Field label="Proyección">
                    <Input value={editable.proyeccion_monto} onChange={(e) => patchEditableRow(row.id, { proyeccion_monto: e.target.value })} />
                  </Field>
                  <Field label="Costo">
                    <Input value={editable.costo_monto} onChange={(e) => patchEditableRow(row.id, { costo_monto: e.target.value })} />
                  </Field>
                  <Field label="Margen">
                    <Input value={editable.margen_monto} onChange={(e) => patchEditableRow(row.id, { margen_monto: e.target.value })} />
                  </Field>
                  <Field label="Porcentaje">
                    <Input value={editable.porcentaje_num} onChange={(e) => patchEditableRow(row.id, { porcentaje_num: e.target.value })} />
                  </Field>
                  <Field label="Probabilidad %">
                    <Input value={editable.probabilidad_num} onChange={(e) => patchEditableRow(row.id, { probabilidad_num: e.target.value })} />
                  </Field>
                </div>

                <div className="grid gap-4 lg:grid-cols-[auto_1fr] lg:items-start">
                  <label className="flex items-center gap-3 rounded-2xl border bg-muted/25 px-4 py-3 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={editable.licitacion_flag}
                      onChange={(e) => patchEditableRow(row.id, { licitacion_flag: e.target.checked })}
                    />
                    Licitación
                  </label>
                  <Field label="Observaciones">
                    <textarea
                      className="min-h-28 w-full rounded-xl border border-border bg-input px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                      value={editable.observaciones}
                      onChange={(e) => patchEditableRow(row.id, { observaciones: e.target.value })}
                    />
                  </Field>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

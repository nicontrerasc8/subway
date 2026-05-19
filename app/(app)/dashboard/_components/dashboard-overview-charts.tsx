"use client";

import { useMemo, useState } from "react";
import { Pie, PieChart, Cell, Bar, BarChart, CartesianGrid, LabelList, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableElement,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import type { DashboardOverviewPoint } from "@/modules/dashboard/services/dashboard-overview";
import type { DashboardBranchesChartPoint } from "@/modules/dashboard/services/dashboard-branches";
import type { DashboardMixProductComparisonPoint } from "@/modules/dashboard/services/dashboard-mix";
import { formatCurrency, formatNumber } from "@/lib/utils";

const COLORS = ["#3b6ea8", "#7b61a8", "#2f8f83", "#c07a43", "#b85778", "#5f7f52", "#7a8ea6", "#9a6f4f"];
const LABEL_COLORS: Record<string, string> = {
  Peya: "#c8475d",
  Rappi: "#d66f3f",
  Turbo: "#7b61a8",
  Didi: "#c9872d",
  COMBO: "#7b61a8",
  "SUB 15 CM": "#3b6ea8",
  "SUB 30 CM": "#2f8f83",
  COMPLEMENTOS: "#c07a43",
  OTROS: "#7a8ea6",
};

function normalizeLegendLabel(label: unknown) {
  if (typeof label !== "string") return "";
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function getKnownLabelColor(label: unknown) {
  const normalized = normalizeLegendLabel(label);
  if (normalized.includes("PEYA") || normalized.includes("PEDIDOS")) return LABEL_COLORS.Peya;
  if (normalized.includes("RAPPI")) return LABEL_COLORS.Rappi;
  if (normalized.includes("TURBO")) return LABEL_COLORS.Turbo;
  if (normalized.includes("DIDI")) return LABEL_COLORS.Didi;
  if (normalized.includes("SUB") && normalized.includes("15")) return LABEL_COLORS["SUB 15 CM"];
  if (normalized.includes("SUB") && normalized.includes("30")) return LABEL_COLORS["SUB 30 CM"];
  if (normalized.includes("COMBO")) return LABEL_COLORS.COMBO;
  if (normalized.includes("COMPLEMENT")) return LABEL_COLORS.COMPLEMENTOS;
  if (normalized.includes("OTRO")) return LABEL_COLORS.OTROS;
  return undefined;
}

function getSeriesColor(label: unknown, index: number) {
  return getKnownLabelColor(label) ?? COLORS[index % COLORS.length];
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("es-PE", {
    compactDisplay: "short",
    maximumFractionDigits: 1,
    notation: "compact",
    style: "currency",
    currency: "PEN",
  }).format(value);
}

function formatPercentValue(value: number) {
  return `${value.toFixed(1)}%`;
}

function CurrencyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number | string; name?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border bg-background px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground">{label}</p>
      {payload.map((entry, index) => (
        <p key={`${entry.name ?? "value"}-${index}`} className="text-sm font-medium">
          {entry.name}: {formatCurrency(Number(entry.value ?? 0))}
        </p>
      ))}
    </div>
  );
}

function ValueTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: {
  active?: boolean;
  payload?: Array<{ value?: number | string; name?: string }>;
  label?: string;
  valueFormatter: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border bg-background px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground">{label}</p>
      {payload.map((entry, index) => (
        <p key={`${entry.name ?? "value"}-${index}`} className="text-sm font-medium">
          {entry.name}: {valueFormatter(Number(entry.value ?? 0))}
        </p>
      ))}
    </div>
  );
}

export function DashboardDailySalesChart({ data }: { data: DashboardOverviewPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 16, right: 16, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} minTickGap={24} />
        <YAxis tickFormatter={(value) => formatCurrency(Number(value))} width={88} tick={{ fontSize: 12 }} />
        <Tooltip content={<CurrencyTooltip />} />
        <Line type="monotone" dataKey="value" stroke={COLORS[0]} strokeWidth={3} dot={false} name="Ventas" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DashboardMonthlySalesChart({ data }: { data: DashboardOverviewPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 16, right: 16, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(value) => formatCurrency(Number(value))} width={88} tick={{ fontSize: 12 }} />
        <Tooltip content={<CurrencyTooltip />} />
        <Bar dataKey="value" fill={COLORS[1]} radius={[8, 8, 0, 0]} name="Ventas" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DashboardMixChart({
  data,
}: {
  data: DashboardOverviewPoint[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="label" innerRadius={54} outerRadius={82} paddingAngle={3}>
          {data.map((entry, index) => (
            <Cell key={entry.label} fill={getSeriesColor(entry.label, index)} />
          ))}
        </Pie>
        <Tooltip content={<CurrencyTooltip />} />
        <Legend
          align="center"
          iconType="circle"
          verticalAlign="bottom"
          wrapperStyle={{ fontSize: 12, lineHeight: "18px", paddingTop: 8 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function DashboardBranchesMultiLineChart({
  data,
  keys,
}: {
  data: DashboardBranchesChartPoint[];
  keys: string[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 16, right: 16, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} minTickGap={24} />
        <YAxis tickFormatter={(value) => formatCurrency(Number(value))} width={88} tick={{ fontSize: 12 }} />
        <Tooltip content={<CurrencyTooltip />} />
        <Legend align="right" iconType="circle" verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
        {keys.map((key, index) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={getSeriesColor(key, index)}
            strokeWidth={3}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
export function DashboardBranchesMultiBarChart({
  data,
  keys,
  valueFormat = "currency",
  showValueLabels = false,
  largeText = false,
  layout = "vertical",
  stacked = false,
  colorMode = "entry",
}: {
  data: DashboardBranchesChartPoint[];
  keys: string[];
  valueFormat?: "currency" | "number" | "percent";
  showValueLabels?: boolean;
  largeText?: boolean;
  layout?: "vertical" | "horizontal";
  stacked?: boolean;
  colorMode?: "entry" | "series";
}) {
  const valueFormatter = valueFormat === "percent" ? formatPercentValue : valueFormat === "number" ? formatNumber : formatCurrency;
  const labelFormatter = valueFormat === "percent" ? formatPercentValue : valueFormat === "number" ? formatNumber : formatCompactCurrency;
  
  // --- DISEÑO AGRESIVO DE TAMAÑOS PARA MÁXIMA COMODIDAD ---
  const isHorizontal = layout === "horizontal";
  const axisFontSize = largeText ? 20 : 14; // Más grande y legible
  
  // Clases de Tailwind más modernas y espaciadas para las etiquetas internas
  const labelFontClass = stacked
    ? "fill-white text-[14px] font-bold"
    : largeText
      ? "fill-foreground text-[18px] font-bold tracking-tight"
      : "fill-muted-foreground text-[13px] font-semibold";

  const legendStyle = largeText
    ? { fontSize: 20, fontWeight: 500, paddingBottom: "24px" }
    : { fontSize: 14, fontWeight: 500, paddingBottom: "12px" };

  // Dinamismo en la altura para que respire si hay muchos datos
  const chartHeight = isHorizontal 
    ? Math.max(stacked ? 620 : 550, data.length * (largeText ? 96 : stacked ? 86 : 80)) 
    : (largeText ? 450 : 360);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={data}
        layout={isHorizontal ? "vertical" : "horizontal"}
        // Espaciados generosos para evitar el efecto de "amontonamiento"
        barCategoryGap={isHorizontal ? "24%" : "16%"}
        barGap={isHorizontal ? 6 : 4}
        barSize={isHorizontal ? (largeText ? 24 : 18) : (largeText ? 32 : 24)}
        margin={{
          top: isHorizontal ? 20 : (showValueLabels ? 48 : 24),
          right: showValueLabels && isHorizontal ? (largeText ? 110 : stacked ? 36 : 88) : 24,
          left: isHorizontal ? (largeText ? 160 : stacked ? 138 : 110) : 12,
          bottom: isHorizontal ? 12 : (largeText ? 32 : 20),
        }}
      >
        {/* Guías de fondo más sutiles (opacidad baja para no ensuciar) */}
        <CartesianGrid strokeDasharray="4 4" vertical={false} opacity={0.4} />
        
        {isHorizontal ? (
          <>
            <XAxis 
              type="number" 
              tickFormatter={(value) => valueFormatter(Number(value))} 
              tick={{ fontSize: axisFontSize, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              type="category" 
              dataKey="label" 
              width={largeText ? 150 : stacked ? 128 : 100} 
              tick={{ fontSize: stacked ? 15 : axisFontSize, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
          </>
        ) : (
          <>
            <XAxis 
              dataKey="label" 
              tick={{ fontSize: axisFontSize, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              dy={10} // Baja un poco el texto para que no pegue con el eje
            />
            <YAxis 
              tickFormatter={(value) => valueFormatter(Number(value))} 
              width={largeText ? 130 : 90} 
              tick={{ fontSize: axisFontSize, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
          </>
        )}
        
        <Tooltip 
          content={<ValueTooltip valueFormatter={valueFormatter} />}
          cursor={{ fill: 'rgba(0, 0, 0, 0.03)' }} // Efecto hover sutil detrás de las barras
        />
        
        <Legend 
          align="right" 
          iconType="circle" 
          iconSize={largeText ? 12 : 8}
          verticalAlign="top" 
          height={largeText ? 56 : 36} 
          wrapperStyle={legendStyle} 
        />
        
        {keys.map((key, index) => {
          const radius: [number, number, number, number] = stacked
            ? isHorizontal
              ? index === 0
                ? [8, 0, 0, 8]
                : index === keys.length - 1
                  ? [0, 8, 8, 0]
                  : [0, 0, 0, 0]
              : index === keys.length - 1
                ? [8, 8, 0, 0]
                : [0, 0, 0, 0]
            : isHorizontal
              ? [0, 8, 8, 0]
              : [8, 8, 0, 0];

          return (
          <Bar
            key={key}
            dataKey={key}
            fill={getSeriesColor(key, index)}
            fillOpacity={!stacked && keys.length > 1 && index === 0 ? 0.65 : 1}
            radius={radius}
            stackId={stacked ? "total" : undefined}
          >
            {stacked || colorMode === "series" ? null : data.map((entry) => (
              <Cell
                key={`${key}-${entry.label}`}
                fill={getSeriesColor(entry.label, index)}
              />
            ))}
            {showValueLabels ? (
              <LabelList
                dataKey={key}
                // Ajuste de posición y separación (offset)
                position={stacked ? "center" : isHorizontal ? "right" : "top"}
                offset={largeText ? 12 : 8}
                formatter={(value: unknown) => {
                  const numericValue = Number(value ?? 0);
                  if (stacked && numericValue < 4) return "";
                  return labelFormatter(numericValue);
                }}
                className={labelFontClass}
              />
            ) : null}
          </Bar>
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );
}

function DashboardBranchesDataTable({
  data,
  keys,
  valueFormatter,
  labelHeader = "Fecha",
}: {
  data: DashboardBranchesChartPoint[];
  keys: string[];
  valueFormatter: (value: number) => string;
  labelHeader?: string;
}) {
  return (
    <Table className="max-h-[320px] overflow-auto rounded-2xl">
      <TableElement>
        <TableHead className="sticky top-0 z-10">
          <TableRow>
            <TableHeaderCell>{labelHeader}</TableHeaderCell>
            {keys.map((key) => (
              <TableHeaderCell key={key} className="text-right">
                {key}
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.length ? (
            data.map((item) => (
              <TableRow key={String(item.label)}>
                <TableCell className="font-medium">{item.label}</TableCell>
                {keys.map((key) => (
                  <TableCell key={`${item.label}-${key}`} className="text-right font-medium">
                    {valueFormatter(Number(item[key] ?? 0))}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={keys.length + 1} className="text-center text-muted-foreground">
                No hay datos visibles con estos filtros.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </TableElement>
    </Table>
  );
}

function DashboardBranchesMobileBars({
  data,
  keys,
  valueFormatter,
  stacked = false,
}: {
  data: DashboardBranchesChartPoint[];
  keys: string[];
  valueFormatter: (value: number) => string;
  stacked?: boolean;
}) {
  const maxValue = Math.max(
    1,
    ...data.flatMap((item) =>
      stacked
        ? [keys.reduce((sum, key) => sum + Number(item[key] ?? 0), 0)]
        : keys.map((key) => Number(item[key] ?? 0)),
    ),
  );

  if (!data.length) {
    return (
      <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        No hay datos visibles con estos filtros.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const stackedTotal = keys.reduce((sum, key) => sum + Number(item[key] ?? 0), 0);

        return (
          <div key={String(item.label)} className="rounded-2xl border bg-card p-3">
            <p className="mb-3 text-sm font-semibold text-foreground">{item.label}</p>

            {stacked ? (
              <>
                <div className="flex h-7 overflow-hidden rounded-full bg-muted">
                  {keys.map((key, index) => {
                    const value = Number(item[key] ?? 0);
                    const width = stackedTotal > 0 ? (value / stackedTotal) * 100 : 0;

                    return (
                      <div
                        key={`${item.label}-${key}`}
                        className="min-w-0"
                        style={{
                          width: `${width}%`,
                          backgroundColor: getSeriesColor(key, index),
                        }}
                      />
                    );
                  })}
                </div>
                <div className="mt-3 grid gap-2">
                  {keys.map((key, index) => {
                    const value = Number(item[key] ?? 0);

                    return (
                      <div key={`${item.label}-${key}-legend`} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: getSeriesColor(key, index) }}
                          />
                          <span className="truncate">{key}</span>
                        </span>
                        <span className="font-semibold tabular-nums">{valueFormatter(value)}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="space-y-3">
                {keys.map((key, index) => {
                  const value = Number(item[key] ?? 0);
                  const width = Math.max(2, (value / maxValue) * 100);

                  return (
                    <div key={`${item.label}-${key}`} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: getSeriesColor(key, index) }}
                          />
                          <span className="truncate">{key}</span>
                        </span>
                        <span className="font-semibold text-foreground tabular-nums">
                          {valueFormatter(value)}
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${width}%`,
                            backgroundColor: getSeriesColor(key, index),
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function DashboardBranchesMetricView({
  data,
  keys,
  chart,
  valueFormat = "currency",
  labelHeader = "Fecha",
  showValueLabels = false,
  largeText = false,
  barLayout = "vertical",
  stackedBars = false,
  barColorMode = "entry",
}: {
  data: DashboardBranchesChartPoint[];
  keys: string[];
  chart: "line" | "bar";
  valueFormat?: "currency" | "number" | "percent";
  labelHeader?: string;
  showValueLabels?: boolean;
  largeText?: boolean;
  barLayout?: "vertical" | "horizontal";
  stackedBars?: boolean;
  barColorMode?: "entry" | "series";
}) {
  const valueFormatter = valueFormat === "percent" ? formatPercentValue : valueFormat === "number" ? formatNumber : formatCurrency;

  return (
    <>
      <div className="space-y-4 lg:hidden">
        <DashboardBranchesDataTable data={data} keys={keys} valueFormatter={valueFormatter} labelHeader={labelHeader} />
        <DashboardBranchesMobileBars data={data} keys={keys} valueFormatter={valueFormatter} stacked={stackedBars} />
      </div>

      <Tabs defaultValue="chart" className="hidden w-full lg:block">
      <div className="mb-3 flex justify-end">
        <TabsList className="h-9 rounded-xl">
          <TabsTrigger value="chart" className="rounded-lg px-3 py-1 text-xs">
            Gráfico
          </TabsTrigger>
          <TabsTrigger value="table" className="rounded-lg px-3 py-1 text-xs">
            Tabla
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="chart" className="mt-0">
        {chart === "line" ? (
          <DashboardBranchesMultiLineChart data={data} keys={keys} />
        ) : (
          <DashboardBranchesMultiBarChart
            data={data}
            keys={keys}
            valueFormat={valueFormat}
            showValueLabels={showValueLabels}
            largeText={largeText}
            layout={barLayout}
            stacked={stackedBars}
            colorMode={barColorMode}
          />
        )}
      </TabsContent>
      <TabsContent value="table" className="mt-0">
        <DashboardBranchesDataTable data={data} keys={keys} valueFormatter={valueFormatter} labelHeader={labelHeader} />
      </TabsContent>
      </Tabs>
    </>
  );
}

export function DashboardSimpleBarChart({
  data,
  name = "Valor",
  valueFormat = "currency",
}: {
  data: DashboardOverviewPoint[];
  name?: string;
  valueFormat?: "currency" | "number" | "percent";
}) {
  const valueFormatter = valueFormat === "percent" ? formatPercentValue : valueFormat === "number" ? formatNumber : formatCurrency;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 16, right: 16, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} angle={-16} textAnchor="end" height={72} />
        <YAxis tickFormatter={(value) => valueFormatter(Number(value))} width={88} tick={{ fontSize: 12 }} />
        <Tooltip content={<ValueTooltip valueFormatter={valueFormatter} />} />
        <Bar dataKey="value" fill={COLORS[0]} radius={[6, 6, 0, 0]} name={name}>
          {data.map((entry, index) => (
            <Cell key={entry.label} fill={getSeriesColor(entry.label, index)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ProductComparisonChart({
  product,
  yearKeys,
  branchKeys,
}: {
  product: DashboardMixProductComparisonPoint;
  yearKeys: string[];
  branchKeys: string[];
}) {
  const chartData = branchKeys.length
    ? branchKeys.map((branch) => ({
        label: branch,
        ...yearKeys.reduce<Record<string, number>>((values, year) => {
          values[year] = product.byBranchYear[`${branch}__${year}`] ?? 0;
          return values;
        }, {}),
      }))
    : [
        yearKeys.reduce<{ label: string; [key: string]: string | number }>(
          (values, year) => {
            values[year] = product.byYear[year] ?? 0;
            return values;
          },
          { label: "Todas las sucursales" },
        ),
      ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 16, right: 16, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} />
        <YAxis tickFormatter={(value) => formatCurrency(Number(value))} width={88} tick={{ fontSize: 12 }} />
        <Tooltip content={<CurrencyTooltip />} />
        <Legend align="right" iconType="circle" verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
        {yearKeys.map((year, index) => (
          <Bar key={year} dataKey={year} fill={getSeriesColor(year, index)} radius={[6, 6, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function ProductComparisonPie({
  product,
  yearKeys,
  branchKeys,
}: {
  product: DashboardMixProductComparisonPoint;
  yearKeys: string[];
  branchKeys: string[];
}) {
  const data = branchKeys.length
    ? branchKeys
        .map((branch) => ({
          label: branch,
          value: yearKeys.reduce((sum, year) => sum + (product.byBranchYear[`${branch}__${year}`] ?? 0), 0),
        }))
        .filter((item) => item.value > 0)
    : yearKeys
        .map((year) => ({
          label: year,
          value: product.byYear[year] ?? 0,
        }))
    .filter((item) => item.value > 0);

  if (!data.length) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-2xl border text-sm text-muted-foreground">
        No hay distribución visible para este producto.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="label" innerRadius={58} outerRadius={92} paddingAngle={3}>
          {data.map((entry, index) => (
            <Cell key={entry.label} fill={getSeriesColor(entry.label, index)} />
          ))}
        </Pie>
        <Tooltip content={<CurrencyTooltip />} />
        <Legend
          align="center"
          iconType="circle"
          verticalAlign="bottom"
          wrapperStyle={{ fontSize: 12, lineHeight: "18px", paddingTop: 8 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function ProductComparisonTable({
  data,
  yearKeys,
  branchKeys,
}: {
  data: DashboardMixProductComparisonPoint[];
  yearKeys: string[];
  branchKeys: string[];
}) {
  const comparisonColumns = branchKeys.length
    ? branchKeys.flatMap((branch) =>
        yearKeys.map((year) => ({
          key: `${branch}__${year}`,
          label: `${branch} · ${year}`,
          getValue: (product: DashboardMixProductComparisonPoint) => product.byBranchYear[`${branch}__${year}`] ?? 0,
        })),
      )
    : yearKeys.map((year) => ({
        key: year,
        label: year,
        getValue: (product: DashboardMixProductComparisonPoint) => product.byYear[year] ?? 0,
      }));
  const colSpan = comparisonColumns.length + 4;

  return (
    <Table className="max-h-[420px] overflow-auto rounded-2xl">
      <TableElement>
        <TableHead className="sticky top-0 z-10">
          <TableRow>
            <TableHeaderCell>Producto</TableHeaderCell>
            <TableHeaderCell>Categoría</TableHeaderCell>
            <TableHeaderCell className="text-right">Ventas</TableHeaderCell>
            <TableHeaderCell className="text-right">Unidades</TableHeaderCell>
            {comparisonColumns.map((column) => (
              <TableHeaderCell key={column.key} className="text-right">
                {column.label}
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.length ? (
            data.map((product) => (
              <TableRow key={product.referencia}>
                <TableCell>
                  <p className="font-medium">{product.producto}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{product.referencia}</p>
                </TableCell>
                <TableCell>{product.categoria}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(product.ventas)}</TableCell>
                <TableCell className="text-right font-medium">{formatNumber(product.unidades)}</TableCell>
                {comparisonColumns.map((column) => (
                  <TableCell key={`${product.referencia}-${column.key}`} className="text-right">
                    {formatCurrency(column.getValue(product))}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center text-muted-foreground">
                No hay productos visibles con estos filtros.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </TableElement>
    </Table>
  );
}

export function DashboardProductComparisonView({
  data,
  yearKeys,
  branchKeys,
  description = "Todos los productos con el filtro activo de fecha y sucursal.",
  searchPlaceholder = "Buscar producto",
  emptyMessage = "No hay productos visibles con estos filtros.",
}: {
  data: DashboardMixProductComparisonPoint[];
  yearKeys: string[];
  branchKeys: string[];
  description?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
}) {
  const [query, setQuery] = useState("");
  const [selectedReference, setSelectedReference] = useState(data[0]?.referencia ?? "");
  const [selectedYears, setSelectedYears] = useState(yearKeys);
  const [selectedBranches, setSelectedBranches] = useState(branchKeys);
  const [activeView, setActiveView] = useState<"chart" | "table">("table");
  const selectedProduct = data.find((product) => product.referencia === selectedReference) ?? data[0];
  const activeYearKeys = selectedYears.filter((key) => yearKeys.includes(key));
  const activeBranchKeys = selectedBranches.filter((key) => branchKeys.includes(key));
  const productOptions = useMemo(() => {
    const normalizedQuery = normalizeLegendLabel(query);
    if (!normalizedQuery) return data;

    return data.filter((product) =>
      normalizeLegendLabel(`${product.producto} ${product.referencia} ${product.categoria}`).includes(normalizedQuery),
    );
  }, [data, query]);

  if (!selectedProduct) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const selectedProductChartData: DashboardBranchesChartPoint[] = activeBranchKeys.length
    ? activeBranchKeys.map((branch) => ({
        label: branch,
        ...activeYearKeys.reduce<Record<string, number>>((values, year) => {
          values[year] = selectedProduct.byBranchYear[`${branch}__${year}`] ?? 0;
          return values;
        }, {}),
      }))
    : [
        activeYearKeys.reduce<DashboardBranchesChartPoint>(
          (values, year) => {
            values[year] = selectedProduct.byYear[year] ?? 0;
            return values;
          },
          { label: "Todas las sucursales" },
        ),
      ];

  return (
    <Tabs value={activeView} onValueChange={(value) => setActiveView(value as "chart" | "table")} className="w-full">
      <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(220px,0.75fr)_minmax(260px,1fr)_auto] lg:items-end">
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
        <div className="grid gap-2 sm:grid-cols-[minmax(160px,0.7fr)_minmax(220px,1fr)]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 rounded-lg border border-border bg-input px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          />
          <select
            value={selectedProduct.referencia}
            onChange={(event) => setSelectedReference(event.target.value)}
            className="h-9 rounded-lg border border-border bg-input px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          >
            {productOptions.map((product) => (
              <option key={product.referencia} value={product.referencia}>
                {product.producto}
              </option>
            ))}
          </select>
        </div>
        <TabsList className="h-9 rounded-xl">
          <TabsTrigger value="chart" className="rounded-lg px-3 py-1 text-xs">
            Gráfico
          </TabsTrigger>
          <TabsTrigger value="table" className="rounded-lg px-3 py-1 text-xs">
            Tabla
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="mb-4 grid gap-3 xl:grid-cols-2">
        <div className="rounded-2xl border p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Años</p>
          <div className="flex flex-wrap gap-2">
            {yearKeys.map((year) => (
              <label key={year} className="inline-flex h-8 items-center gap-2 rounded-full border px-3 text-sm">
                <input
                  type="checkbox"
                  checked={activeYearKeys.includes(year)}
                  onChange={(event) =>
                    setSelectedYears((current) =>
                      event.target.checked ? [...current, year] : current.filter((item) => item !== year),
                    )
                  }
                />
                {year}
              </label>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Sucursales</p>
          <div className="flex max-h-24 flex-wrap gap-2 overflow-auto pr-1">
            {branchKeys.map((branch) => (
              <label key={branch} className="inline-flex h-8 items-center gap-2 rounded-full border px-3 text-sm">
                <input
                  type="checkbox"
                  checked={activeBranchKeys.includes(branch)}
                  onChange={(event) =>
                    setSelectedBranches((current) =>
                      event.target.checked ? [...current, branch] : current.filter((item) => item !== branch),
                    )
                  }
                />
                {branch}
              </label>
            ))}
          </div>
        </div>
      </div>

      <TabsContent value="chart" className="mt-0">
        <Tabs defaultValue="years" className="w-full">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{selectedProduct.producto}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedProduct.referencia} · {selectedProduct.categoria} · {formatCurrency(selectedProduct.ventas)}
              </p>
            </div>
            <TabsList className="hidden">
              <TabsTrigger value="years" className="rounded-lg px-3 py-1 text-xs">
                Años
              </TabsTrigger>
              <TabsTrigger value="branches" className="rounded-lg px-3 py-1 text-xs">
                Sucursales
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="years" className="mt-0">
            <div className="lg:hidden">
              <DashboardBranchesMobileBars
                data={selectedProductChartData}
                keys={activeYearKeys}
                valueFormatter={formatCurrency}
              />
            </div>
            <div className="hidden gap-4 lg:grid xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
              <ProductComparisonChart product={selectedProduct} yearKeys={activeYearKeys} branchKeys={activeBranchKeys} />
              <ProductComparisonPie product={selectedProduct} yearKeys={activeYearKeys} branchKeys={activeBranchKeys} />
            </div>
          </TabsContent>
          <TabsContent value="branches" className="mt-0">
            <div className="lg:hidden">
              <DashboardBranchesMobileBars
                data={selectedProductChartData}
                keys={activeYearKeys}
                valueFormatter={formatCurrency}
              />
            </div>
            <div className="hidden gap-4 lg:grid xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
              <ProductComparisonChart product={selectedProduct} yearKeys={activeYearKeys} branchKeys={activeBranchKeys} />
              <ProductComparisonPie product={selectedProduct} yearKeys={activeYearKeys} branchKeys={activeBranchKeys} />
            </div>
          </TabsContent>
        </Tabs>
      </TabsContent>

      <TabsContent value="table" className="mt-0">
        <Tabs defaultValue="years" className="w-full">
          <div className="mb-3 flex justify-end">
            <TabsList className="hidden">
              <TabsTrigger value="years" className="rounded-lg px-3 py-1 text-xs">
                Años
              </TabsTrigger>
              <TabsTrigger value="branches" className="rounded-lg px-3 py-1 text-xs">
                Sucursales
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="years" className="mt-0">
            <ProductComparisonTable data={[selectedProduct]} yearKeys={activeYearKeys} branchKeys={activeBranchKeys} />
          </TabsContent>
          <TabsContent value="branches" className="mt-0">
            <ProductComparisonTable data={[selectedProduct]} yearKeys={activeYearKeys} branchKeys={activeBranchKeys} />
          </TabsContent>
        </Tabs>
      </TabsContent>
    </Tabs>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Pie, PieChart, Cell, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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
}: {
  data: DashboardBranchesChartPoint[];
  keys: string[];
  valueFormat?: "currency" | "number";
}) {
  const valueFormatter = valueFormat === "number" ? formatNumber : formatCurrency;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 16, right: 16, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(value) => valueFormatter(Number(value))} width={88} tick={{ fontSize: 12 }} />
        <Tooltip content={<ValueTooltip valueFormatter={valueFormatter} />} />
        <Legend align="right" iconType="circle" verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
        {keys.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            fill={getSeriesColor(key, index)}
            fillOpacity={keys.length > 1 && index === 0 ? 0.62 : 1}
            radius={[6, 6, 0, 0]}
          >
            {data.map((entry) => (
              <Cell
                key={`${key}-${entry.label}`}
                fill={getSeriesColor(entry.label, index)}
              />
            ))}
          </Bar>
        ))}
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

export function DashboardBranchesMetricView({
  data,
  keys,
  chart,
  valueFormat = "currency",
  labelHeader = "Fecha",
}: {
  data: DashboardBranchesChartPoint[];
  keys: string[];
  chart: "line" | "bar";
  valueFormat?: "currency" | "number";
  labelHeader?: string;
}) {
  const valueFormatter = valueFormat === "number" ? formatNumber : formatCurrency;

  return (
    <Tabs defaultValue="chart" className="w-full">
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
          <DashboardBranchesMultiBarChart data={data} keys={keys} valueFormat={valueFormat} />
        )}
      </TabsContent>
      <TabsContent value="table" className="mt-0">
        <DashboardBranchesDataTable data={data} keys={keys} valueFormatter={valueFormatter} labelHeader={labelHeader} />
      </TabsContent>
    </Tabs>
  );
}

export function DashboardSimpleBarChart({
  data,
  name = "Valor",
  valueFormat = "currency",
}: {
  data: DashboardOverviewPoint[];
  name?: string;
  valueFormat?: "currency" | "number";
}) {
  const valueFormatter = valueFormat === "number" ? formatNumber : formatCurrency;

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
}: {
  data: DashboardMixProductComparisonPoint[];
  yearKeys: string[];
  branchKeys: string[];
}) {
  const [query, setQuery] = useState("");
  const [selectedReference, setSelectedReference] = useState(data[0]?.referencia ?? "");
  const [selectedYears, setSelectedYears] = useState(yearKeys);
  const [selectedBranches, setSelectedBranches] = useState(branchKeys);
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
    return <p className="text-sm text-muted-foreground">No hay productos visibles con estos filtros.</p>;
  }

  return (
    <Tabs defaultValue="chart" className="w-full">
      <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(220px,0.75fr)_minmax(260px,1fr)_auto] lg:items-end">
        <p className="text-sm text-muted-foreground">
          Todos los productos con el filtro activo de fecha y sucursal.
        </p>
        <div className="grid gap-2 sm:grid-cols-[minmax(160px,0.7fr)_minmax(220px,1fr)]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar producto"
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
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
              <ProductComparisonChart product={selectedProduct} yearKeys={activeYearKeys} branchKeys={activeBranchKeys} />
              <ProductComparisonPie product={selectedProduct} yearKeys={activeYearKeys} branchKeys={activeBranchKeys} />
            </div>
          </TabsContent>
          <TabsContent value="branches" className="mt-0">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
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
            <ProductComparisonTable data={data} yearKeys={activeYearKeys} branchKeys={activeBranchKeys} />
          </TabsContent>
          <TabsContent value="branches" className="mt-0">
            <ProductComparisonTable data={data} yearKeys={activeYearKeys} branchKeys={activeBranchKeys} />
          </TabsContent>
        </Tabs>
      </TabsContent>
    </Tabs>
  );
}

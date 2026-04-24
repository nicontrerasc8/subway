"use client";

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
import { formatCurrency, formatNumber } from "@/lib/utils";

const COLORS = ["#008938", "#ffc20a", "#2563eb", "#ef4444", "#14b8a6", "#f97316"];

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
        <Line type="monotone" dataKey="value" stroke="#008938" strokeWidth={3} dot={false} name="Ventas" />
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
        <Bar dataKey="value" fill="#ffc20a" radius={[8, 8, 0, 0]} name="Ventas" />
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
            <Cell key={entry.label} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CurrencyTooltip />} />
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
            stroke={COLORS[index % COLORS.length]}
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
}: {
  data: DashboardBranchesChartPoint[];
  keys: string[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 16, right: 16, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(value) => formatCurrency(Number(value))} width={88} tick={{ fontSize: 12 }} />
        <Tooltip content={<CurrencyTooltip />} />
        <Legend align="right" iconType="circle" verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
        {keys.map((key, index) => (
          <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} radius={[6, 6, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function DashboardBranchesDataTable({
  data,
  keys,
  valueFormatter,
}: {
  data: DashboardBranchesChartPoint[];
  keys: string[];
  valueFormatter: (value: number) => string;
}) {
  return (
    <Table className="max-h-[320px] overflow-auto rounded-2xl">
      <TableElement>
        <TableHead className="sticky top-0 z-10">
          <TableRow>
            <TableHeaderCell>Fecha</TableHeaderCell>
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
}: {
  data: DashboardBranchesChartPoint[];
  keys: string[];
  chart: "line" | "bar";
  valueFormat?: "currency" | "number";
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
          <DashboardBranchesMultiBarChart data={data} keys={keys} />
        )}
      </TabsContent>
      <TabsContent value="table" className="mt-0">
        <DashboardBranchesDataTable data={data} keys={keys} valueFormatter={valueFormatter} />
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
        <Bar dataKey="value" fill="#008938" radius={[6, 6, 0, 0]} name={name} />
      </BarChart>
    </ResponsiveContainer>
  );
}

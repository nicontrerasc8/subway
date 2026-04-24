"use client";

import { Pie, PieChart, Cell, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { DashboardOverviewPoint } from "@/modules/dashboard/services/dashboard-overview";
import type { DashboardBranchesChartPoint } from "@/modules/dashboard/services/dashboard-branches";
import { formatCurrency } from "@/lib/utils";

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

export function DashboardDailySalesChart({ data }: { data: DashboardOverviewPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
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
    <ResponsiveContainer width="100%" height={320}>
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
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="label" innerRadius={64} outerRadius={96} paddingAngle={3}>
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
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 16, right: 16, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} minTickGap={24} />
        <YAxis tickFormatter={(value) => formatCurrency(Number(value))} width={88} tick={{ fontSize: 12 }} />
        <Tooltip content={<CurrencyTooltip />} />
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
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 16, right: 16, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(value) => formatCurrency(Number(value))} width={88} tick={{ fontSize: 12 }} />
        <Tooltip content={<CurrencyTooltip />} />
        {keys.map((key, index) => (
          <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} radius={[6, 6, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DashboardSimpleBarChart({
  data,
}: {
  data: DashboardOverviewPoint[];
}) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 16, right: 16, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} angle={-16} textAnchor="end" height={72} />
        <YAxis tickFormatter={(value) => formatCurrency(Number(value))} width={88} tick={{ fontSize: 12 }} />
        <Tooltip content={<CurrencyTooltip />} />
        <Bar dataKey="value" fill="#008938" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency, formatNumber } from "@/lib/utils";
import type {
  HistoricalBranchPerformancePoint,
  HistoricalMixPoint,
  HistoricalPeriodPoint,
  HistoricalYearlyPoint,
} from "@/modules/dashboard/services/historical-metrics";

const COLORS = ["#008938", "#ffc600", "#2878b8", "#e05d43", "#6f55a5", "#2f8f83", "#b86b2d"];

function formatCurrencyTwoDecimals(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function ValueTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number | string; name?: string; dataKey?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border bg-background px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground">{label}</p>
      {payload.map((entry, index) => {
        const value = Number(entry.value ?? 0);
        const key = String(entry.dataKey ?? entry.name ?? "").toLowerCase();
        const isTicket = key.includes("ticket");
        const isCurrency = key.includes("venta") || isTicket;

        return (
          <p key={`${entry.name ?? "value"}-${index}`} className="text-sm font-medium">
            {entry.name}: {isTicket ? formatCurrencyTwoDecimals(value) : isCurrency ? formatCurrency(value) : formatNumber(value)}
          </p>
        );
      })}
    </div>
  );
}

export function HistoricalYearlyComposedChart({ data }: { data: HistoricalYearlyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={data} margin={{ top: 18, right: 20, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="sales" tickFormatter={(value) => formatCurrency(Number(value))} width={92} tick={{ fontSize: 12 }} />
        <YAxis yAxisId="ticket" orientation="right" tickFormatter={(value) => formatCurrencyTwoDecimals(Number(value))} width={78} tick={{ fontSize: 12 }} />
        <Tooltip content={<ValueTooltip />} />
        <Legend align="right" iconType="circle" verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="sales" dataKey="ventaTotal" name="Venta total" fill={COLORS[0]} radius={[6, 6, 0, 0]} />
        <Bar yAxisId="sales" dataKey="ventaDelivery" name="Venta delivery" fill={COLORS[1]} radius={[6, 6, 0, 0]} />
        <Line yAxisId="ticket" type="monotone" dataKey="ticketPromedio" name="Ticket promedio" stroke={COLORS[3]} strokeWidth={3} dot={{ r: 4 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function HistoricalMonthlyPerformanceChart({ data }: { data: HistoricalPeriodPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 18, right: 18, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} minTickGap={18} />
        <YAxis yAxisId="sales" tickFormatter={(value) => formatCurrency(Number(value))} width={92} tick={{ fontSize: 12 }} />
        <YAxis yAxisId="ticket" orientation="right" tickFormatter={(value) => formatCurrencyTwoDecimals(Number(value))} width={78} tick={{ fontSize: 12 }} />
        <Tooltip content={<ValueTooltip />} />
        <Legend align="right" iconType="circle" verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="sales" dataKey="ventaTotal" name="Venta total" fill={COLORS[2]} radius={[6, 6, 0, 0]} />
        <Line yAxisId="ticket" type="monotone" dataKey="ticketPromedio" name="Ticket promedio" stroke={COLORS[3]} strokeWidth={3} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function HistoricalBranchRankingChart({ data }: { data: HistoricalBranchPerformancePoint[] }) {
  const chartData = data.slice(0, 10);

  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, left: 24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tickFormatter={(value) => formatCurrency(Number(value))} tick={{ fontSize: 12 }} />
        <YAxis type="category" dataKey="branch" width={92} tick={{ fontSize: 12 }} />
        <Tooltip content={<ValueTooltip />} />
        <Bar dataKey="ventaTotal" name="Venta total" fill={COLORS[0]} radius={[0, 6, 6, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={entry.branchId} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function HistoricalWeekdayChart({ data }: { data: HistoricalPeriodPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 18, right: 18, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(value) => formatCurrency(Number(value))} width={92} tick={{ fontSize: 12 }} />
        <Tooltip content={<ValueTooltip />} />
        <Bar dataKey="ventaTotal" name="Venta total" fill={COLORS[5]} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function HistoricalMixDonut({ data, valueFormat }: { data: HistoricalMixPoint[]; valueFormat: "currency" | "number" }) {
  const formatter = valueFormat === "currency" ? formatCurrency : formatNumber;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="label" innerRadius={58} outerRadius={88} paddingAngle={4}>
          {data.map((entry, index) => (
            <Cell key={entry.label} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="rounded-xl border bg-background px-3 py-2 shadow-lg">
                {payload.map((entry) => (
                  <p key={entry.name} className="text-sm font-medium">
                    {entry.name}: {formatter(Number(entry.value ?? 0))}
                  </p>
                ))}
              </div>
            );
          }}
        />
        <Legend align="center" iconType="circle" verticalAlign="bottom" wrapperStyle={{ fontSize: 12, lineHeight: "18px", paddingTop: 8 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

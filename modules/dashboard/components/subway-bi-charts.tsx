"use client";

import { useSyncExternalStore } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  Radar,
  RadarChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  ResponsiveContainer,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// --- TYPES ---
export type SubwayDailyPoint = {
  date: string;
  label: string;
  total: number;
  unidades: number;
  filas: number;
  ticket: number;
};

export type SubwayWeeklyPoint = {
  week: string;
  label: string;
  actual: number;
  anterior: number;
  crecimiento: number | null;
};

export type SubwayYearPoint = {
  year: string;
  total: number;
  unidades: number;
  filas: number;
  ticket: number;
};

export type SubwayWeekdayPoint = {
  day: string;
  total: number;
  unidades: number;
  filas: number;
  ticket: number;
};

export type SubwayProductPoint = {
  name: string;
  referencia: string;
  total: number;
  unidades: number;
  filas: number;
  ticket: number;
  share: number;
  acumulado: number;
};

export type SubwayCategoryPoint = {
  categoria: string;
  total: number;
  unidades: number;
  filas: number;
  ticket: number;
  share: number;
};

export type SubwayPaymentDailyPoint = {
  date: string;
  label: string;
  ventas: number;
  importe: number;
  operaciones: number;
  diferencia: number;
  ticketOperacion: number;
};

export type SubwayPaymentMethodPoint = {
  formaPago: string;
  importe: number;
  operaciones: number;
  ticketOperacion: number;
  share: number;
};

export type SubwayPaymentChannelPoint = {
  date: string;
  label: string;
  [key: string]: string | number;
};

type SubwayBiChartsProps = {
  daily: SubwayDailyPoint[];
  weekly: SubwayWeeklyPoint[];
  yearly: SubwayYearPoint[];
  weekdays: SubwayWeekdayPoint[];
  products: SubwayProductPoint[];
  categories: SubwayCategoryPoint[];
  paymentDaily: SubwayPaymentDailyPoint[];
  paymentMethods: SubwayPaymentMethodPoint[];
  paymentChannelDaily: SubwayPaymentChannelPoint[];
  paymentChannelKeys: string[];
};

// --- CONFIG & STYLES ---
const colors = ["#008938", "#ffc20a", "#00a6a6", "#ef4444", "#2563eb", "#7c3aed", "#f97316"];
const tickProps = { fill: "#64748b", fontSize: 12, fontWeight: 500 };
const axisProps = { stroke: "#e2e8f0" };
const gridProps = { strokeDasharray: "3 3", stroke: "#f1f5f9" };

type TooltipPayload = {
  name?: string | number;
  dataKey?: string | number;
  value?: string | number;
  color?: string;
};

// --- UTILS ---
function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(value || 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-PE").format(value || 0);
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("es-PE", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
    style: "currency",
    currency: "PEN",
  }).format(value || 0);
}

// --- SUB-COMPONENTS ---
function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[260px] w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
      <div className="flex flex-col items-center gap-2">
        <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span>{label}</span>
      </div>
    </div>
  );
}

function TooltipBox({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 p-4 text-sm shadow-xl backdrop-blur-sm">
      <p className="mb-3 border-b border-slate-100 pb-2 font-semibold text-slate-800">{label}</p>
      <div className="space-y-2">
        {payload.map((entry) => {
          const name = String(entry.name ?? entry.dataKey);
          const value = Number(entry.value ?? 0);
          const isMoney = /total|actual|anterior|ticket|venta|importe|diferencia/i.test(name);
          const isGrowth = /crecimiento/i.test(name);

          return (
            <div key={`${name}-${entry.dataKey}`} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <span className="block h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-slate-600 font-medium">{name}</span>
              </div>
              <span className="font-bold text-slate-900">
                {isGrowth ? `${value.toFixed(1)}%` : isMoney ? formatCurrency(value) : formatNumber(value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Panel({
  title,
  note,
  children,
  className = "",
}: {
  title: string;
  note: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden ${className}`}>
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4 pt-5">
        <CardTitle className="text-lg font-bold text-slate-800">{title}</CardTitle>
        <p className="mt-1 text-sm text-slate-500">{note}</p>
      </CardHeader>
      <CardContent className="p-6">{children}</CardContent>
    </Card>
  );
}

function subscribeToHydration(callback: () => void) {
  const frame = requestAnimationFrame(callback);
  return () => cancelAnimationFrame(frame);
}

function getClientSnapshot() { return true; }
function getServerSnapshot() { return false; }

// --- MAIN COMPONENT ---
export function SubwayBiCharts({
  daily,
  weekly,
  yearly,
  weekdays,
  products,
  categories,
  paymentDaily,
  paymentMethods,
  paymentChannelDaily,
  paymentChannelKeys,
}: SubwayBiChartsProps) {
  const isMounted = useSyncExternalStore(subscribeToHydration, getClientSnapshot, getServerSnapshot);

  if (!isMounted) {
    return (
      <div className="grid gap-6">
        <Panel title="Gráficos BI" note="Preparando visualizaciones interactivas.">
          <ChartEmpty label="Cargando entorno de visualización..." />
        </Panel>
      </div>
    );
  }

  return (
    <div className="grid gap-6 p-2">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#008938]">Dashboard 1</p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Negocio y productos</h2>
        <p className="text-sm text-slate-500">
          Lectura basada solo en el Excel comercial: producto, unidades, ventas y fecha.
        </p>
      </div>

      {/* --- PANEL: PULSO DIARIO --- */}
      <Panel
        title="Ventas en el Tiempo"
        note="Ventas, unidades y ticket promedio por unidad en cada fecha."
        className="xl:col-span-2"
      >
        <div className="h-[400px] w-full">
          {daily.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dailySales" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#008938" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#008938" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} vertical={false} />
                <XAxis dataKey="label" tick={tickProps} axisLine={axisProps} tickLine={false} minTickGap={30} dy={10} />
                <YAxis yAxisId="money" tickFormatter={formatCompactCurrency} tick={tickProps} axisLine={axisProps} tickLine={false} dx={-10} />
                <YAxis yAxisId="units" orientation="right" tick={tickProps} axisLine={axisProps} tickLine={false} dx={10} />
                <Tooltip content={<TooltipBox />} cursor={{ fill: '#f8fafc' }} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                <Area yAxisId="money" name="Ventas" type="monotone" dataKey="total" fill="url(#dailySales)" stroke="#008938" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} />
                <Bar yAxisId="units" name="Unidades" dataKey="unidades" fill="#ffc20a" radius={[4, 4, 0, 0]} maxBarSize={40} opacity={0.8} />
                <Line yAxisId="money" name="Ticket por unidad" type="monotone" dataKey="ticket" stroke="#00a6a6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty label="No hay fechas suficientes para graficar." />
          )}
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* --- PANEL: SEMANAS --- */}
        <Panel title="Semanas Comparables" note="Semana actual vs la misma semana del año anterior.">
          <div className="h-[340px] w-full">
            {weekly.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid {...gridProps} vertical={false} />
                  <XAxis dataKey="label" tick={tickProps} axisLine={axisProps} tickLine={false} dy={10} />
                  <YAxis tickFormatter={formatCompactCurrency} tick={tickProps} axisLine={axisProps} tickLine={false} dx={-10} />
                  <Tooltip content={<TooltipBox />} cursor={{ fill: '#f8fafc' }} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                  <Bar name="Año Actual" dataKey="actual" fill="#008938" radius={[4, 4, 0, 0]} maxBarSize={60} />
                  <Bar name="Año Anterior" dataKey="anterior" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty label="No hay semanas comparables." />
            )}
          </div>
        </Panel>

        {/* --- PANEL: ANUAL --- */}
        <Panel title="Comparativo Anual" note="Ventas y unidades totales por año detectado.">
          <div className="h-[340px] w-full">
            {yearly.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={yearly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid {...gridProps} vertical={false} />
                  <XAxis dataKey="year" tick={tickProps} axisLine={axisProps} tickLine={false} dy={10} />
                  <YAxis yAxisId="money" tickFormatter={formatCompactCurrency} tick={tickProps} axisLine={axisProps} tickLine={false} dx={-10} />
                  <YAxis yAxisId="units" orientation="right" tick={tickProps} axisLine={axisProps} tickLine={false} dx={10} />
                  <Tooltip content={<TooltipBox />} cursor={{ fill: '#f8fafc' }} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                  <Bar yAxisId="money" name="Ventas" dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={60} />
                  <Line yAxisId="units" name="Unidades" type="monotone" dataKey="unidades" stroke="#ffc20a" strokeWidth={4} activeDot={{ r: 8 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty label="No hay años para comparar." />
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Ventas por Categoria" note="Agrupacion comercial del portafolio: SUB, COMBO, BEBIDA, EXTRA y OTROS.">
          <div className="h-[340px] w-full">
            {categories.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categories} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid {...gridProps} vertical={false} />
                  <XAxis dataKey="categoria" tick={tickProps} axisLine={axisProps} tickLine={false} dy={10} />
                  <YAxis tickFormatter={formatCompactCurrency} tick={tickProps} axisLine={axisProps} tickLine={false} dx={-10} />
                  <Tooltip content={<TooltipBox />} cursor={{ fill: "#f8fafc" }} />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
                  <Bar name="Ventas" dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={60}>
                    {categories.map((entry, index) => (
                      <Cell key={entry.categoria} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty label="No hay categorias para graficar." />
            )}
          </div>
        </Panel>

        <Panel title="Mix de Productos" note="Participacion porcentual por categoria sobre ventas comerciales.">
          <div className="h-[340px] w-full flex justify-center">
            {categories.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categories} dataKey="total" nameKey="categoria" cx="50%" cy="50%" innerRadius="55%" outerRadius="85%" paddingAngle={4} stroke="none">
                    {categories.map((entry, index) => (
                      <Cell key={entry.categoria} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<TooltipBox />} />
                  <Legend layout="horizontal" verticalAlign="bottom" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty label="No hay mix por categoria." />
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        {/* --- PANEL: DIAS DE LA SEMANA --- */}
        <Panel title="Patrón Semanal" note="Comportamiento comercial según día de la semana.">
          <div className="h-[360px] w-full">
            {weekdays.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={weekdays} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="day" tick={{ fill: "#475569", fontSize: 13, fontWeight: 500 }} />
                  <PolarRadiusAxis tickFormatter={formatCompactCurrency} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <Radar name="Ventas" dataKey="total" stroke="#008938" fill="#008938" fillOpacity={0.15} strokeWidth={3} />
                  <Tooltip content={<TooltipBox />} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty label="No hay días para graficar." />
            )}
          </div>
        </Panel>

        {/* --- PANEL: PORTAFOLIO MATRIZ --- */}
        <Panel title="Matriz Portafolio" note="Burbujas representan productos: x (Unidades), y (Ticket), tamaño (Venta).">
          <div className="h-[360px] w-full">
            {products.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis type="number" dataKey="unidades" name="Unidades" tick={tickProps} axisLine={axisProps} tickLine={false} dy={10} />
                  <YAxis type="number" dataKey="ticket" name="Ticket Promedio" tickFormatter={formatCompactCurrency} tick={tickProps} axisLine={axisProps} tickLine={false} dx={-10} />
                  <ZAxis type="number" dataKey="total" range={[100, 1500]} name="Venta Total" />
                  <Tooltip cursor={{ strokeDasharray: "3 3", stroke: "#cbd5e1" }} content={<TooltipBox />} />
                  <Scatter name="Productos" data={products.slice(0, 30)}>
                    {products.slice(0, 30).map((entry, index) => (
                      <Cell key={entry.referencia} fill={colors[index % colors.length]} fillOpacity={0.8} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty label="No hay productos para la matriz." />
            )}
          </div>
        </Panel>
      </div>

      {/* --- PANEL: PARETO --- */}
      <Panel title="Pareto de Productos (Top 12)" note="Concentración y peso de los productos principales.">
        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
          <div className="h-[420px] w-full">
            {products.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={products.slice(0, 12)} margin={{ top: 20, right: 10, left: 0, bottom: 80 }}>
                  <CartesianGrid {...gridProps} vertical={false} />
                  <XAxis dataKey="referencia" angle={-45} textAnchor="end" tick={tickProps} axisLine={axisProps} tickLine={false} interval={0} dy={10} />
                  <YAxis yAxisId="money" tickFormatter={formatCompactCurrency} tick={tickProps} axisLine={axisProps} tickLine={false} dx={-10} />
                  <YAxis yAxisId="pct" orientation="right" tickFormatter={(value) => `${Number(value).toFixed(0)}%`} tick={tickProps} axisLine={axisProps} tickLine={false} dx={10} />
                  <Tooltip content={<TooltipBox />} cursor={{ fill: '#f8fafc' }} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" verticalAlign="top" />
                  <Bar yAxisId="money" name="Ventas" dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={50}>
                    {products.slice(0, 12).map((entry, index) => (
                      <Cell key={entry.referencia} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                  <Line yAxisId="pct" name="Acumulado" dataKey="acumulado" stroke="#ef4444" strokeWidth={3} dot={{ r: 5, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 8 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty label="No hay Pareto para mostrar." />
            )}
          </div>

          <div className="h-[420px] w-full flex flex-col items-center justify-center">
            {products.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={products.slice(0, 8)} dataKey="total" nameKey="referencia" cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" paddingAngle={3} stroke="none">
                    {products.slice(0, 8).map((entry, index) => (
                      <Cell key={entry.referencia} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<TooltipBox />} />
                  <Legend layout="horizontal" verticalAlign="bottom" iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty label="No hay mix visible." />
            )}
          </div>
        </div>
      </Panel>

      <div className="space-y-1 pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2563eb]">Dashboard 2</p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Pagos y canales</h2>
        <p className="text-sm text-slate-500">
          Lectura basada solo en el Excel de forma de pedido: canal, importe, operaciones y fecha.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Ventas por Canal" note="Importe acumulado por forma de pago.">
          <div className="h-[360px] w-full">
            {paymentMethods.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentMethods.slice(0, 12)} layout="vertical" margin={{ top: 10, right: 20, left: 60, bottom: 0 }}>
                  <CartesianGrid {...gridProps} horizontal={false} />
                  <XAxis type="number" tickFormatter={formatCompactCurrency} tick={tickProps} axisLine={axisProps} tickLine={false} />
                  <YAxis dataKey="formaPago" type="category" tick={tickProps} axisLine={axisProps} tickLine={false} width={100} />
                  <Tooltip content={<TooltipBox />} cursor={{ fill: "#f8fafc" }} />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
                  <Bar name="Importe" dataKey="importe" radius={[0, 4, 4, 0]} barSize={24}>
                    {paymentMethods.slice(0, 12).map((entry, index) => (
                      <Cell key={entry.formaPago} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty label="No hay formas de pago para graficar." />
            )}
          </div>
        </Panel>

        <Panel title="Mix de Pago" note="Participacion porcentual del importe.">
          <div className="h-[360px] w-full flex justify-center">
            {paymentMethods.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentMethods.slice(0, 8)} dataKey="importe" nameKey="formaPago" cx="50%" cy="50%" innerRadius="55%" outerRadius="85%" paddingAngle={4} stroke="none">
                    {paymentMethods.slice(0, 8).map((entry, index) => (
                      <Cell key={entry.formaPago} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<TooltipBox />} />
                  <Legend layout="horizontal" verticalAlign="bottom" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty label="Sin mix de pago disponible." />
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Operaciones por Canal" note="Volumen de pedidos por forma de pago.">
          <div className="h-[340px] w-full">
            {paymentMethods.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentMethods.slice(0, 12)} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                  <CartesianGrid {...gridProps} vertical={false} />
                  <XAxis dataKey="formaPago" angle={-35} textAnchor="end" tick={tickProps} axisLine={axisProps} tickLine={false} dy={10} />
                  <YAxis tick={tickProps} axisLine={axisProps} tickLine={false} dx={-10} />
                  <Tooltip content={<TooltipBox />} cursor={{ fill: "#f8fafc" }} />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
                  <Bar name="Operaciones" dataKey="operaciones" fill="#ffc20a" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty label="No hay operaciones por canal." />
            )}
          </div>
        </Panel>

        <Panel title="Ticket Promedio por Canal" note="Importe dividido entre numero de operaciones.">
          <div className="h-[340px] w-full">
            {paymentMethods.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentMethods.slice(0, 12)} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                  <CartesianGrid {...gridProps} vertical={false} />
                  <XAxis dataKey="formaPago" angle={-35} textAnchor="end" tick={tickProps} axisLine={axisProps} tickLine={false} dy={10} />
                  <YAxis tickFormatter={formatCompactCurrency} tick={tickProps} axisLine={axisProps} tickLine={false} dx={-10} />
                  <Tooltip content={<TooltipBox />} cursor={{ fill: "#f8fafc" }} />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
                  <Bar name="Ticket" dataKey="ticketOperacion" fill="#00a6a6" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty label="No hay ticket por canal." />
            )}
          </div>
        </Panel>
      </div>

      <Panel title="Evolucion por Canal" note="Importe diario de los principales canales de pago.">
        <div className="h-[400px] w-full">
          {paymentChannelDaily.length && paymentChannelKeys.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={paymentChannelDaily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} vertical={false} />
                <XAxis dataKey="label" tick={tickProps} axisLine={axisProps} tickLine={false} minTickGap={30} dy={10} />
                <YAxis tickFormatter={formatCompactCurrency} tick={tickProps} axisLine={axisProps} tickLine={false} dx={-10} />
                <Tooltip content={<TooltipBox />} cursor={{ fill: "#f8fafc" }} />
                <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
                {paymentChannelKeys.map((channel, index) => (
                  <Line
                    key={channel}
                    name={channel}
                    type="monotone"
                    dataKey={channel}
                    stroke={colors[index % colors.length]}
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty label="No hay evolucion por canal." />
          )}
        </div>
      </Panel>

      <div className="space-y-1 pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ef4444]">Control</p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Cuadre por fecha</h2>
        <p className="text-sm text-slate-500">
          Los hechos no se unen por fila ni por producto. Se comparan por fecha para validar consistencia.
        </p>
      </div>

      <Panel
        title="Ventas de Productos vs Importe de Pagos"
        note="SUM(ventas productos) frente a SUM(importe pagos) por fecha."
      >
        <div className="h-[400px] w-full">
          {paymentDaily.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={paymentDaily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="paymentAmount" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} vertical={false} />
                <XAxis dataKey="label" tick={tickProps} axisLine={axisProps} tickLine={false} minTickGap={30} dy={10} />
                <YAxis yAxisId="money" tickFormatter={formatCompactCurrency} tick={tickProps} axisLine={axisProps} tickLine={false} dx={-10} />
                <YAxis yAxisId="ops" orientation="right" tick={tickProps} axisLine={axisProps} tickLine={false} dx={10} />
                <Tooltip content={<TooltipBox />} cursor={{ fill: "#f8fafc" }} />
                <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
                <Area yAxisId="money" name="Ventas productos" type="monotone" dataKey="ventas" fill="#00893815" stroke="#008938" strokeWidth={2} strokeDasharray="5 5" />
                <Area yAxisId="money" name="Importe pagos" type="monotone" dataKey="importe" fill="url(#paymentAmount)" stroke="#2563eb" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} />
                <Bar yAxisId="ops" name="Operaciones" dataKey="operaciones" fill="#ffc20a" radius={[4, 4, 0, 0]} maxBarSize={40} opacity={0.8} />
                <Line yAxisId="money" name="Diferencia" type="monotone" dataKey="diferencia" stroke="#ef4444" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty label="Carga el Excel de forma de pedido para validar el cuadre." />
          )}
        </div>
      </Panel>
    </div>
  );
}

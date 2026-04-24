import type { SubwayPaymentRow, SubwaySaleRow } from "@/modules/dashboard/services/subway-sales";

export type SubwayFilterSearchParams = {
  year?: string | string[];
  month?: string | string[];
  weekday?: string | string[];
};

export type SubwayFilters = {
  year: string | null;
  month: string | null;
  weekday: string | null;
};

export const dayLabels = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
export const fullDayLabels = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];
export const monthLabels = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
export const monthValues = monthLabels.map((_, index) => String(index + 1));
export const weekdayValues = dayLabels.map((_, index) => String(index));

type FilterableRow = {
  fecha: string | null;
  uploadedAt: string;
};

export function parseBusinessDate(value: string) {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  return new Date(value);
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatShortDate(dateKey: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
  }).format(parseBusinessDate(dateKey));
}

export function getMonday(date: Date) {
  const nextDate = new Date(date);
  const day = (nextDate.getDay() + 6) % 7;
  nextDate.setDate(nextDate.getDate() - day);
  nextDate.setHours(0, 0, 0, 0);

  return nextDate;
}

export function getWeekNumber(date: Date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));

  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function getWeekKey(date: Date) {
  return `${date.getFullYear()}-S${String(getWeekNumber(date)).padStart(2, "0")}`;
}

export function getWeekdayIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}

export function getSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function getValidFilterValue(value: string | undefined, validValues: string[]) {
  if (!value || value === "all") return null;
  return validValues.includes(value) ? value : null;
}

export function getRowYear(value: FilterableRow) {
  return String(parseBusinessDate(value.fecha ?? value.uploadedAt).getFullYear());
}

export function getRowMonth(value: FilterableRow) {
  return String(parseBusinessDate(value.fecha ?? value.uploadedAt).getMonth() + 1);
}

export function getRowWeekday(value: FilterableRow) {
  return String(getWeekdayIndex(parseBusinessDate(value.fecha ?? value.uploadedAt)));
}

export function matchesDateFilters(value: FilterableRow, filters: SubwayFilters) {
  if (filters.year && getRowYear(value) !== filters.year) return false;
  if (filters.month && getRowMonth(value) !== filters.month) return false;
  if (filters.weekday && getRowWeekday(value) !== filters.weekday) return false;

  return true;
}

export function buildSubwayFilterHref(
  basePath: string,
  filters: SubwayFilters,
) {
  const params = new URLSearchParams();

  if (filters.year) params.set("year", filters.year);
  if (filters.month) params.set("month", filters.month);
  if (filters.weekday) params.set("weekday", filters.weekday);

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function resolveSubwayFilters(
  searchParams: SubwayFilterSearchParams,
  allRows: SubwaySaleRow[],
  allPaymentRows: SubwayPaymentRow[],
) {
  const requestedYear = getSearchParamValue(searchParams.year);
  const requestedMonth = getSearchParamValue(searchParams.month);
  const requestedWeekday = getSearchParamValue(searchParams.weekday);
  const availableYears = Array.from(
    new Set([...allRows.map(getRowYear), ...allPaymentRows.map(getRowYear)]),
  ).sort((a, b) => Number(b) - Number(a));

  const filters: SubwayFilters = {
    year: getValidFilterValue(requestedYear, availableYears),
    month: getValidFilterValue(requestedMonth, monthValues),
    weekday: getValidFilterValue(requestedWeekday, weekdayValues),
  };

  const activeFilterParts = [
    filters.year ? `año ${filters.year}` : "Todos los años",
    filters.month ? monthLabels[Number(filters.month) - 1] : "Todos los meses",
    filters.weekday ? fullDayLabels[Number(filters.weekday)] : "Todos los dias",
  ];

  return {
    filters,
    availableYears,
    activePeriodLabel: activeFilterParts.join(" · "),
  };
}


type SearchParamValue = string | string[] | undefined;

export type DashboardDateRangeSearchParams = {
  period?: SearchParamValue;
  year?: SearchParamValue;
  month?: SearchParamValue;
  yearFrom?: SearchParamValue;
  yearTo?: SearchParamValue;
  monthFrom?: SearchParamValue;
  monthTo?: SearchParamValue;
  weekFrom?: SearchParamValue;
  weekTo?: SearchParamValue;
  dateFrom?: SearchParamValue;
  dateTo?: SearchParamValue;
};

export type DashboardPeriod = "month" | "week" | "day";

export type DashboardDateRangeFilters = {
  period: DashboardPeriod;
  yearFrom: string | null;
  yearTo: string | null;
  monthFrom: string | null;
  monthTo: string | null;
  weekFrom: string | null;
  weekTo: string | null;
  dateFrom: string | null;
  dateTo: string | null;
};

export const dashboardMonthValues = Array.from({ length: 12 }, (_, index) => String(index + 1));

export function getSearchParamValue(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export function getSearchParamValues(value: SearchParamValue) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function getDateYear(value: string | null) {
  if (!value) return null;
  return value.slice(0, 4);
}

export function getDateMonth(value: string | null) {
  if (!value) return null;
  return String(Number(value.slice(5, 7)));
}

export function getDateDay(value: string | null) {
  if (!value) return null;
  return String(Number(value.slice(8, 10)));
}

export function getMonthLabel(month: string, format: "long" | "short" = "short") {
  return new Intl.DateTimeFormat("es-PE", { month: format }).format(
    new Date(2024, Number(month) - 1, 1),
  );
}

function getValidYear(value: string | undefined, availableYears: string[]) {
  return value && availableYears.includes(value) ? value : null;
}

function getValidMonth(value: string | undefined) {
  return value && dashboardMonthValues.includes(value) ? value : null;
}

function getValidPeriod(value: string | undefined): DashboardPeriod {
  return value === "week" || value === "day" ? value : "month";
}

function getValidWeek(value: string | undefined) {
  return value && /^\d{4}-W\d{2}$/.test(value) ? value : null;
}

function getValidDate(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function sortYearsAscending(years: string[]) {
  return [...years].sort((a, b) => Number(a) - Number(b));
}

function getIsoWeekValue(value: string | null) {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;

  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function resolveDateRangeFilters(
  searchParams: DashboardDateRangeSearchParams,
  availableYears: string[],
) {
  const period = getValidPeriod(getSearchParamValue(searchParams.period));
  const legacyYears = getSearchParamValues(searchParams.year).filter((year) =>
    availableYears.includes(year),
  );
  const legacyMonths = getSearchParamValues(searchParams.month).filter((month) =>
    dashboardMonthValues.includes(month),
  );

  const sortedLegacyYears = sortYearsAscending(legacyYears);
  const sortedLegacyMonths = legacyMonths.sort((a, b) => Number(a) - Number(b));
  const latestYear = availableYears[0] ?? null;
  const earliestYear = sortYearsAscending(availableYears)[0] ?? latestYear;

  let yearFrom =
    getValidYear(getSearchParamValue(searchParams.yearFrom), availableYears) ??
    sortedLegacyYears[0] ??
    earliestYear;
  let yearTo =
    getValidYear(getSearchParamValue(searchParams.yearTo), availableYears) ??
    sortedLegacyYears.at(-1) ??
    latestYear;
  let monthFrom =
    getValidMonth(getSearchParamValue(searchParams.monthFrom)) ??
    sortedLegacyMonths[0] ??
    null;
  let monthTo =
    getValidMonth(getSearchParamValue(searchParams.monthTo)) ??
    sortedLegacyMonths.at(-1) ??
    null;
  let weekFrom = getValidWeek(getSearchParamValue(searchParams.weekFrom));
  let weekTo = getValidWeek(getSearchParamValue(searchParams.weekTo));
  let dateFrom = getValidDate(getSearchParamValue(searchParams.dateFrom));
  let dateTo = getValidDate(getSearchParamValue(searchParams.dateTo));

  if (yearFrom && yearTo && Number(yearFrom) > Number(yearTo)) {
    [yearFrom, yearTo] = [yearTo, yearFrom];
  }

  if (
    yearFrom &&
    yearTo &&
    monthFrom &&
    monthTo &&
    Number(yearFrom) === Number(yearTo) &&
    Number(monthFrom) > Number(monthTo)
  ) {
    [monthFrom, monthTo] = [monthTo, monthFrom];
  }

  if (weekFrom && weekTo && weekFrom > weekTo) {
    [weekFrom, weekTo] = [weekTo, weekFrom];
  }

  if (dateFrom && dateTo && dateFrom > dateTo) {
    [dateFrom, dateTo] = [dateTo, dateFrom];
  }

  return {
    period,
    yearFrom,
    yearTo,
    monthFrom,
    monthTo,
    weekFrom,
    weekTo,
    dateFrom,
    dateTo,
  } satisfies DashboardDateRangeFilters;
}

function toYearMonthIndex(year: string, month: string) {
  return Number(year) * 12 + Number(month);
}

export function matchesDateRange(value: string | null, filters: DashboardDateRangeFilters) {
  if (filters.period === "day") {
    if (!value) return false;
    if (filters.dateFrom && value < filters.dateFrom) return false;
    if (filters.dateTo && value > filters.dateTo) return false;
    return true;
  }

  if (filters.period === "week") {
    const week = getIsoWeekValue(value);
    if (!week) return false;
    if (filters.weekFrom && week < filters.weekFrom) return false;
    if (filters.weekTo && week > filters.weekTo) return false;
    return true;
  }

  const year = getDateYear(value);
  const month = getDateMonth(value);
  if (!year || !month) return false;

  const current = toYearMonthIndex(year, month);
  const from = filters.yearFrom
    ? toYearMonthIndex(filters.yearFrom, filters.monthFrom ?? "1")
    : null;
  const to = filters.yearTo
    ? toYearMonthIndex(filters.yearTo, filters.monthTo ?? "12")
    : null;

  if (from !== null && current < from) return false;
  if (to !== null && current > to) return false;

  return true;
}

export function matchesMonthlyRange(
  row: { anio: number | null; mes_num: number | null },
  filters: DashboardDateRangeFilters,
) {
  if (filters.period !== "month") return false;
  if (!row.anio || !row.mes_num) return false;

  const current = toYearMonthIndex(String(row.anio), String(row.mes_num));
  const from = filters.yearFrom
    ? toYearMonthIndex(filters.yearFrom, filters.monthFrom ?? "1")
    : null;
  const to = filters.yearTo
    ? toYearMonthIndex(filters.yearTo, filters.monthTo ?? "12")
    : null;

  if (from !== null && current < from) return false;
  if (to !== null && current > to) return false;

  return true;
}

export function formatDateRangeLabel(filters: DashboardDateRangeFilters) {
  if (filters.period === "day") {
    return `Dias ${filters.dateFrom ?? "inicio"} - ${filters.dateTo ?? "fin"}`;
  }

  if (filters.period === "week") {
    return `Semanas ${filters.weekFrom ?? "inicio"} - ${filters.weekTo ?? "fin"}`;
  }

  const yearLabel =
    filters.yearFrom && filters.yearTo
      ? filters.yearFrom === filters.yearTo
        ? `Año ${filters.yearFrom}`
        : `Años ${filters.yearFrom}-${filters.yearTo}`
      : "Todos los años";

  const monthLabel =
    filters.monthFrom && filters.monthTo
      ? filters.monthFrom === filters.monthTo
        ? getMonthLabel(filters.monthFrom, "long")
        : `${getMonthLabel(filters.monthFrom, "long")} - ${getMonthLabel(filters.monthTo, "long")}`
      : "Todos los meses";

  return `${yearLabel} · ${monthLabel}`;
}

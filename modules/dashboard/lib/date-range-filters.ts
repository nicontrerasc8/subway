type SearchParamValue = string | string[] | undefined;

export type DashboardDateRangeSearchParams = {
  year?: SearchParamValue;
  month?: SearchParamValue;
  yearFrom?: SearchParamValue;
  yearTo?: SearchParamValue;
  monthFrom?: SearchParamValue;
  monthTo?: SearchParamValue;
};

export type DashboardDateRangeFilters = {
  yearFrom: string | null;
  yearTo: string | null;
  monthFrom: string | null;
  monthTo: string | null;
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

function sortYearsAscending(years: string[]) {
  return [...years].sort((a, b) => Number(a) - Number(b));
}

export function resolveDateRangeFilters(
  searchParams: DashboardDateRangeSearchParams,
  availableYears: string[],
) {
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

  return {
    yearFrom,
    yearTo,
    monthFrom,
    monthTo,
  } satisfies DashboardDateRangeFilters;
}

function toYearMonthIndex(year: string, month: string) {
  return Number(year) * 12 + Number(month);
}

export function matchesDateRange(value: string | null, filters: DashboardDateRangeFilters) {
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

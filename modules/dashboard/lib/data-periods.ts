export const HISTORICAL_DASHBOARD_START_DATE = "2023-01-01";
export const HISTORICAL_DASHBOARD_END_DATE = "2026-05-31";
export const OPERATIONAL_DASHBOARD_START_DATE = "2026-06-01";

function isIsoDate(value: string | null) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export function isHistoricalDashboardDate(value: string | null) {
  return (
    isIsoDate(value) &&
    value! >= HISTORICAL_DASHBOARD_START_DATE &&
    value! <= HISTORICAL_DASHBOARD_END_DATE
  );
}

export function isOperationalDashboardDate(value: string | null) {
  return isIsoDate(value) && value! >= OPERATIONAL_DASHBOARD_START_DATE;
}

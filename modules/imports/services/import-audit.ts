export type ImportAuditRow = {
  rowNumber: number;
  parseStatus: "valid" | "error";
  parseErrors: string[];
  nullFields: string[];
  nullFieldCount: number;
  hasNullValues: boolean;
  hasInvalidData: boolean;
};

export type ImportAudit = {
  generatedAt: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rowsWithNullValues: number;
  rowsWithInvalidData: number;
  totalNullValues: number;
  nullFieldCounts: Record<string, number>;
  rows: ImportAuditRow[];
};

function isNullLike(value: unknown) {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  );
}

export function buildImportAudit<Row>(args: {
  rows: Row[];
  getRowNumber: (row: Row) => number;
  getPayload: (row: Row) => Record<string, unknown>;
  getParseStatus: (row: Row) => "valid" | "error";
  getParseErrors: (row: Row) => string[];
}): ImportAudit {
  const nullFieldCounts = new Map<string, number>();
  const auditRows: ImportAuditRow[] = [];

  for (const row of args.rows) {
    const payload = args.getPayload(row);
    const nullFields = Object.entries(payload)
      .filter(([, value]) => isNullLike(value))
      .map(([field]) => field);
    const parseErrors = args.getParseErrors(row);
    const parseStatus = args.getParseStatus(row);
    const hasInvalidData = parseStatus === "error" || parseErrors.length > 0;

    for (const field of nullFields) {
      nullFieldCounts.set(field, (nullFieldCounts.get(field) ?? 0) + 1);
    }

    auditRows.push({
      rowNumber: args.getRowNumber(row),
      parseStatus,
      parseErrors,
      nullFields,
      nullFieldCount: nullFields.length,
      hasNullValues: nullFields.length > 0,
      hasInvalidData,
    });
  }

  const invalidRows = auditRows.filter((row) => row.hasInvalidData).length;
  const rowsWithNullValues = auditRows.filter((row) => row.hasNullValues).length;
  const totalNullValues = auditRows.reduce((sum, row) => sum + row.nullFieldCount, 0);

  return {
    generatedAt: new Date().toISOString(),
    totalRows: auditRows.length,
    validRows: auditRows.length - invalidRows,
    invalidRows,
    rowsWithNullValues,
    rowsWithInvalidData: invalidRows,
    totalNullValues,
    nullFieldCounts: Object.fromEntries(
      [...nullFieldCounts.entries()].sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      }),
    ),
    rows: auditRows,
  };
}

export function parseImportAudit(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const rows = Array.isArray(record.rows)
    ? record.rows.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const row = item as Record<string, unknown>;
        if (typeof row.rowNumber !== "number") return [];

        return [{
          rowNumber: row.rowNumber,
          parseStatus: row.parseStatus === "error" ? "error" : "valid",
          parseErrors: Array.isArray(row.parseErrors)
            ? row.parseErrors.filter((error): error is string => typeof error === "string")
            : [],
          nullFields: Array.isArray(row.nullFields)
            ? row.nullFields.filter((field): field is string => typeof field === "string")
            : [],
          nullFieldCount:
            typeof row.nullFieldCount === "number" ? row.nullFieldCount : 0,
          hasNullValues: row.hasNullValues === true,
          hasInvalidData: row.hasInvalidData === true,
        } satisfies ImportAuditRow];
      })
    : [];

  const nullFieldCounts =
    record.nullFieldCounts && typeof record.nullFieldCounts === "object"
      ? Object.fromEntries(
          Object.entries(record.nullFieldCounts as Record<string, unknown>).flatMap(
            ([field, count]) =>
              typeof count === "number" ? [[field, count] as const] : [],
          ),
        )
      : {};

  return {
    generatedAt:
      typeof record.generatedAt === "string" ? record.generatedAt : new Date().toISOString(),
    totalRows: typeof record.totalRows === "number" ? record.totalRows : rows.length,
    validRows:
      typeof record.validRows === "number"
        ? record.validRows
        : rows.filter((row) => !row.hasInvalidData).length,
    invalidRows:
      typeof record.invalidRows === "number"
        ? record.invalidRows
        : rows.filter((row) => row.hasInvalidData).length,
    rowsWithNullValues:
      typeof record.rowsWithNullValues === "number"
        ? record.rowsWithNullValues
        : rows.filter((row) => row.hasNullValues).length,
    rowsWithInvalidData:
      typeof record.rowsWithInvalidData === "number"
        ? record.rowsWithInvalidData
        : rows.filter((row) => row.hasInvalidData).length,
    totalNullValues:
      typeof record.totalNullValues === "number"
        ? record.totalNullValues
        : rows.reduce((sum, row) => sum + row.nullFieldCount, 0),
    nullFieldCounts,
    rows,
  } satisfies ImportAudit;
}

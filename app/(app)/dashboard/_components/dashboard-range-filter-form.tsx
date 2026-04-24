import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { dashboardMonthValues, getMonthLabel } from "@/modules/dashboard/lib/date-range-filters";

type DashboardRangeFilterFormProps = {
  action: string;
  filters: {
    yearFrom: string | null;
    yearTo: string | null;
    monthFrom: string | null;
    monthTo: string | null;
  };
  availableYears: string[];
  branch?: string | null;
  branches?: Array<{ id: string; label: string }>;
  layout?: "stacked" | "inline";
};

function SelectField({
  id,
  name,
  label,
  defaultValue,
  children,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </Label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        className="flex h-11 w-full rounded-xl border border-border bg-input px-3 py-2 text-sm shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
      >
        {children}
      </select>
    </div>
  );
}

function YearOptions({ years }: { years: string[] }) {
  if (!years.length) return <option value="">Sin años</option>;

  return years.map((year) => (
    <option key={year} value={year}>
      {year}
    </option>
  ));
}

function MonthOptions({ fallbackLabel }: { fallbackLabel: string }) {
  return (
    <>
      <option value="">{fallbackLabel}</option>
      {dashboardMonthValues.map((month) => (
        <option key={month} value={month}>
          {getMonthLabel(month, "long")}
        </option>
      ))}
    </>
  );
}

function BranchField({
  action,
  branch,
  branches,
}: {
  action: string;
  branch: string | null | undefined;
  branches: Array<{ id: string; label: string }>;
}) {
  if (!branches.length) return null;

  return (
    <SelectField id={`${action}-branch`} name="branch" label="Sucursal" defaultValue={branch ?? ""}>
      <option value="">Todas</option>
      {branches.map((item) => (
        <option key={item.id} value={item.id}>
          {item.label}
        </option>
      ))}
    </SelectField>
  );
}

export function DashboardRangeFilterForm({
  action,
  filters,
  availableYears,
  branch,
  branches = [],
  layout = "stacked",
}: DashboardRangeFilterFormProps) {
  const fields = (
    <>
      <SelectField id={`${action}-year-from`} name="yearFrom" label="Año desde" defaultValue={filters.yearFrom ?? ""}>
        <YearOptions years={availableYears} />
      </SelectField>

      <SelectField id={`${action}-year-to`} name="yearTo" label="Año hasta" defaultValue={filters.yearTo ?? ""}>
        <YearOptions years={availableYears} />
      </SelectField>

      <SelectField id={`${action}-month-from`} name="monthFrom" label="Mes desde" defaultValue={filters.monthFrom ?? ""}>
        <MonthOptions fallbackLabel="Enero" />
      </SelectField>

      <SelectField id={`${action}-month-to`} name="monthTo" label="Mes hasta" defaultValue={filters.monthTo ?? ""}>
        <MonthOptions fallbackLabel="Diciembre" />
      </SelectField>
    </>
  );

  if (layout === "inline") {
    return (
      <form action={action} className="grid gap-3 md:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto] xl:items-end">
        {fields}
        {branches.length ? (
          <div className="md:col-span-2 xl:col-span-1">
            <BranchField action={action} branch={branch} branches={branches} />
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3 xl:min-h-11">
          <Button type="submit">Filtrar</Button>
          <Link href={action} className="text-sm font-medium text-muted-foreground transition hover:text-foreground">
            Limpiar
          </Link>
        </div>
      </form>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">{fields}</div>
      <BranchField action={action} branch={branch} branches={branches} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit">Filtrar</Button>
        <Link href={action} className="text-sm font-medium text-muted-foreground transition hover:text-foreground">
          Limpiar filtros
        </Link>
      </div>
    </form>
  );
}

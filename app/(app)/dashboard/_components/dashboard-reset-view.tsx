type DashboardResetViewProps = {
  title: string;
  route: string;
  data: unknown;
  description?: string;
  filters?: Record<string, string | undefined>;
};

function getDataSummary(data: unknown) {
  if (Array.isArray(data)) {
    return `${data.length} elementos cargados en memoria.`;
  }

  if (data && typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>);
    const arrays = entries.filter(([, value]) => Array.isArray(value)).length;
    const objects = entries.filter(([, value]) => value && typeof value === "object" && !Array.isArray(value)).length;
    const parts = [`${entries.length} bloques cargados`];

    if (arrays > 0) parts.push(`${arrays} colecciones`);
    if (objects > 0) parts.push(`${objects} objetos`);

    return `${parts.join(", ")}.`;
  }

  return "La carga del servidor sigue activa.";
}

function getActiveFilters(filters?: Record<string, string | undefined>) {
  if (!filters) return [];

  return Object.entries(filters).filter(([, value]) => Boolean(value)) as Array<[string, string]>;
}

export function DashboardResetView({
  title,
  route,
  data,
  description = "La UI anterior fue retirada. Esta ruta sigue ejecutando su carga de informacion para rehacer el dashboard desde cero.",
  filters,
}: DashboardResetViewProps) {
  const activeFilters = getActiveFilters(filters);

  return (
    <section className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-4xl items-center">
      <div className="w-full rounded-3xl border border-border bg-card p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Dashboard reset</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{description}</p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border bg-background p-5">
            <p className="text-sm font-medium">Ruta</p>
            <p className="mt-2 break-all font-mono text-sm text-muted-foreground">{route}</p>
          </div>

          <div className="rounded-2xl border bg-background p-5">
            <p className="text-sm font-medium">Estado de carga</p>
            <p className="mt-2 text-sm text-muted-foreground">{getDataSummary(data)}</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border bg-background p-5">
          <p className="text-sm font-medium">Filtros activos</p>
          {activeFilters.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {activeFilters.map(([key, value]) => (
                <span key={key} className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                  {key}: {value}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Sin filtros aplicados en esta vista.</p>
          )}
        </div>
      </div>
    </section>
  );
}

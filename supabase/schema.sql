create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum (
      'administrador_comercial',
      'gerente_comercial',
      'jefe_area',
      'ejecutivo_ventas',
      'directorio'
    );
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_type where typname = 'app_role')
    and not exists (
      select 1
      from pg_enum
      where enumtypid = 'public.app_role'::regtype
        and enumlabel = 'administrador_comercial'
    ) then
    alter type public.app_role add value 'administrador_comercial';
  end if;

  if exists (select 1 from pg_type where typname = 'app_role')
    and not exists (
      select 1
      from pg_enum
      where enumtypid = 'public.app_role'::regtype
        and enumlabel = 'gerente_comercial'
    ) then
    alter type public.app_role add value 'gerente_comercial';
  end if;

  if exists (select 1 from pg_type where typname = 'app_role')
    and not exists (
      select 1
      from pg_enum
      where enumtypid = 'public.app_role'::regtype
        and enumlabel = 'ejecutivo_ventas'
    ) then
    alter type public.app_role add value 'ejecutivo_ventas';
  end if;

  if exists (select 1 from pg_type where typname = 'app_role')
    and not exists (
      select 1
      from pg_enum
      where enumtypid = 'public.app_role'::regtype
        and enumlabel = 'directorio'
    ) then
    alter type public.app_role add value 'directorio';
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'import_status') then
    create type public.import_status as enum ('pending', 'processing', 'processed', 'failed');
  end if;
end $$;

create table if not exists public.profiles_subway (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text not null unique,
  role public.app_role not null default 'ejecutivo_ventas',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if to_regclass('public.profiles') is not null then
    execute $copy_profiles$
      insert into public.profiles_subway (id, full_name, email, role, is_active, created_at)
      select id, full_name, email, role, is_active, created_at
      from public.profiles
      on conflict (id) do update
      set
        full_name = excluded.full_name,
        email = excluded.email,
        role = excluded.role,
        is_active = excluded.is_active
    $copy_profiles$;
  end if;
end $$;

update public.profiles_subway
set role = case
  when role::text = 'superadmin' then 'administrador_comercial'::public.app_role
  when role::text = 'gerencia_general' then 'directorio'::public.app_role
  when role::text = 'gerencia_comercial' then 'gerente_comercial'::public.app_role
  when role::text = 'ejecutivo' then 'ejecutivo_ventas'::public.app_role
  when role::text = 'vendedor' then 'ejecutivo_ventas'::public.app_role
  when role::text = 'operador_carga' then 'administrador_comercial'::public.app_role
  else role
end
where role::text in (
  'superadmin',
  'gerencia_general',
  'gerencia_comercial',
  'ejecutivo',
  'vendedor',
  'operador_carga'
);

create table if not exists public.user_scopes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles_subway(id) on delete cascade,
  negocio_id uuid,
  linea_id uuid,
  sector_id uuid,
  ejecutivo_id uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.imports_subway (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  storage_path text unique,
  anio integer not null,
  fecha date,
  source_key text not null default 'ax-commercial',
  sheet_name text,
  uploaded_by uuid not null references public.profiles_subway(id),
  uploaded_at timestamptz not null default timezone('utc', now()),
  status public.import_status not null default 'pending',
  total_rows integer not null default 0,
  valid_rows integer not null default 0,
  error_rows integer not null default 0,
  notes text,
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.accounting_imports (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  storage_path text unique,
  anio integer not null,
  sheet_name text,
  uploaded_by uuid not null references public.profiles_subway(id),
  uploaded_at timestamptz not null default timezone('utc', now()),
  status public.import_status not null default 'pending',
  total_rows integer not null default 0,
  valid_rows integer not null default 0,
  error_rows integer not null default 0,
  notes text,
  data jsonb not null default '{}'::jsonb
);

alter table public.imports_subway add column if not exists anio integer;
alter table public.imports_subway add column if not exists fecha date;
alter table public.imports_subway add column if not exists source_key text not null default 'ax-commercial';
alter table public.imports_subway add column if not exists sheet_name text;
alter table public.imports_subway add column if not exists data jsonb not null default '{}'::jsonb;
update public.imports_subway
set anio = coalesce(anio, extract(year from uploaded_at)::integer)
where anio is null;
alter table public.imports_subway alter column anio set not null;

create table if not exists public.sales_product (
  id bigserial primary key,
  import_id uuid not null references public.imports_subway(id) on delete cascade,
  row_number integer not null,
  fecha date not null,
  referencia text,
  producto text not null,
  categoria text not null default 'OTROS',
  unidades numeric(18,4) not null default 0,
  ventas numeric(18,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint sales_product_source_row_unique unique (import_id, row_number),
  constraint sales_product_unidades_non_negative check (unidades >= 0),
  constraint sales_product_ventas_non_negative check (ventas >= 0)
);

create table if not exists public.sales_payment (
  id bigserial primary key,
  import_id uuid not null references public.imports_subway(id) on delete cascade,
  row_number integer not null,
  fecha date not null,
  forma_pago text not null,
  importe numeric(18,2) not null default 0,
  operaciones integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint sales_payment_source_row_unique unique (import_id, row_number),
  constraint sales_payment_importe_non_negative check (importe >= 0),
  constraint sales_payment_operaciones_non_negative check (operaciones >= 0)
);

create table if not exists public.raw_ax_rows (
  id bigserial primary key,
  import_id uuid not null references public.imports_subway(id) on delete cascade,
  row_number integer not null,
  payload jsonb not null,
  parse_status text not null check (parse_status in ('valid', 'error')),
  parse_errors text[] not null default '{}'::text[],
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.dim_clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  ruc text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.dim_sectores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique
);

create table if not exists public.dim_negocios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique
);

create table if not exists public.dim_lineas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique
);

create table if not exists public.dim_ejecutivos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  email text
);

create table if not exists public.fact_comercial (
  id bigserial primary key,
  import_id uuid not null references public.imports_subway(id) on delete restrict,
  situacion text,
  fecha_registro date,
  fecha_adjudicacion date,
  fecha_facturacion date,
  anio integer,
  mes integer,
  trimestre integer,
  semana integer,
  orden_venta text,
  factura text,
  oc text,
  cliente_id uuid references public.dim_clientes(id),
  sector_id uuid references public.dim_sectores(id),
  negocio_id uuid references public.dim_negocios(id),
  linea_id uuid references public.dim_lineas(id),
  proyecto text,
  codigo_articulo text,
  articulo text,
  cantidad numeric(18,4),
  um text,
  etapa text,
  motivo_perdida text,
  tipo_pipeline text,
  licitacion_flag boolean not null default false,
  probabilidad_num numeric(8,6),
  ventas_monto numeric(18,2),
  proyeccion_monto numeric(18,2),
  forecast_ponderado numeric(18,2),
  aging_dias integer,
  flag_cliente_nuevo boolean not null default false,
  ejecutivo_id uuid references public.dim_ejecutivos(id),
  observaciones text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.user_scopes
  add constraint user_scopes_negocio_fk foreign key (negocio_id) references public.dim_negocios(id);
alter table public.user_scopes
  add constraint user_scopes_linea_fk foreign key (linea_id) references public.dim_lineas(id);
alter table public.user_scopes
  add constraint user_scopes_sector_fk foreign key (sector_id) references public.dim_sectores(id);
alter table public.user_scopes
  add constraint user_scopes_ejecutivo_fk foreign key (ejecutivo_id) references public.dim_ejecutivos(id);

create index if not exists idx_imports_subway_uploaded_by on public.imports_subway(uploaded_by, uploaded_at desc);
create index if not exists idx_imports_subway_anio on public.imports_subway(anio, uploaded_at desc);
create index if not exists idx_sales_product_fecha on public.sales_product(fecha);
create index if not exists idx_sales_product_producto on public.sales_product(producto);
create index if not exists idx_sales_product_categoria on public.sales_product(categoria);
create index if not exists idx_sales_product_import_id on public.sales_product(import_id);
create index if not exists idx_sales_payment_fecha on public.sales_payment(fecha);
create index if not exists idx_sales_payment_forma_pago on public.sales_payment(forma_pago);
create index if not exists idx_sales_payment_import_id on public.sales_payment(import_id);
create index if not exists idx_accounting_imports_uploaded_by on public.accounting_imports(uploaded_by, uploaded_at desc);
create index if not exists idx_accounting_imports_anio on public.accounting_imports(anio, uploaded_at desc);
create index if not exists idx_raw_ax_rows_import_id on public.raw_ax_rows(import_id, row_number);
create index if not exists idx_raw_ax_rows_payload_gin on public.raw_ax_rows using gin(payload);
create index if not exists idx_fact_comercial_dates on public.fact_comercial(anio, mes, fecha_registro);
create index if not exists idx_fact_comercial_cliente on public.fact_comercial(cliente_id);
create index if not exists idx_fact_comercial_sector on public.fact_comercial(sector_id);
create index if not exists idx_fact_comercial_negocio on public.fact_comercial(negocio_id);
create index if not exists idx_fact_comercial_linea on public.fact_comercial(linea_id);
create index if not exists idx_fact_comercial_ejecutivo on public.fact_comercial(ejecutivo_id);
create index if not exists idx_fact_comercial_etapa on public.fact_comercial(etapa);

with source_rows as (
  select
    i.id as import_id,
    i.fecha,
    (row_item ->> 'row_number')::integer as row_number,
    row_item -> 'payload' as payload
  from public.imports_subway i
  cross join lateral jsonb_array_elements(coalesce(i.data -> 'rows', '[]'::jsonb)) as row_item
  where i.source_key = 'ax-commercial'
    and i.fecha is not null
    and coalesce(row_item ->> 'parse_status', 'valid') = 'valid'
),
normalized as (
  select
    import_id,
    fecha,
    row_number,
    nullif(payload ->> 'referencia', '') as referencia,
    coalesce(nullif(payload ->> 'descripcion', ''), nullif(payload ->> 'articulo', '')) as producto,
    upper(
      translate(
        coalesce(nullif(payload ->> 'descripcion', ''), nullif(payload ->> 'articulo', '')),
        'ÁÉÍÓÚáéíóúÑñ',
        'AEIOUaeiouNn'
      )
    ) as producto_normalizado,
    case
      when coalesce(payload ->> 'unidades', payload ->> 'cantidad') ~ '^-?[0-9]+([.,][0-9]+)?$'
        then replace(coalesce(payload ->> 'unidades', payload ->> 'cantidad'), ',', '.')::numeric
      else 0
    end as unidades,
    case
      when coalesce(payload ->> 'total', payload ->> 'ventas_monto') ~ '^-?[0-9]+([.,][0-9]+)?$'
        then replace(coalesce(payload ->> 'total', payload ->> 'ventas_monto'), ',', '.')::numeric
      else 0
    end as ventas
  from source_rows
)
insert into public.sales_product (
  import_id,
  row_number,
  fecha,
  referencia,
  producto,
  categoria,
  unidades,
  ventas
)
select
  import_id,
  row_number,
  fecha,
  referencia,
  producto,
  case
    when producto_normalizado like '%COMBO%' then 'COMBO'
    when producto_normalizado like '%BEBIDA%' or producto_normalizado like '%GASEOSA%' or producto_normalizado like '%AGUA%' then 'BEBIDA'
    when producto_normalizado like '%EXTRA%' or producto_normalizado like '%ADICIONAL%' then 'EXTRA'
    when producto_normalizado like '%SUB%' then 'SUB'
    else 'OTROS'
  end as categoria,
  greatest(unidades, 0),
  greatest(ventas, 0)
from normalized
where producto is not null
on conflict (import_id, row_number) do update
set
  fecha = excluded.fecha,
  referencia = excluded.referencia,
  producto = excluded.producto,
  categoria = excluded.categoria,
  unidades = excluded.unidades,
  ventas = excluded.ventas;

with source_rows as (
  select
    i.id as import_id,
    i.fecha,
    (row_item ->> 'row_number')::integer as row_number,
    row_item -> 'payload' as payload
  from public.imports_subway i
  cross join lateral jsonb_array_elements(coalesce(i.data -> 'rows', '[]'::jsonb)) as row_item
  where i.source_key = 'ax_forma_pedido'
    and i.fecha is not null
    and coalesce(row_item ->> 'parse_status', 'valid') = 'valid'
),
normalized as (
  select
    import_id,
    fecha,
    row_number,
    nullif(payload ->> 'forma_pago', '') as forma_pago,
    case
      when payload ->> 'importe' ~ '^-?[0-9]+([.,][0-9]+)?$'
        then replace(payload ->> 'importe', ',', '.')::numeric
      else 0
    end as importe,
    case
      when payload ->> 'numero_operaciones' ~ '^-?[0-9]+([.,][0-9]+)?$'
        then replace(payload ->> 'numero_operaciones', ',', '.')::numeric::integer
      else 0
    end as operaciones
  from source_rows
)
insert into public.sales_payment (
  import_id,
  row_number,
  fecha,
  forma_pago,
  importe,
  operaciones
)
select
  import_id,
  row_number,
  fecha,
  forma_pago,
  greatest(importe, 0),
  greatest(operaciones, 0)
from normalized
where forma_pago is not null
on conflict (import_id, row_number) do update
set
  fecha = excluded.fecha,
  forma_pago = excluded.forma_pago,
  importe = excluded.importe,
  operaciones = excluded.operaciones;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
as $$
  select role from public.profiles_subway where id = auth.uid()
$$;

create or replace function public.is_managerial_role()
returns boolean
language sql
stable
as $$
  select coalesce(public.current_app_role() in ('administrador_comercial', 'gerente_comercial', 'directorio'), false)
$$;

create or replace function public.can_upload_imports()
returns boolean
language sql
stable
as $$
  select coalesce(public.current_app_role() in ('administrador_comercial'), false)
$$;

create or replace function public.has_fact_scope(
  fact_negocio_id uuid,
  fact_linea_id uuid,
  fact_sector_id uuid,
  fact_ejecutivo_id uuid
)
returns boolean
language sql
stable
as $$
  select
    public.is_managerial_role()
    or exists (
      select 1
      from public.user_scopes us
      where us.user_id = auth.uid()
        and (us.negocio_id is null or us.negocio_id = fact_negocio_id)
        and (us.linea_id is null or us.linea_id = fact_linea_id)
        and (us.sector_id is null or us.sector_id = fact_sector_id)
        and (us.ejecutivo_id is null or us.ejecutivo_id = fact_ejecutivo_id)
    )
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles_subway (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::public.app_role, 'ejecutivo_ventas')
  )
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace view public.vw_kpi_overview as
select
  coalesce(sum(ventas_monto), 0) as ventas_totales,
  coalesce(sum(case when fecha_facturacion is not null then ventas_monto else 0 end), 0) as facturado,
  coalesce(sum(case when fecha_facturacion is null and situacion ilike '%backlog%' then ventas_monto else 0 end), 0) as backlog,
  coalesce(sum(case when fecha_facturacion is null then ventas_monto else 0 end), 0) as pipeline_abierto,
  coalesce(sum(forecast_ponderado), 0) as forecast_ponderado,
  coalesce(avg(nullif(ventas_monto, 0)), 0) as ticket_promedio,
  coalesce(sum(case when situacion ilike '%ganad%' then 1 else 0 end), 0) as oportunidades_ganadas,
  coalesce(sum(case when situacion ilike '%perdid%' then 1 else 0 end), 0) as oportunidades_perdidas
from public.fact_comercial
where public.has_fact_scope(negocio_id, linea_id, sector_id, ejecutivo_id);

create or replace view public.vw_sales_by_month as
select
  anio,
  mes,
  trim(to_char(make_date(anio, mes, 1), 'Mon')) as month_label,
  coalesce(sum(ventas_monto), 0) as ventas,
  coalesce(sum(forecast_ponderado), 0) as forecast
from public.fact_comercial
where public.has_fact_scope(negocio_id, linea_id, sector_id, ejecutivo_id)
group by anio, mes
order by anio, mes;

create or replace view public.vw_pipeline_by_stage as
select
  coalesce(etapa, 'Sin etapa') as etapa,
  coalesce(sum(ventas_monto), 0) as ventas
from public.fact_comercial
where public.has_fact_scope(negocio_id, linea_id, sector_id, ejecutivo_id)
group by 1
order by 2 desc;

create or replace view public.vw_sales_product_daily as
select
  fecha,
  sum(ventas) as ventas,
  sum(unidades) as unidades,
  case
    when sum(unidades) > 0 then sum(ventas) / sum(unidades)
    else 0
  end as ticket_promedio
from public.sales_product
group by fecha;

create or replace view public.vw_sales_product_ranking as
select
  producto,
  referencia,
  categoria,
  sum(ventas) as ventas,
  sum(unidades) as unidades,
  case
    when sum(unidades) > 0 then sum(ventas) / sum(unidades)
    else 0
  end as ticket_promedio
from public.sales_product
group by producto, referencia, categoria;

create or replace view public.vw_sales_product_category as
select
  categoria,
  sum(ventas) as ventas,
  sum(unidades) as unidades,
  case
    when sum(unidades) > 0 then sum(ventas) / sum(unidades)
    else 0
  end as ticket_promedio
from public.sales_product
group by categoria;

create or replace view public.vw_sales_payment_channel as
select
  forma_pago,
  sum(importe) as importe,
  sum(operaciones) as operaciones,
  case
    when sum(operaciones) > 0 then sum(importe) / sum(operaciones)
    else 0
  end as ticket_promedio_canal
from public.sales_payment
group by forma_pago;

create or replace view public.vw_sales_payment_daily_channel as
select
  fecha,
  forma_pago,
  sum(importe) as importe,
  sum(operaciones) as operaciones,
  case
    when sum(operaciones) > 0 then sum(importe) / sum(operaciones)
    else 0
  end as ticket_promedio_canal
from public.sales_payment
group by fecha, forma_pago;

create or replace view public.vw_sales_reconciliation_daily as
with product_daily as (
  select
    fecha,
    sum(ventas) as ventas_productos,
    sum(unidades) as unidades
  from public.sales_product
  group by fecha
),
payment_daily as (
  select
    fecha,
    sum(importe) as importe_pagos,
    sum(operaciones) as operaciones
  from public.sales_payment
  group by fecha
)
select
  coalesce(p.fecha, y.fecha) as fecha,
  coalesce(p.ventas_productos, 0) as ventas_productos,
  coalesce(y.importe_pagos, 0) as importe_pagos,
  coalesce(p.unidades, 0) as unidades,
  coalesce(y.operaciones, 0) as operaciones,
  coalesce(p.ventas_productos, 0) - coalesce(y.importe_pagos, 0) as diferencia,
  case
    when coalesce(p.ventas_productos, 0) = 0 then null
    else (
      coalesce(p.ventas_productos, 0) - coalesce(y.importe_pagos, 0)
    ) / nullif(p.ventas_productos, 0)
  end as diferencia_pct
from product_daily p
full outer join payment_daily y
  on y.fecha = p.fecha;

alter table public.profiles_subway enable row level security;
alter table public.user_scopes enable row level security;
alter table public.imports_subway enable row level security;
alter table public.accounting_imports enable row level security;
alter table public.raw_ax_rows enable row level security;
alter table public.dim_clientes enable row level security;
alter table public.dim_sectores enable row level security;
alter table public.dim_negocios enable row level security;
alter table public.dim_lineas enable row level security;
alter table public.dim_ejecutivos enable row level security;
alter table public.fact_comercial enable row level security;

create policy "profiles_self_or_manager"
on public.profiles_subway for select
to authenticated
using (auth.uid() = id or public.is_managerial_role());

create policy "profiles_self_update"
on public.profiles_subway for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "scopes_self_or_manager"
on public.user_scopes for select
to authenticated
using (user_id = auth.uid() or public.is_managerial_role());

create policy "imports_role_access"
on public.imports_subway for select
to authenticated
using (
  uploaded_by = auth.uid()
  or public.can_upload_imports()
  or public.is_managerial_role()
);

create policy "imports_insert_uploaders"
on public.imports_subway for insert
to authenticated
with check (
  uploaded_by = auth.uid() and public.can_upload_imports()
);

create policy "accounting_imports_role_access"
on public.accounting_imports for select
to authenticated
using (
  uploaded_by = auth.uid()
  or public.can_upload_imports()
  or public.is_managerial_role()
);

create policy "accounting_imports_insert_uploaders"
on public.accounting_imports for insert
to authenticated
with check (
  uploaded_by = auth.uid() and public.can_upload_imports()
);

create policy "raw_rows_manager_or_owner"
on public.raw_ax_rows for select
to authenticated
using (
  public.is_managerial_role()
  or exists (
    select 1 from public.imports_subway i
    where i.id = raw_ax_rows.import_id
      and i.uploaded_by = auth.uid()
  )
);

create policy "dim_clientes_authenticated"
on public.dim_clientes for select to authenticated using (true);
create policy "dim_sectores_authenticated"
on public.dim_sectores for select to authenticated using (true);
create policy "dim_negocios_authenticated"
on public.dim_negocios for select to authenticated using (true);
create policy "dim_lineas_authenticated"
on public.dim_lineas for select to authenticated using (true);
create policy "dim_ejecutivos_authenticated"
on public.dim_ejecutivos for select to authenticated using (true);

create policy "fact_scope_access"
on public.fact_comercial for select
to authenticated
using (public.has_fact_scope(negocio_id, linea_id, sector_id, ejecutivo_id));

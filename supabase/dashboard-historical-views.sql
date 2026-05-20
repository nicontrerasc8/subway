create or replace view public.v_historical_subway_fact as
select
  hm.id,
  hm.fecha,
  hm.anio,
  hm.semana,
  hm.dia_semana,
  hm.sucursal_id,
  s.nombre as sucursal,
  hm.metrica,
  hm.valor,
  hm.source_key,
  hm.source_file_name,
  hm.source_sheet_name,
  hm.created_at
from public.historical_metrics_subway hm
join public.sucursales_subway s on s.id = hm.sucursal_id;

create or replace view public.v_historical_subway_daily_branch as
select
  hm.fecha,
  hm.anio,
  hm.semana,
  hm.dia_semana,
  hm.sucursal_id,
  s.nombre as sucursal,
  coalesce(sum(hm.valor) filter (where hm.metrica = 'VENTA_TOTAL'), 0) as venta_total,
  coalesce(sum(hm.valor) filter (where hm.metrica = 'VENTA_SALON'), 0) as venta_salon,
  coalesce(sum(hm.valor) filter (where hm.metrica = 'VENTA_DELIVERY'), 0) as venta_delivery,
  coalesce(sum(hm.valor) filter (where hm.metrica = 'CLIENTES_TOTAL'), 0) as clientes_total,
  coalesce(sum(hm.valor) filter (where hm.metrica = 'CLIENTES_SALON'), 0) as clientes_salon,
  coalesce(sum(hm.valor) filter (where hm.metrica = 'CLIENTES_DELIVERY'), 0) as clientes_delivery,
  case
    when coalesce(sum(hm.valor) filter (where hm.metrica = 'CLIENTES_TOTAL'), 0) > 0
      then coalesce(sum(hm.valor) filter (where hm.metrica = 'VENTA_TOTAL'), 0)
        / nullif(coalesce(sum(hm.valor) filter (where hm.metrica = 'CLIENTES_TOTAL'), 0), 0)
    else 0
  end as ticket_promedio
from public.historical_metrics_subway hm
join public.sucursales_subway s on s.id = hm.sucursal_id
group by
  hm.fecha,
  hm.anio,
  hm.semana,
  hm.dia_semana,
  hm.sucursal_id,
  s.nombre;

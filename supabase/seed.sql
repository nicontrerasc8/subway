insert into public.dim_negocios (nombre)
values ('Industrial'), ('Energia')
on conflict (nombre) do nothing;

insert into public.dim_lineas (nombre)
values ('Transformadores'), ('Tableros')
on conflict (nombre) do nothing;

insert into public.dim_sectores (nombre)
values ('Mineria'), ('Manufactura')
on conflict (nombre) do nothing;

insert into public.dim_ejecutivos (nombre, email)
values ('Ana Vega', 'ana.vega@subway.pe'), ('Luis Prado', 'luis.prado@subway.pe')
on conflict (nombre) do nothing;

insert into public.dim_clientes (nombre, ruc)
values ('Minera Sierra Azul', '20100011122'), ('Textiles del Pacifico', '20444333211')
on conflict (nombre) do nothing;

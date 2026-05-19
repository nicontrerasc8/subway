-- Amplia el enum usado por public.profiles_subway.role para usuarios limitados
-- a una sola sucursal. Cada valor sucursal_N puede cargar/ver/editar solo
-- imports_subway.sucursal_id = N en la aplicacion.

alter type public.app_role add value if not exists 'sucursal_1';
alter type public.app_role add value if not exists 'sucursal_2';
alter type public.app_role add value if not exists 'sucursal_3';
alter type public.app_role add value if not exists 'sucursal_4';
alter type public.app_role add value if not exists 'sucursal_5';
alter type public.app_role add value if not exists 'sucursal_6';
alter type public.app_role add value if not exists 'sucursal_7';

-- Ejemplo:
-- update public.profiles_subway
-- set role = 'sucursal_3'::public.app_role
-- where email = 'usuario@sucursal3.com';

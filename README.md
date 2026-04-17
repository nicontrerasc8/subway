# Subway Command Center

Dashboard gerencial full-stack para carga manual de Excel exportado desde Microsoft AX, trazabilidad de importaciones y analitica comercial con control de acceso real por roles y scopes.

## Stack

- Next.js 16 App Router
- TypeScript estricto
- Tailwind CSS v4
- Componentes estilo shadcn/ui
- Supabase Auth, Postgres y RLS
- Recharts
- ExcelJS
- Zod
- React Hook Form instalado para siguientes modulos

## Estructura

```text
app/
  (auth)/login
  (app)/dashboard
  api/imports
  auth/callback
components/
  providers/
  ui/
lib/
  auth/
  supabase/
  types/
  validators/
modules/
  auth/
  imports/
supabase/
  schema.sql
  seed.sql
```

## Flujo implementado en esta fase

1. Login con Supabase Auth SSR.
2. Layout autenticado con sesion y sidebar.
3. Proxy de Next 16 para refresco de sesion.
4. Modulo de importaciones:
   - subida de Excel
   - descarga de plantilla `.xlsx`
   - anio de carga por lote en `imports`
   - parseo con ExcelJS
   - preview de columnas y filas
   - insercion en `imports`
   - trazabilidad fila a fila en `raw_ax_rows`
   - normalizacion e insercion en `fact_comercial`
   - edicion posterior de la importacion y de filas normalizadas
5. SQL de esquema, indices, vistas y politicas RLS.

## Instalacion

```bash
npm install
```

Copia `.env.example` a `.env.local` y completa tus credenciales de Supabase.

Aplica el SQL en este orden:

1. [`supabase/schema.sql`](/c:/Users/Nico/Documents/Programacion/subway/supabase/schema.sql)
2. Opcional: [`supabase/seed.sql`](/c:/Users/Nico/Documents/Programacion/subway/supabase/seed.sql)

Luego inicia la app:

```bash
npm run dev
```

## Supuestos documentados

- La carga actual corre de forma sincronica dentro del request. Para archivos muy grandes o cargas concurrentes altas, la siguiente evolucion recomendada es mover el procesamiento a un job asyncrono con cola y worker.
- El parseo actual toma la primera hoja del Excel y asume encabezados en la fila 1.
- La normalizacion inicial resuelve catalogos por nombre y hace `upsert` de dimensiones. Si AX entrega claves maestras estables, conviene migrar a claves de negocio explicitas.
- `fact_comercial.flag_cliente_nuevo` queda preparado pero en esta fase se inicializa en `false`.

## Variables de entorno

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

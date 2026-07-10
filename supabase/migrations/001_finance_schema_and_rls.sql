-- =============================================================================
-- 001_finance_schema_and_rls.sql
-- Módulo Finanzas: esquema persistible + Row Level Security.
--
-- ESTADO: PREPARADA, NO EJECUTADA. Revisar y aplicar manualmente en el
-- SQL Editor de Supabase (el editor corre como postgres, que bypassa RLS).
--
-- Fuente del modelo: app/finanzas/lib/schema.sql (se conserva como referencia
-- de dominio; este archivo agrega idempotencia, índices FK faltantes, RLS y
-- el procedimiento seguro de vinculación con Supabase Auth).
--
-- Modelo de seguridad (dos usuarios familiares, patrimonio compartido):
--   * Solo sesiones autenticadas Y vinculadas a una fila de public.users
--     (via auth_user_id) acceden a datos financieros.
--   * Piero y Consu ven TODO el patrimonio familiar (lectura total).
--   * Ambos insertan eventos, pero registrado_por_user_id debe ser SU propio
--     usuario interno (derivado de auth.uid()): no se puede suplantar autoría.
--   * Tablas de eventos: append-only (sin políticas UPDATE/DELETE ⇒ negado).
--   * public.users no tiene políticas de escritura: filas y auth_user_id se
--     administran solo desde el SQL Editor (service role / postgres).
--
-- Este archivo NO contiene contraseñas, claves service_role ni UUID reales.
-- =============================================================================


-- ── a) Extensiones y tipos ───────────────────────────────────────────────────
-- gen_random_uuid() es nativa desde Postgres 13; pgcrypto queda como resguardo
-- inocuo. No se definen ENUMs: los CHECK de texto reflejan 1:1 las uniones
-- discriminadas de app/finanzas/lib/types.ts y son más simples de evolucionar.

create extension if not exists pgcrypto;


-- ── b) Tablas (con c: constraints inline) ────────────────────────────────────
-- Las constraints (PK, FK, CHECK, UNIQUE) van inline en el CREATE TABLE: con
-- "if not exists" la tabla se crea completa o se omite completa, que es la
-- forma idempotente sin recurrir a bloques DO. Si una tabla ya existiera con
-- otra forma, este archivo NO la corrige: debe revisarse manualmente.

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  -- Vínculo 1:1 con Supabase Auth. UNIQUE garantiza que una cuenta Auth solo
  -- puede estar ligada a un usuario interno. ON DELETE SET NULL: si la cuenta
  -- Auth se elimina, el usuario interno y su historial de eventos permanecen
  -- (difiere de schema.sql, que usa NO ACTION y bloquearía el borrado).
  auth_user_id uuid unique references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Autoría de eventos: cada tabla *_events guarda registrado_por_user_id, la
-- persona que ingresó el evento en la app. No confundir con el titular de un
-- DAP ni con el dueño de una bolsa Fintual.

-- ── DAP ──
create table if not exists public.daps (
  id uuid primary key default gen_random_uuid(),
  banco text not null,
  titular_user_id uuid not null references public.users (id),
  created_at timestamptz not null default now()
);

create table if not exists public.dap_events (
  id uuid primary key default gen_random_uuid(),
  dap_id uuid not null references public.daps (id),
  fecha date not null,
  tipo text not null check (tipo in ('apertura', 'renovacion', 'retiro', 'cierre')),
  -- apertura:   monto_total, dias, tasa
  -- renovacion: monto_total (nuevo total), aporte (0 si solo renueva), dias, tasa
  -- retiro:     monto, razon
  -- cierre:     nota
  monto_total bigint check (monto_total >= 0),
  aporte bigint check (aporte >= 0),
  monto bigint check (monto > 0),
  dias integer check (dias > 0),
  tasa numeric(8, 4) check (tasa >= 0), -- % del período
  razon text,
  nota text,
  registrado_por_user_id uuid not null references public.users (id),
  created_at timestamptz not null default now(),
  -- Cada tipo exige sus campos y prohíbe los ajenos.
  check (
    (tipo = 'apertura'
      and monto_total is not null and dias is not null and tasa is not null
      and aporte is null and monto is null and razon is null and nota is null)
    or (tipo = 'renovacion'
      and monto_total is not null and aporte is not null and dias is not null and tasa is not null
      and monto is null and razon is null and nota is null)
    or (tipo = 'retiro'
      and monto is not null
      and monto_total is null and aporte is null and dias is null and tasa is null and nota is null)
    or (tipo = 'cierre'
      and monto_total is null and aporte is null and monto is null
      and dias is null and tasa is null and razon is null)
  )
);

-- ── Fintual ──
create table if not exists public.fintual_goals (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null check (tipo in ('grupal', 'personal')),
  created_at timestamptz not null default now()
);

create table if not exists public.fintual_goal_bags (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.fintual_goals (id),
  user_id uuid not null references public.users (id),
  created_at timestamptz not null default now(),
  unique (goal_id, user_id),
  -- Clave redundante (id ya es única) que habilita la FK compuesta de
  -- fintual_events: referencia la bolsa JUNTO con su objetivo.
  unique (id, goal_id)
);

create table if not exists public.fintual_events (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.fintual_goals (id),
  fecha date not null,
  tipo text not null check (tipo in ('deposito', 'retiro', 'variacion')),
  -- deposito/retiro: bag_id, monto, nota
  -- variacion:       variacion_total (nunca lleva bag_id: es del objetivo)
  bag_id uuid,
  monto bigint check (monto > 0),
  variacion_total bigint, -- puede ser negativo: pérdida acumulada declarada
  nota text,
  registrado_por_user_id uuid not null references public.users (id),
  created_at timestamptz not null default now(),
  -- Coherencia goal/bolsa garantizada en la base: la bolsa referenciada debe
  -- pertenecer al mismo objetivo del evento (FK compuesta). Con bag_id null
  -- (variación) la FK no aplica, como corresponde.
  foreign key (bag_id, goal_id) references public.fintual_goal_bags (id, goal_id),
  check (
    (tipo in ('deposito', 'retiro')
      and bag_id is not null and monto is not null
      and variacion_total is null)
    or (tipo = 'variacion'
      and variacion_total is not null
      and bag_id is null and monto is null and nota is null)
  )
);

-- ── Caja ──
create table if not exists public.cash_boxes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.cash_box_events (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references public.cash_boxes (id),
  fecha date not null,
  tipo text not null check (tipo in ('aporte', 'gasto', 'ajuste')),
  -- aporte: monto, nota
  -- gasto:  monto, descripcion
  -- ajuste: nuevo_saldo, nota
  monto bigint check (monto > 0),
  nuevo_saldo bigint, -- puede ser negativo si la caja quedó sobregirada
  descripcion text,
  nota text,
  registrado_por_user_id uuid not null references public.users (id),
  created_at timestamptz not null default now(),
  check (
    (tipo = 'aporte'
      and monto is not null
      and nuevo_saldo is null and descripcion is null)
    or (tipo = 'gasto'
      and monto is not null and descripcion is not null
      and nuevo_saldo is null and nota is null)
    or (tipo = 'ajuste'
      and nuevo_saldo is not null
      and monto is null and descripcion is null)
  )
);


-- ── d) Índices ───────────────────────────────────────────────────────────────
-- Los de schema.sql más los índices FK que faltaban (titular, bolsas, bag_id):
-- sin ellos, cada verificación de FK y los joins por usuario escanean la tabla.

create index if not exists dap_events_dap_fecha
  on public.dap_events (dap_id, fecha, created_at);
create index if not exists dap_events_registrado_por
  on public.dap_events (registrado_por_user_id, fecha);
create index if not exists daps_titular_user
  on public.daps (titular_user_id);

create index if not exists fintual_events_goal_fecha
  on public.fintual_events (goal_id, fecha, created_at);
create index if not exists fintual_events_registrado_por
  on public.fintual_events (registrado_por_user_id, fecha);
create index if not exists fintual_events_bag
  on public.fintual_events (bag_id);
create index if not exists fintual_goal_bags_user
  on public.fintual_goal_bags (user_id);

create index if not exists cash_box_events_box_fecha
  on public.cash_box_events (box_id, fecha, created_at);
create index if not exists cash_box_events_registrado_por
  on public.cash_box_events (registrado_por_user_id, fecha);


-- ── e) Row Level Security ────────────────────────────────────────────────────
-- Habilitar RLS en TODAS las tablas financieras. Sin política aplicable, el
-- default es DENEGAR: anon queda fuera de todo, y authenticated solo puede lo
-- que las políticas de la sección g permitan explícitamente.

alter table public.users            enable row level security;
alter table public.daps             enable row level security;
alter table public.dap_events       enable row level security;
alter table public.fintual_goals    enable row level security;
alter table public.fintual_goal_bags enable row level security;
alter table public.fintual_events   enable row level security;
alter table public.cash_boxes       enable row level security;
alter table public.cash_box_events  enable row level security;


-- ── f) Función helper de seguridad ───────────────────────────────────────────
-- current_app_user_id(): traduce la sesión Auth al usuario interno.
--   auth.uid() → public.users.auth_user_id → public.users.id
-- Devuelve NULL si la sesión no está vinculada ⇒ toda política que la use
-- deniega automáticamente a cuentas Auth sin fila en public.users.
--
-- SECURITY DEFINER es necesario aquí: la política de SELECT sobre public.users
-- (sección g) exige sesión vinculada, y determinar la vinculación requiere
-- leer public.users. Con SECURITY INVOKER esa lectura interna quedaría sujeta
-- a la misma política que la invoca ⇒ recursión de RLS. Con SECURITY DEFINER
-- la función corre con los privilegios de su propietario (postgres, dueño de
-- la tabla, que como owner no está sujeto a RLS mientras no se active FORCE
-- ROW LEVEL SECURITY), así que resuelve el vínculo directamente y corta la
-- recursión.
--
-- No permite escalamiento de privilegios: no acepta parámetros y solo devuelve
-- el id interno asociado al auth.uid() del JWT de la sesión actual. Un
-- invocador no puede pedirle el id de otra persona ni leer ninguna otra
-- columna o fila a través de ella.
-- search_path vacío + referencias calificadas: inmune a suplantación de schema.
-- STABLE: se evalúa una vez por statement, no por fila.

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id
  from public.users u
  where u.auth_user_id = (select auth.uid());
$$;

-- Propietario explícito según el patrón estándar de Supabase/Postgres:
-- postgres, el rol que ejecuta las migraciones y posee las tablas; es el rol
-- con cuyos privilegios corre la función por ser SECURITY DEFINER.
alter function public.current_app_user_id() owner to postgres;

revoke execute on function public.current_app_user_id() from public, anon;
grant execute on function public.current_app_user_id() to authenticated;


-- ── g) Políticas ─────────────────────────────────────────────────────────────
-- Todas "to authenticated": anon no tiene ninguna política ⇒ negado total.
-- DROP IF EXISTS + CREATE para que el bloque sea re-ejecutable.

-- public.users — lectura solo para sesiones vinculadas; SIN escritura.
--
-- La política llama a current_app_user_id() (SECURITY DEFINER, sección f):
-- la función resuelve la vinculación con los privilegios de su propietario,
-- así que su consulta interna a public.users NO pasa por esta política y no
-- hay recursión de RLS. Piero y Consu (vinculados) leen las dos filas
-- necesarias para mostrar titulares y autores; una cuenta Auth sin fila en
-- public.users obtiene NULL y no puede leer ninguna.
--
-- Sin políticas INSERT/UPDATE/DELETE: nadie puede crear usuarios ni tocar
-- auth_user_id desde el cliente. La vinculación se hace solo en el SQL Editor
-- (sección h).
drop policy if exists users_select on public.users;
create policy users_select on public.users
  for select to authenticated
  using (public.current_app_user_id() is not null);

-- Tablas maestras (daps, fintual_goals, fintual_goal_bags, cash_boxes):
-- lectura e inserción para usuarios vinculados. INSERT está justificado
-- porque la app crea bolsas Fintual y la caja al vuelo (ensureBag/ensureCaja
-- en app/finanzas/lib/commands.ts); daps y fintual_goals se incluyen por
-- simetría para el alta futura de instrumentos desde la app.
-- SIN UPDATE/DELETE: las entidades son identificadores estables; si mañana
-- hiciera falta renombrar, se agrega una política UPDATE explícita limitada
-- a las columnas de nombre (decisión separada, no se anticipa aquí).

drop policy if exists daps_select on public.daps;
create policy daps_select on public.daps
  for select to authenticated
  using (public.current_app_user_id() is not null);

drop policy if exists daps_insert on public.daps;
create policy daps_insert on public.daps
  for insert to authenticated
  with check (public.current_app_user_id() is not null);

drop policy if exists fintual_goals_select on public.fintual_goals;
create policy fintual_goals_select on public.fintual_goals
  for select to authenticated
  using (public.current_app_user_id() is not null);

drop policy if exists fintual_goals_insert on public.fintual_goals;
create policy fintual_goals_insert on public.fintual_goals
  for insert to authenticated
  with check (public.current_app_user_id() is not null);

drop policy if exists fintual_goal_bags_select on public.fintual_goal_bags;
create policy fintual_goal_bags_select on public.fintual_goal_bags
  for select to authenticated
  using (public.current_app_user_id() is not null);

drop policy if exists fintual_goal_bags_insert on public.fintual_goal_bags;
create policy fintual_goal_bags_insert on public.fintual_goal_bags
  for insert to authenticated
  with check (public.current_app_user_id() is not null);

drop policy if exists cash_boxes_select on public.cash_boxes;
create policy cash_boxes_select on public.cash_boxes
  for select to authenticated
  using (public.current_app_user_id() is not null);

drop policy if exists cash_boxes_insert on public.cash_boxes;
create policy cash_boxes_insert on public.cash_boxes
  for insert to authenticated
  with check (public.current_app_user_id() is not null);

-- Tablas de eventos (append-only): SELECT para vinculados; INSERT solo si el
-- autor declarado ES el usuario interno de la sesión. Si la sesión no está
-- vinculada, current_app_user_id() es NULL y la igualdad falla ⇒ negado.
-- Anti-suplantación: Piero no puede insertar un evento con el user_id interno
-- de Consu — la base lo rechaza aunque el cliente lo intente, porque el WITH
-- CHECK compara contra auth.uid() del JWT, que el cliente no puede falsificar.
-- SIN políticas UPDATE/DELETE ⇒ el historial es inmutable desde el cliente;
-- los errores se corrigen con eventos compensatorios (retiro/ajuste/cierre).

drop policy if exists dap_events_select on public.dap_events;
create policy dap_events_select on public.dap_events
  for select to authenticated
  using (public.current_app_user_id() is not null);

drop policy if exists dap_events_insert on public.dap_events;
create policy dap_events_insert on public.dap_events
  for insert to authenticated
  with check (registrado_por_user_id = public.current_app_user_id());

drop policy if exists fintual_events_select on public.fintual_events;
create policy fintual_events_select on public.fintual_events
  for select to authenticated
  using (public.current_app_user_id() is not null);

drop policy if exists fintual_events_insert on public.fintual_events;
create policy fintual_events_insert on public.fintual_events
  for insert to authenticated
  with check (registrado_por_user_id = public.current_app_user_id());

drop policy if exists cash_box_events_select on public.cash_box_events;
create policy cash_box_events_select on public.cash_box_events
  for select to authenticated
  using (public.current_app_user_id() is not null);

drop policy if exists cash_box_events_insert on public.cash_box_events;
create policy cash_box_events_insert on public.cash_box_events
  for insert to authenticated
  with check (registrado_por_user_id = public.current_app_user_id());


-- ── h) Usuarios internos y vinculación con Auth (MANUAL, comentado) ──────────
-- Ejecutar DESPUÉS de la migración, en el SQL Editor de Supabase, reemplazando
-- los correos por los reales. NO se hardcodean UUID de Auth: se resuelven por
-- email dentro de la misma base al momento de ejecutar.
--
-- 1) Crear los usuarios internos (id interno generado por la base):
--
--    insert into public.users (nombre) values ('Piero'), ('Consu')
--    on conflict (nombre) do nothing;
--
-- 2) Vincular cada usuario interno con su cuenta Auth por email:
--
--    update public.users
--    set auth_user_id = (select id from auth.users where email = 'EMAIL_DE_PIERO')
--    where nombre = 'Piero' and auth_user_id is null;
--
--    update public.users
--    set auth_user_id = (select id from auth.users where email = 'EMAIL_DE_CONSU')
--    where nombre = 'Consu' and auth_user_id is null;
--
-- 3) Verificar (deben salir 2 filas, ambas con auth_user_id no nulo):
--
--    select nombre, auth_user_id is not null as vinculado from public.users;

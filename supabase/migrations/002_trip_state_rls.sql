-- =============================================================================
-- 002_trip_state_rls.sql
-- RECOMENDACIÓN MÍNIMA para proteger public.trip_state — NO EJECUTADA.
--
-- Contexto: trip_state fue creada directamente en Supabase (no hay DDL en el
-- repo) y la app la lee/escribe con el cliente anon (app/viajes/page.tsx:
-- select por trip_id y upsert de order_by_day/notes). Desde el repo NO es
-- posible confirmar si ya tiene RLS habilitado; verificar primero con:
--
--    select relrowsecurity
--    from pg_class
--    where oid = 'public.trip_state'::regclass;
--
-- Si devuelve false, la tabla es legible y escribible por CUALQUIERA que
-- tenga la anon key (que es pública por diseño). Como toda la app ya exige
-- Auth, lo mínimo es exigir sesión autenticada también en la base.
--
-- Deliberadamente separada de las políticas financieras: Viajes es estado
-- compartido del viaje sin autoría por evento, no necesita el mapeo a
-- public.users ni el modelo append-only. No se cambia estructura ni lógica.
-- =============================================================================

alter table public.trip_state enable row level security;

-- Lectura para cualquier sesión autenticada (Piero y Consu comparten el viaje).
drop policy if exists trip_state_select on public.trip_state;
create policy trip_state_select on public.trip_state
  for select to authenticated
  using (true);

-- La app persiste con upsert ⇒ necesita INSERT y UPDATE.
drop policy if exists trip_state_insert on public.trip_state;
create policy trip_state_insert on public.trip_state
  for insert to authenticated
  with check (true);

drop policy if exists trip_state_update on public.trip_state;
create policy trip_state_update on public.trip_state
  for update to authenticated
  using (true)
  with check (true);

-- Sin política DELETE: la app nunca borra el estado del viaje.
--
-- Endurecimiento pendiente (mismo espíritu que Finanzas): cambiar los
-- true por "public.current_app_user_id() is not null" DESPUÉS de aplicar
-- 001_finance_schema_and_rls.sql, para exigir además la vinculación con
-- public.users. Explícito: mientras eso no se haga, CUALQUIER cuenta Auth
-- — incluida una futura sin fila en public.users — tiene lectura y escritura
-- sobre Viajes con estas políticas. "authenticated" se acepta aquí solo como
-- recomendación mínima; Finanzas (001) ya exige la vinculación.

-- =============================================================================
-- 003_create_fintual_goal_rpc.sql
-- RPC atómica para crear un objetivo Fintual junto con sus bolsas.
--
-- ESTADO: PREPARADA, NO EJECUTADA. Revisar y aplicar manualmente en el
-- SQL Editor de Supabase.
--
-- Motivación: el alta de un objetivo requiere insertar en fintual_goals y en
-- fintual_goal_bags como una sola unidad. Hacerlo con inserts secuenciales
-- desde el cliente puede dejar un objetivo sin bolsas si el segundo insert
-- falla. Una función plpgsql corre en una única transacción: cualquier
-- RAISE EXCEPTION revierte también el objetivo ya insertado.
--
-- Modelo de seguridad:
--   * SECURITY INVOKER: la función corre con los privilegios del llamador,
--     así que TODOS los inserts/selects internos pasan por las políticas RLS
--     de 001 (fintual_goals_insert, fintual_goal_bags_insert, users_select).
--     La función no otorga ningún acceso que el llamador no tenga ya.
--   * Igual se valida la vinculación de sesión al inicio para fallar con un
--     mensaje claro en vez de con un error opaco de RLS.
--   * search_path vacío + referencias con schema explícito: inmune a
--     suplantación de schema.
--   * EXECUTE revocado a PUBLIC y anon; solo authenticated puede llamarla.
--
-- Esta migración NO crea tablas, índices ni políticas RLS nuevas.
-- =============================================================================

create or replace function public.create_fintual_goal(
  p_nombre text,
  p_tipo text,
  p_titular_user_id uuid default null
)
returns uuid
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_nombre text;
  v_goal_id uuid;
  v_bolsas integer;
begin
  -- Sesión autenticada Y vinculada a un usuario interno (misma condición que
  -- exigen las políticas RLS; aquí solo se anticipa con un error legible).
  if public.current_app_user_id() is null then
    raise exception 'sesión no vinculada a un usuario interno';
  end if;

  -- Nombre: obligatorio y no vacío tras trim. No se valida unicidad: no hay
  -- regla de producto que exija nombres únicos.
  v_nombre := trim(p_nombre);
  if v_nombre is null or v_nombre = '' then
    raise exception 'el nombre del objetivo no puede estar vacío';
  end if;

  -- Tipo: mismas variantes que el CHECK de fintual_goals.
  if p_tipo is null or p_tipo not in ('grupal', 'personal') then
    raise exception 'tipo de objetivo inválido (debe ser grupal o personal): %',
      coalesce(p_tipo, 'null');
  end if;

  -- Titular: exigido por 'personal', prohibido por 'grupal'.
  if p_tipo = 'personal' then
    if p_titular_user_id is null then
      raise exception 'un objetivo personal requiere titular';
    end if;
    if not exists (
      select 1 from public.users u where u.id = p_titular_user_id
    ) then
      raise exception 'el titular indicado no existe';
    end if;
  else
    if p_titular_user_id is not null then
      raise exception 'un objetivo grupal no admite titular';
    end if;
  end if;

  insert into public.fintual_goals (nombre, tipo)
  values (v_nombre, p_tipo)
  returning id into v_goal_id;

  if p_tipo = 'personal' then
    -- Exactamente una bolsa: la del titular.
    insert into public.fintual_goal_bags (goal_id, user_id)
    values (v_goal_id, p_titular_user_id);
    v_bolsas := 1;
  else
    -- Una bolsa por cada usuario interno existente.
    insert into public.fintual_goal_bags (goal_id, user_id)
    select v_goal_id, u.id
    from public.users u;
    get diagnostics v_bolsas = row_count;
  end if;

  -- Un objetivo sin bolsas es inválido: el RAISE aborta la transacción de la
  -- función y revierte también el insert en fintual_goals.
  if v_bolsas = 0 then
    raise exception 'no se creó ninguna bolsa; se revierte el objetivo';
  end if;

  return v_goal_id;
end;
$$;

-- CREATE FUNCTION otorga EXECUTE a PUBLIC por defecto: revocar explícitamente
-- y conceder solo a authenticated (mismo patrón que current_app_user_id en 001).
revoke execute on function public.create_fintual_goal(text, text, uuid)
  from public, anon;
grant execute on function public.create_fintual_goal(text, text, uuid)
  to authenticated;

// Capa de datos de Fintual: acceso a Supabase (public.fintual_goals,
// fintual_goal_bags, fintual_events) con el cliente compartido, la sesión
// actual y las políticas RLS de supabase/migrations/001_finance_schema_and_rls.sql.
//
// Reglas de esta capa (las mismas de cajaData.ts):
//   * Cada función es UNA operación (select / insert), sin lógica de UI.
//   * Solo lectura e inserción: el historial es append-only (RLS no permite
//     UPDATE ni DELETE desde el cliente).
//   * Objetivos y bolsas son SOLO LECTURA desde la app: se crean manualmente
//     en Supabase. Crear objetivo + bolsas exige una transacción (RPC) que
//     este esquema aún no tiene; hasta esa migración, la app no inserta en
//     fintual_goals ni fintual_goal_bags para no dejar estados a medias.
//   * El autor se resuelve con public.current_app_user_id()
//     (auth.uid() → users.auth_user_id → users.id); RLS rechaza cualquier
//     evento cuyo registrado_por_user_id no sea el usuario de la sesión.
//   * Sin service_role, sin UUID hardcodeados, sin realtime.
//
// listUsers y fetchCurrentAppUserId viven en cajaData.ts y son compartidas:
// leen public.users y la RPC current_app_user_id, que no pertenecen a ningún
// módulo en particular (useFintual.ts las importa de ahí).
//
// Mapeo SQL → TypeScript: goal_id → goalId, bag_id → bagId, user_id → userId,
// variacion_total → variacionTotal, registrado_por_user_id →
// registradoPorUserId, created_at → createdAt.

import { supabase } from "@/lib/supabase";
import type {
  FintualEvent,
  FintualGoalBag,
  FintualGoalRecord,
  UserId,
} from "./types";

// ── Filas SQL (snake_case, espejo de la migración 001) ───────────────────────

type FintualGoalRow = {
  id: string;
  nombre: string;
  tipo: string;
  created_at: string;
};

type FintualGoalBagRow = {
  id: string;
  goal_id: string;
  user_id: string;
  created_at: string;
};

type FintualEventRow = {
  id: string;
  goal_id: string;
  fecha: string;
  tipo: "deposito" | "retiro" | "variacion";
  bag_id: string | null;
  monto: number | null;
  variacion_total: number | null;
  nota: string | null;
  registrado_por_user_id: string;
  created_at: string;
};

// ── Mapeo a los tipos del dominio (types.ts) ─────────────────────────────────

// Fila que viola el contrato de su tipo. Los CHECK de la tabla deberían
// impedirlo; si aun así llega, se aborta el mapeo con un error claro en vez
// de degradar el campo a 0 / "" y alterar el balance silenciosamente.
function filaInvalida(
  row: { id: string; tipo: string },
  problema: string
): never {
  throw new Error(
    `Registro de Fintual inválido (id ${row.id}, tipo "${row.tipo}"): ${problema}.`
  );
}

function toFintualGoalRecord(row: FintualGoalRow): FintualGoalRecord {
  if (row.tipo !== "grupal" && row.tipo !== "personal") {
    filaInvalida(row, `tipo de objetivo desconocido ${JSON.stringify(row.tipo)}`);
  }
  return {
    id: row.id,
    nombre: row.nombre,
    tipo: row.tipo,
    createdAt: row.created_at,
  };
}

function toFintualGoalBag(row: FintualGoalBagRow): FintualGoalBag {
  return {
    id: row.id,
    goalId: row.goal_id,
    userId: row.user_id,
    createdAt: row.created_at,
  };
}

function montoDe(
  row: FintualEventRow,
  campo: "monto" | "variacion_total"
): number {
  const valor = campo === "monto" ? row.monto : row.variacion_total;
  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    filaInvalida(row, `${campo} debería ser un número y es ${JSON.stringify(valor)}`);
  }
  return valor;
}

function toFintualEvent(row: FintualEventRow): FintualEvent {
  const base = {
    id: row.id,
    goalId: row.goal_id,
    fecha: row.fecha,
    registradoPorUserId: row.registrado_por_user_id,
    createdAt: row.created_at,
  };
  switch (row.tipo) {
    case "deposito":
    case "retiro":
      if (typeof row.bag_id !== "string") {
        filaInvalida(row, "bag_id debería ser un uuid y es null");
      }
      return {
        ...base,
        tipo: row.tipo,
        bagId: row.bag_id,
        monto: montoDe(row, "monto"),
        nota: row.nota ?? undefined,
      };
    case "variacion":
      return {
        ...base,
        tipo: "variacion",
        variacionTotal: montoDe(row, "variacion_total"),
      };
    default:
      return filaInvalida(row, `tipo desconocido ${JSON.stringify(row.tipo)}`);
  }
}

function fail(accion: string, mensaje: string): never {
  throw new Error(`No se pudo ${accion} (${mensaje})`);
}

// ── Lecturas ─────────────────────────────────────────────────────────────────

// Objetivos ordenados por creación, para que la lista sea estable entre cargas.
export async function listFintualGoals(): Promise<FintualGoalRecord[]> {
  const { data, error } = await supabase
    .from("fintual_goals")
    .select("id, nombre, tipo, created_at")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) fail("cargar los objetivos de Fintual", error.message);
  return ((data ?? []) as FintualGoalRow[]).map(toFintualGoalRecord);
}

// Todas las bolsas (dos usuarios, pocos objetivos): se filtran por goal en
// memoria al proyectar, igual que hace projectFinanceState.
export async function listFintualGoalBags(): Promise<FintualGoalBag[]> {
  const { data, error } = await supabase
    .from("fintual_goal_bags")
    .select("id, goal_id, user_id, created_at")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) fail("cargar las bolsas de Fintual", error.message);
  return ((data ?? []) as FintualGoalBagRow[]).map(toFintualGoalBag);
}

// Eventos de todos los objetivos en orden determinístico (fecha, created_at,
// id): el balance se deriva plegándolos en este orden (derive.ts conserva el
// orden dentro de una misma fecha porque su sort es estable).
export async function listFintualEvents(): Promise<FintualEvent[]> {
  const { data, error } = await supabase
    .from("fintual_events")
    .select(
      "id, goal_id, fecha, tipo, bag_id, monto, variacion_total, nota, registrado_por_user_id, created_at"
    )
    .order("fecha", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) fail("cargar los movimientos de Fintual", error.message);
  return ((data ?? []) as FintualEventRow[]).map(toFintualEvent);
}

// ── Escrituras (solo INSERT de eventos, nunca UPDATE/DELETE) ─────────────────

export async function insertFintualDeposito(input: {
  goalId: string;
  bagId: string;
  fecha: string;
  monto: number;
  nota?: string;
  registradoPorUserId: UserId;
}): Promise<void> {
  const { error } = await supabase.from("fintual_events").insert({
    goal_id: input.goalId,
    fecha: input.fecha,
    tipo: "deposito",
    bag_id: input.bagId,
    monto: input.monto,
    nota: input.nota ?? null,
    registrado_por_user_id: input.registradoPorUserId,
  });
  if (error) fail("registrar el depósito", error.message);
}

export async function insertFintualRetiro(input: {
  goalId: string;
  bagId: string;
  fecha: string;
  monto: number;
  nota?: string;
  registradoPorUserId: UserId;
}): Promise<void> {
  const { error } = await supabase.from("fintual_events").insert({
    goal_id: input.goalId,
    fecha: input.fecha,
    tipo: "retiro",
    bag_id: input.bagId,
    monto: input.monto,
    nota: input.nota ?? null,
    registrado_por_user_id: input.registradoPorUserId,
  });
  if (error) fail("registrar el retiro", error.message);
}

export async function insertFintualVariacion(input: {
  goalId: string;
  fecha: string;
  variacionTotal: number;
  registradoPorUserId: UserId;
}): Promise<void> {
  const { error } = await supabase.from("fintual_events").insert({
    goal_id: input.goalId,
    fecha: input.fecha,
    tipo: "variacion",
    variacion_total: input.variacionTotal,
    registrado_por_user_id: input.registradoPorUserId,
  });
  if (error) fail("guardar la variación", error.message);
}

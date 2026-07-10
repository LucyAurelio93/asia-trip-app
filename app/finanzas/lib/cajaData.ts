// Capa de datos de Caja: acceso a Supabase (public.users, cash_boxes,
// cash_box_events) con el cliente compartido, la sesión actual y las
// políticas RLS de supabase/migrations/001_finance_schema_and_rls.sql.
//
// Reglas de esta capa:
//   * Cada función es UNA operación (select / insert / rpc), sin lógica de UI.
//   * Solo lectura e inserción: el historial es append-only (RLS no permite
//     UPDATE ni DELETE desde el cliente).
//   * El autor se resuelve con public.current_app_user_id()
//     (auth.uid() → users.auth_user_id → users.id); RLS rechaza cualquier
//     evento cuyo registrado_por_user_id no sea el usuario de la sesión.
//   * Sin service_role, sin UUID hardcodeados, sin realtime.
//
// Mapeo SQL → TypeScript: box_id → boxId, nuevo_saldo → nuevoSaldo,
// registrado_por_user_id → registradoPorUserId, created_at → createdAt.

import { supabase } from "@/lib/supabase";
import type {
  CashBoxEvent,
  CashBoxRecord,
  Person,
  User,
  UserId,
} from "./types";

// ── Filas SQL (snake_case, espejo de la migración 001) ───────────────────────

type UserRow = {
  id: string;
  nombre: string;
};

type CashBoxRow = {
  id: string;
  nombre: string;
  created_at: string;
};

type CashBoxEventRow = {
  id: string;
  box_id: string;
  fecha: string;
  tipo: "aporte" | "gasto" | "ajuste";
  monto: number | null;
  nuevo_saldo: number | null;
  descripcion: string | null;
  nota: string | null;
  registrado_por_user_id: string;
  created_at: string;
};

// ── Mapeo a los tipos del dominio (types.ts) ─────────────────────────────────

function toUser(row: UserRow): User {
  // users.nombre es text en la base; el dominio solo conoce a Piero y Consu.
  return { id: row.id, nombre: row.nombre as Person };
}

function toCashBoxRecord(row: CashBoxRow): CashBoxRecord {
  return { id: row.id, nombre: row.nombre, createdAt: row.created_at };
}

// Fila que viola el contrato de su tipo de evento. Los CHECK de la tabla
// deberían impedirlo; si aun así llega, se aborta el mapeo con un error claro
// en vez de degradar el campo a 0 / "" y alterar el saldo silenciosamente.
function filaInvalida(row: CashBoxEventRow, problema: string): never {
  throw new Error(
    `Movimiento de caja inválido (id ${row.id}, tipo "${row.tipo}"): ${problema}.`
  );
}

function montoDe(row: CashBoxEventRow, campo: "monto" | "nuevo_saldo"): number {
  const valor = campo === "monto" ? row.monto : row.nuevo_saldo;
  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    filaInvalida(row, `${campo} debería ser un número y es ${JSON.stringify(valor)}`);
  }
  return valor;
}

function toCashBoxEvent(row: CashBoxEventRow): CashBoxEvent {
  const base = {
    id: row.id,
    boxId: row.box_id,
    fecha: row.fecha,
    registradoPorUserId: row.registrado_por_user_id,
    createdAt: row.created_at,
  };
  switch (row.tipo) {
    case "aporte":
      return {
        ...base,
        tipo: "aporte",
        monto: montoDe(row, "monto"),
        nota: row.nota ?? undefined,
      };
    case "gasto":
      if (typeof row.descripcion !== "string") {
        filaInvalida(row, "descripcion debería ser texto y es null");
      }
      return {
        ...base,
        tipo: "gasto",
        monto: montoDe(row, "monto"),
        descripcion: row.descripcion,
      };
    case "ajuste":
      return {
        ...base,
        tipo: "ajuste",
        nuevoSaldo: montoDe(row, "nuevo_saldo"),
        nota: row.nota ?? undefined,
      };
    default:
      return filaInvalida(row, `tipo desconocido ${JSON.stringify(row.tipo)}`);
  }
}

function fail(accion: string, mensaje: string): never {
  throw new Error(`No se pudo ${accion} (${mensaje})`);
}

// ── Lecturas ─────────────────────────────────────────────────────────────────

// Usuarios internos (Piero y Consu), para mostrar quién registró cada evento.
export async function listUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from("users")
    .select("id, nombre")
    .order("nombre");
  if (error) fail("cargar los usuarios", error.message);
  return ((data ?? []) as UserRow[]).map(toUser);
}

// Cajas ordenadas por creación: la UI opera sobre la primera (la más antigua).
export async function listCashBoxes(): Promise<CashBoxRecord[]> {
  const { data, error } = await supabase
    .from("cash_boxes")
    .select("id, nombre, created_at")
    .order("created_at", { ascending: true });
  if (error) fail("cargar la caja", error.message);
  return ((data ?? []) as CashBoxRow[]).map(toCashBoxRecord);
}

// Eventos de una caja en orden determinístico (fecha, created_at, id): el
// saldo se deriva plegándolos en este orden (derive.ts conserva el orden
// dentro de una misma fecha porque su sort es estable).
export async function listCashBoxEvents(boxId: string): Promise<CashBoxEvent[]> {
  const { data, error } = await supabase
    .from("cash_box_events")
    .select(
      "id, box_id, fecha, tipo, monto, nuevo_saldo, descripcion, nota, registrado_por_user_id, created_at"
    )
    .eq("box_id", boxId)
    .order("fecha", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) fail("cargar los movimientos de la caja", error.message);
  return ((data ?? []) as CashBoxEventRow[]).map(toCashBoxEvent);
}

// Usuario interno de la sesión actual: auth.uid() → users.auth_user_id →
// users.id. Devuelve null si la cuenta Auth no está vinculada en public.users.
export async function fetchCurrentAppUserId(): Promise<UserId | null> {
  const { data, error } = await supabase.rpc("current_app_user_id");
  if (error) fail("identificar tu usuario", error.message);
  return (data as UserId | null) ?? null;
}

// ── Escrituras (solo INSERT, nunca UPDATE/DELETE) ────────────────────────────

export async function createCashBox(nombre: string): Promise<CashBoxRecord> {
  const { data, error } = await supabase
    .from("cash_boxes")
    .insert({ nombre })
    .select("id, nombre, created_at")
    .single();
  if (error) fail("crear la caja", error.message);
  return toCashBoxRecord(data as CashBoxRow);
}

export async function insertAporte(input: {
  boxId: string;
  fecha: string;
  monto: number;
  nota?: string;
  registradoPorUserId: UserId;
}): Promise<void> {
  const { error } = await supabase.from("cash_box_events").insert({
    box_id: input.boxId,
    fecha: input.fecha,
    tipo: "aporte",
    monto: input.monto,
    nota: input.nota ?? null,
    registrado_por_user_id: input.registradoPorUserId,
  });
  if (error) fail("registrar el aporte", error.message);
}

export async function insertGasto(input: {
  boxId: string;
  fecha: string;
  monto: number;
  descripcion: string;
  registradoPorUserId: UserId;
}): Promise<void> {
  const { error } = await supabase.from("cash_box_events").insert({
    box_id: input.boxId,
    fecha: input.fecha,
    tipo: "gasto",
    monto: input.monto,
    descripcion: input.descripcion,
    registrado_por_user_id: input.registradoPorUserId,
  });
  if (error) fail("registrar el gasto", error.message);
}

export async function insertAjuste(input: {
  boxId: string;
  fecha: string;
  nuevoSaldo: number;
  nota?: string;
  registradoPorUserId: UserId;
}): Promise<void> {
  const { error } = await supabase.from("cash_box_events").insert({
    box_id: input.boxId,
    fecha: input.fecha,
    tipo: "ajuste",
    nuevo_saldo: input.nuevoSaldo,
    nota: input.nota ?? null,
    registrado_por_user_id: input.registradoPorUserId,
  });
  if (error) fail("guardar el ajuste", error.message);
}

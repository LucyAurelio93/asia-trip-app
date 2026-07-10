// Comandos del módulo Finanzas: CÓMO SE REGISTRA.
//
// Cada acción de la UI se traduce en agregar UN evento al store. Los comandos
// nunca escriben saldos ni totales: eso se deriva en derive.ts. Este reducer
// es el punto que mañana se reemplaza por inserts a Supabase (mismas filas).

import type {
  CashBoxEvent,
  DapEvent,
  FinanceStore,
  FintualEvent,
  Person,
  UserId,
} from "./types";

// TEMPORAL: autor por defecto de todo evento nuevo. El login ya existe
// (lib/auth/AuthProvider.tsx expone la sesión vía useAuth()), pero Finanzas
// sigue sobre mocks. En la próxima fase, al conectar las tablas reales, este
// valor se reemplaza resolviendo la cadena:
//   session.user.id → users.auth_user_id → users.id → registradoPorUserId
// Es el único punto del módulo que decide quién registra.
const TEMP_ACTIVE_USER_ID: UserId = "user-piero";

export type FinanceAction =
  | {
      type: "dap/renovar";
      dapId: string;
      fecha: string;
      montoTotal: number;
      aporte: number;
      dias: number;
      tasa: number;
    }
  | { type: "dap/retirar"; dapId: string; fecha: string; monto: number; razon: string }
  | {
      type: "fintual/deposito";
      goalId: string;
      person: Person;
      fecha: string;
      monto: number;
    }
  | {
      type: "fintual/retiro";
      goalId: string;
      person: Person;
      fecha: string;
      monto: number;
      nota?: string;
    }
  | { type: "fintual/variacion"; goalId: string; fecha: string; nuevaVariacion: number }
  | { type: "caja/aporte"; fecha: string; monto: number; nota?: string }
  | { type: "caja/gasto"; fecha: string; monto: number; descripcion: string }
  | { type: "caja/ajuste"; fecha: string; nuevoSaldo: number; nota?: string };

function makeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Resuelve la bolsa de una persona en un objetivo, creando usuario y bolsa si
// no existen todavía (p. ej. primer depósito de esa persona en el objetivo).
function ensureBag(
  store: FinanceStore,
  goalId: string,
  person: Person
): Pick<FinanceStore, "users" | "fintualGoalBags"> & { bagId: string } {
  let users = store.users;
  let user = users.find((u) => u.nombre === person);
  if (!user) {
    user = { id: makeId(), nombre: person };
    users = [...users, user];
  }

  let fintualGoalBags = store.fintualGoalBags;
  let bag = fintualGoalBags.find((b) => b.goalId === goalId && b.userId === user.id);
  if (!bag) {
    bag = { id: makeId(), goalId, userId: user.id };
    fintualGoalBags = [...fintualGoalBags, bag];
  }

  return { users, fintualGoalBags, bagId: bag.id };
}

// La UI actual opera sobre una única caja ("Caja casa"): los comandos de caja
// aplican sobre la primera, creándola si el store partiera vacío.
function ensureCaja(
  store: FinanceStore
): Pick<FinanceStore, "cashBoxes"> & { boxId: string } {
  const box = store.cashBoxes[0];
  if (box) return { cashBoxes: store.cashBoxes, boxId: box.id };
  const nueva = { id: makeId(), nombre: "Caja casa" };
  return { cashBoxes: [nueva], boxId: nueva.id };
}

export function financeReducer(
  store: FinanceStore,
  action: FinanceAction
): FinanceStore {
  switch (action.type) {
    case "dap/renovar": {
      const event: DapEvent = {
        id: makeId(),
        dapId: action.dapId,
        fecha: action.fecha,
        tipo: "renovacion",
        montoTotal: action.montoTotal,
        aporte: action.aporte,
        dias: action.dias,
        tasa: action.tasa,
        registradoPorUserId: TEMP_ACTIVE_USER_ID,
      };
      return { ...store, dapEvents: [...store.dapEvents, event] };
    }

    case "dap/retirar": {
      const event: DapEvent = {
        id: makeId(),
        dapId: action.dapId,
        fecha: action.fecha,
        tipo: "retiro",
        monto: action.monto,
        razon: action.razon || undefined,
        registradoPorUserId: TEMP_ACTIVE_USER_ID,
      };
      return { ...store, dapEvents: [...store.dapEvents, event] };
    }

    case "fintual/deposito":
    case "fintual/retiro": {
      const { users, fintualGoalBags, bagId } = ensureBag(
        store,
        action.goalId,
        action.person
      );
      const event: FintualEvent = {
        id: makeId(),
        goalId: action.goalId,
        fecha: action.fecha,
        tipo: action.type === "fintual/deposito" ? "deposito" : "retiro",
        bagId,
        monto: action.monto,
        nota: "nota" in action ? action.nota || undefined : undefined,
        registradoPorUserId: TEMP_ACTIVE_USER_ID,
      };
      return {
        ...store,
        users,
        fintualGoalBags,
        fintualEvents: [...store.fintualEvents, event],
      };
    }

    case "fintual/variacion": {
      const event: FintualEvent = {
        id: makeId(),
        goalId: action.goalId,
        fecha: action.fecha,
        tipo: "variacion",
        variacionTotal: action.nuevaVariacion,
        registradoPorUserId: TEMP_ACTIVE_USER_ID,
      };
      return { ...store, fintualEvents: [...store.fintualEvents, event] };
    }

    case "caja/aporte": {
      const { cashBoxes, boxId } = ensureCaja(store);
      const event: CashBoxEvent = {
        id: makeId(),
        boxId,
        fecha: action.fecha,
        tipo: "aporte",
        monto: action.monto,
        nota: action.nota || undefined,
        registradoPorUserId: TEMP_ACTIVE_USER_ID,
      };
      return { ...store, cashBoxes, cashBoxEvents: [...store.cashBoxEvents, event] };
    }

    case "caja/gasto": {
      const { cashBoxes, boxId } = ensureCaja(store);
      const event: CashBoxEvent = {
        id: makeId(),
        boxId,
        fecha: action.fecha,
        tipo: "gasto",
        monto: action.monto,
        descripcion: action.descripcion,
        registradoPorUserId: TEMP_ACTIVE_USER_ID,
      };
      return { ...store, cashBoxes, cashBoxEvents: [...store.cashBoxEvents, event] };
    }

    case "caja/ajuste": {
      const { cashBoxes, boxId } = ensureCaja(store);
      const event: CashBoxEvent = {
        id: makeId(),
        boxId,
        fecha: action.fecha,
        tipo: "ajuste",
        nuevoSaldo: action.nuevoSaldo,
        nota: action.nota || undefined,
        registradoPorUserId: TEMP_ACTIVE_USER_ID,
      };
      return { ...store, cashBoxes, cashBoxEvents: [...store.cashBoxEvents, event] };
    }
  }
}

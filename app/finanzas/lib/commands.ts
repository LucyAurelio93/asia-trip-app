// Comandos del módulo Finanzas: CÓMO SE REGISTRA (solo DAP y Fintual).
//
// Cada acción de la UI se traduce en agregar UN evento al store. Los comandos
// nunca escriben saldos ni totales: eso se deriva en derive.ts. Este reducer
// es el punto que mañana se reemplaza por inserts a Supabase (mismas filas).
//
// Caja YA NO pasa por aquí: sus eventos se insertan en Supabase vía
// cajaData.ts/useCaja.ts, con autor real de la sesión. Este reducer queda
// solo para DAP y Fintual mientras sigan sobre mocks.

import type {
  DapEvent,
  FinanceStore,
  FintualEvent,
  Person,
  UserId,
} from "./types";

// TEMPORAL: autor por defecto de los eventos mock de DAP y Fintual. El login
// ya existe (lib/auth/AuthProvider.tsx) y Caja ya resuelve el autor real con
// public.current_app_user_id() (ver useCaja.ts). Al conectar DAP y Fintual a
// las tablas reales, este valor desaparece resolviendo la misma cadena:
//   session.user.id → users.auth_user_id → users.id → registradoPorUserId
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
  | { type: "fintual/variacion"; goalId: string; fecha: string; nuevaVariacion: number };

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
  }
}

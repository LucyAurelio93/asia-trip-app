// Comandos del módulo Finanzas: CÓMO SE REGISTRA (solo DAP).
//
// Cada acción de la UI se traduce en agregar UN evento al store. Los comandos
// nunca escriben saldos ni totales: eso se deriva en derive.ts. Este reducer
// es el punto que mañana se reemplaza por inserts a Supabase (mismas filas).
//
// Caja y Fintual YA NO pasan por aquí: sus eventos se insertan en Supabase
// vía cajaData.ts/useCaja.ts y fintualData.ts/useFintual.ts, con autor real
// de la sesión. Este reducer queda solo para DAP mientras siga sobre mocks.

import type { DapEvent, FinanceStore, UserId } from "./types";

// TEMPORAL: autor por defecto de los eventos mock de DAP. El login ya existe
// (lib/auth/AuthProvider.tsx) y Caja y Fintual ya resuelven el autor real con
// public.current_app_user_id() (ver useCaja.ts / useFintual.ts). Al conectar
// DAP a las tablas reales, este valor desaparece resolviendo la misma cadena:
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
  | { type: "dap/retirar"; dapId: string; fecha: string; monto: number; razon: string };

function makeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
  }
}

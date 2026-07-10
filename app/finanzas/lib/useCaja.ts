"use client";

// Estado de Caja conectado a Supabase: carga (usuarios + cajas + eventos),
// proyección del saldo y comandos de escritura.
//
// La verdad vive en la base: tras cada inserción exitosa se RECARGA desde
// Supabase y el saldo se re-deriva de los eventos guardados (projectCaja).
// Si la base rechaza la escritura, el estado local no cambia: nunca se
// muestra un saldo que la base no respalda. Sin optimistic updates.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createCashBox,
  fetchCurrentAppUserId,
  insertAjuste,
  insertAporte,
  insertGasto,
  listCashBoxes,
  listCashBoxEvents,
  listUsers,
} from "./cajaData";
import { projectCaja, type Caja } from "./derive";
import type { CashBoxEvent, CashBoxRecord, User } from "./types";

export type CajaStatus = "cargando" | "error" | "listo";

export type UseCajaResult = {
  status: CajaStatus;
  /** Mensaje del último fallo de carga (status === "error"). */
  errorCarga: string | null;
  /** Primera caja (la que opera la UI); null si aún no existe ninguna. */
  box: CashBoxRecord | null;
  /** Proyección derivada de los eventos guardados; vacía si no hay caja. */
  caja: Caja;
  /** true mientras una escritura está en curso (bloquea los formularios). */
  guardando: boolean;
  reload: () => void;
  /** Los comandos devuelven un mensaje de error legible, o null si OK. */
  crearCaja: (nombre: string) => Promise<string | null>;
  registrarAporte: (input: {
    fecha: string;
    monto: number;
    nota?: string;
  }) => Promise<string | null>;
  registrarGasto: (input: {
    fecha: string;
    monto: number;
    descripcion: string;
  }) => Promise<string | null>;
  registrarAjuste: (input: {
    fecha: string;
    nuevoSaldo: number;
    nota?: string;
  }) => Promise<string | null>;
};

const CAJA_VACIA: Caja = { saldo: 0, movimientos: [] };

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Error inesperado. Intenta de nuevo.";
}

// Foto completa de Caja en la base: usuarios, primera caja y sus eventos.
// Función pura de datos (sin estado React); la UI opera sobre la primera
// caja, la más antigua, igual que projectFinanceState.
type CajaSnapshot = {
  users: User[];
  box: CashBoxRecord | null;
  events: CashBoxEvent[];
};

async function fetchCajaSnapshot(): Promise<CajaSnapshot> {
  const [boxes, users] = await Promise.all([listCashBoxes(), listUsers()]);
  const box = boxes[0] ?? null;
  const events = box ? await listCashBoxEvents(box.id) : [];
  return { users, box, events };
}

export function useCaja(): UseCajaResult {
  const [status, setStatus] = useState<CajaStatus>("cargando");
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [box, setBox] = useState<CashBoxRecord | null>(null);
  const [events, setEvents] = useState<CashBoxEvent[]>([]);
  const [guardando, setGuardando] = useState(false);

  // Vigencia del componente: las respuestas de Supabase llegan async y no
  // deben tocar el estado si el hook ya se desmontó. El efecto de montaje lo
  // repone a true (cubre el remount de StrictMode) y el cleanup lo apaga.
  const montadoRef = useRef(true);

  // Carga todo desde Supabase y actualiza el estado en los callbacks del
  // Promise (mismo patrón que AuthProvider): el efecto no ejecuta ningún
  // setState síncrono, y cada callback verifica montadoRef antes de escribir
  // estado (una respuesta tardía tras desmontar se descarta entera).
  // load nunca fija "cargando": el estado inicial ya lo es, reload lo repone
  // al reintentar, y así el refresco tras una escritura no desmonta la vista
  // que está mostrando la confirmación.
  const load = useCallback(
    () =>
      fetchCajaSnapshot().then(
        (snap) => {
          if (!montadoRef.current) return;
          setUsers(snap.users);
          setBox(snap.box);
          setEvents(snap.events);
          setStatus("listo");
          setErrorCarga(null);
        },
        (e: unknown) => {
          if (!montadoRef.current) return;
          setErrorCarga(errorMessage(e));
          setStatus("error");
        }
      ),
    []
  );

  useEffect(() => {
    montadoRef.current = true;
    void load();
    return () => {
      montadoRef.current = false;
    };
  }, [load]);

  const reload = useCallback(() => {
    setStatus("cargando");
    setErrorCarga(null);
    void load();
  }, [load]);

  // Toda escritura sigue el mismo ciclo: insertar → recargar desde la base →
  // null (éxito) o mensaje de error (el estado mostrado queda intacto).
  const write = useCallback(
    async (accion: () => Promise<void>): Promise<string | null> => {
      setGuardando(true);
      try {
        await accion();
        await load();
        return null;
      } catch (e) {
        return errorMessage(e);
      } finally {
        if (montadoRef.current) setGuardando(false);
      }
    },
    [load]
  );

  // Autor real del evento: sesión Auth → public.current_app_user_id().
  // Se resuelve en cada escritura; nunca se usa TEMP_ACTIVE_USER_ID aquí.
  const requireAutor = useCallback(async () => {
    const userId = await fetchCurrentAppUserId();
    if (!userId) {
      throw new Error(
        "Tu cuenta no está vinculada a un usuario de la familia. Avísale a Piero."
      );
    }
    return userId;
  }, []);

  const requireBox = useCallback(() => {
    if (!box) throw new Error("Todavía no hay una caja creada.");
    return box;
  }, [box]);

  const crearCaja = useCallback(
    (nombre: string) =>
      write(async () => {
        await createCashBox(nombre);
      }),
    [write]
  );

  const registrarAporte = useCallback(
    (input: { fecha: string; monto: number; nota?: string }) =>
      write(async () => {
        const caja = requireBox();
        const registradoPorUserId = await requireAutor();
        await insertAporte({ boxId: caja.id, ...input, registradoPorUserId });
      }),
    [write, requireBox, requireAutor]
  );

  const registrarGasto = useCallback(
    (input: { fecha: string; monto: number; descripcion: string }) =>
      write(async () => {
        const caja = requireBox();
        const registradoPorUserId = await requireAutor();
        await insertGasto({ boxId: caja.id, ...input, registradoPorUserId });
      }),
    [write, requireBox, requireAutor]
  );

  const registrarAjuste = useCallback(
    (input: { fecha: string; nuevoSaldo: number; nota?: string }) =>
      write(async () => {
        const caja = requireBox();
        const registradoPorUserId = await requireAutor();
        await insertAjuste({ boxId: caja.id, ...input, registradoPorUserId });
      }),
    [write, requireBox, requireAutor]
  );

  // El saldo visible SIEMPRE se deriva de los eventos que la base confirmó.
  const caja = useMemo<Caja>(
    () => (box ? projectCaja(box, events, users) : CAJA_VACIA),
    [box, events, users]
  );

  return {
    status,
    errorCarga,
    box,
    caja,
    guardando,
    reload,
    crearCaja,
    registrarAporte,
    registrarGasto,
    registrarAjuste,
  };
}

"use client";

// Estado de Fintual conectado a Supabase: carga (usuarios + objetivos +
// bolsas + eventos), proyección de balances y comandos de escritura.
//
// La verdad vive en la base: tras cada inserción exitosa se RECARGA desde
// Supabase y los balances se re-derivan de los eventos guardados
// (projectGoal). Si la base rechaza la escritura, el estado local no cambia:
// nunca se muestra un balance que la base no respalda. Sin optimistic updates.
//
// Los objetivos y sus bolsas se crean vía la RPC transaccional
// public.create_fintual_goal (crearObjetivo): objetivo + bolsas nacen en una
// sola transacción, nunca con inserts secuenciales desde el cliente. Fuera de
// eso no hay creación de bolsas al vuelo: un depósito registra únicamente un
// depósito, y si la estructura del objetivo está incompleta la operación se
// rechaza con un mensaje de inconsistencia, sin escribir nada.
//
// Los comandos devuelven FintualWriteResult para distinguir tres desenlaces:
//   null                                → guardado y vista refrescada
//   { guardado: true, mensaje }         → guardado, pero el refresco falló:
//                                         la UI cierra el formulario y avisa,
//                                         sin invitar a reintentar el guardado
//   { guardado: false, mensaje }        → la base rechazó la escritura (o la
//                                         validación previa falló): el
//                                         formulario queda abierto con error

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchCurrentAppUserId, listUsers } from "./cajaData";
import {
  createFintualGoal,
  insertFintualDeposito,
  insertFintualRetiro,
  insertFintualVariacion,
  listFintualEvents,
  listFintualGoalBags,
  listFintualGoals,
} from "./fintualData";
import { projectGoal, type FintualGoal } from "./derive";
import type {
  FintualEvent,
  FintualGoalBag,
  FintualGoalRecord,
  Person,
  User,
  UserId,
} from "./types";

export type FintualStatus = "cargando" | "error" | "listo";

export type FintualWriteResult = null | { guardado: boolean; mensaje: string };

export type UseFintualResult = {
  status: FintualStatus;
  /** Mensaje del último fallo de carga (status === "error"). */
  errorCarga: string | null;
  /** Objetivos proyectados desde los eventos guardados (vista de derive.ts). */
  goals: FintualGoal[];
  /**
   * Usuarios de la familia según el snapshot cargado (para elegir el titular
   * de un objetivo personal). Vacío mientras carga o en error.
   */
  users: User[];
  /**
   * Persona autenticada ("Mi parte" de la UI), resuelta al cargar el snapshot
   * vía public.current_app_user_id(). null mientras carga o en error; una
   * sesión no vinculada deja el hook en "error", nunca en un $0 silencioso.
   */
  currentPerson: Person | null;
  /** true mientras una escritura está en curso (bloquea los formularios). */
  guardando: boolean;
  reload: () => void;
  crearObjetivo: (input: {
    nombre: string;
    tipo: "grupal" | "personal";
    titular?: Person;
  }) => Promise<FintualWriteResult>;
  registrarDeposito: (input: {
    goalId: string;
    person: Person;
    fecha: string;
    monto: number;
    nota?: string;
  }) => Promise<FintualWriteResult>;
  registrarRetiro: (input: {
    goalId: string;
    person: Person;
    fecha: string;
    monto: number;
    nota?: string;
  }) => Promise<FintualWriteResult>;
  registrarVariacion: (input: {
    goalId: string;
    fecha: string;
    variacionTotal: number;
  }) => Promise<FintualWriteResult>;
};

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Error inesperado. Intenta de nuevo.";
}

// Foto completa de Fintual en la base: usuarios, objetivos, bolsas, eventos
// y la persona de la sesión. El usuario actual se resuelve UNA vez por carga
// (aquí, no en cada render) y se conserva en estado.
type FintualSnapshot = {
  users: User[];
  goals: FintualGoalRecord[];
  bags: FintualGoalBag[];
  events: FintualEvent[];
  currentPerson: Person;
};

async function fetchFintualSnapshot(): Promise<FintualSnapshot> {
  const [users, goals, bags, events, currentUserId] = await Promise.all([
    listUsers(),
    listFintualGoals(),
    listFintualGoalBags(),
    listFintualEvents(),
    fetchCurrentAppUserId(),
  ]);
  // Sin usuario interno vinculado no hay "Mi parte" posible: el snapshot
  // completo se rechaza y el hook queda en "error" explícito.
  if (!currentUserId) {
    throw new Error(
      "Tu cuenta no está vinculada a un usuario de la familia. Avísale a Piero."
    );
  }
  const currentUser = users.find((u) => u.id === currentUserId);
  if (!currentUser) {
    throw new Error(
      "Tu usuario vinculado no aparece en la lista de usuarios de la base."
    );
  }
  return { users, goals, bags, events, currentPerson: currentUser.nombre };
}

export function useFintual(): UseFintualResult {
  const [status, setStatus] = useState<FintualStatus>("cargando");
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [goalRecords, setGoalRecords] = useState<FintualGoalRecord[]>([]);
  const [bags, setBags] = useState<FintualGoalBag[]>([]);
  const [events, setEvents] = useState<FintualEvent[]>([]);
  const [currentPerson, setCurrentPerson] = useState<Person | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Vigencia del componente: las respuestas de Supabase llegan async y no
  // deben tocar el estado si el hook ya se desmontó (mismo patrón que useCaja).
  const montadoRef = useRef(true);

  const aplicarSnapshot = useCallback((snap: FintualSnapshot) => {
    setUsers(snap.users);
    setGoalRecords(snap.goals);
    setBags(snap.bags);
    setEvents(snap.events);
    setCurrentPerson(snap.currentPerson);
    setStatus("listo");
    setErrorCarga(null);
  }, []);

  // load nunca fija "cargando": el estado inicial ya lo es, reload lo repone
  // al reintentar, y así el refresco tras una escritura no desmonta la vista
  // que está mostrando la confirmación.
  const load = useCallback(
    () =>
      fetchFintualSnapshot().then(
        (snap) => {
          if (!montadoRef.current) return;
          aplicarSnapshot(snap);
        },
        (e: unknown) => {
          if (!montadoRef.current) return;
          setErrorCarga(errorMessage(e));
          setStatus("error");
        }
      ),
    [aplicarSnapshot]
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

  // Toda escritura sigue el mismo ciclo: insertar → recargar desde la base.
  // El fallo del refresco NO se confunde con el fallo del guardado.
  const write = useCallback(
    async (accion: () => Promise<void>): Promise<FintualWriteResult> => {
      setGuardando(true);
      try {
        await accion();
      } catch (e) {
        if (montadoRef.current) setGuardando(false);
        return { guardado: false, mensaje: errorMessage(e) };
      }
      try {
        const snap = await fetchFintualSnapshot();
        if (montadoRef.current) aplicarSnapshot(snap);
        return null;
      } catch (e) {
        if (montadoRef.current) {
          setErrorCarga(errorMessage(e));
          setStatus("error");
        }
        return {
          guardado: true,
          mensaje: `Se guardó correctamente, pero no se pudo refrescar la vista (${errorMessage(e)}). Usa Reintentar para recargar.`,
        };
      } finally {
        if (montadoRef.current) setGuardando(false);
      }
    },
    [aplicarSnapshot]
  );

  // Autor real del evento: sesión Auth → public.current_app_user_id().
  // Se resuelve en cada escritura; Fintual nunca usa TEMP_ACTIVE_USER_ID.
  const requireAutor = useCallback(async () => {
    const userId = await fetchCurrentAppUserId();
    if (!userId) {
      throw new Error(
        "Tu cuenta no está vinculada a un usuario de la familia. Avísale a Piero."
      );
    }
    return userId;
  }, []);

  // Bolsa de la persona en el objetivo, resuelta contra el snapshot cargado.
  // Un depósito/retiro NUNCA crea ni repara estructura: si el objetivo o la
  // bolsa no existen, la operación se rechaza sin escribir nada. Las bolsas
  // se crean manualmente en Supabase junto con el objetivo.
  const requireBag = useCallback(
    (goalId: string, person: Person): FintualGoalBag => {
      const goal = goalRecords.find((g) => g.id === goalId);
      if (!goal) {
        throw new Error(
          "El objetivo ya no existe en los datos cargados. Recarga la vista e intenta de nuevo."
        );
      }
      const user = users.find((u) => u.nombre === person);
      if (!user) {
        throw new Error(`No existe el usuario "${person}" en la base.`);
      }
      const bag = bags.find((b) => b.goalId === goalId && b.userId === user.id);
      if (!bag) {
        throw new Error(
          `Inconsistencia de datos: ${person} no tiene bolsa en el objetivo "${goal.nombre}". Las bolsas se crean manualmente en Supabase; no se registró nada.`
        );
      }
      return bag;
    },
    [goalRecords, users, bags]
  );

  // Crea objetivo + bolsas en una sola transacción (RPC create_fintual_goal).
  // Valida ANTES del roundtrip: nombre no vacío y, si es personal, un titular
  // que exista en los usuarios cargados. Cualquier rechazo sale como
  // { guardado: false } sin tocar la base.
  const crearObjetivo = useCallback(
    (input: { nombre: string; tipo: "grupal" | "personal"; titular?: Person }) =>
      write(async () => {
        const nombre = input.nombre.trim();
        if (!nombre) {
          throw new Error("El nombre del objetivo no puede estar vacío.");
        }
        let titularUserId: UserId | undefined;
        if (input.tipo === "personal") {
          if (!input.titular) {
            throw new Error("Un objetivo personal necesita un titular.");
          }
          const titular = users.find((u) => u.nombre === input.titular);
          if (!titular) {
            throw new Error(
              `No existe el usuario "${input.titular}" en la base.`
            );
          }
          titularUserId = titular.id;
        }
        await createFintualGoal({ nombre, tipo: input.tipo, titularUserId });
      }),
    [write, users]
  );

  const registrarDeposito = useCallback(
    (input: {
      goalId: string;
      person: Person;
      fecha: string;
      monto: number;
      nota?: string;
    }) =>
      write(async () => {
        const bag = requireBag(input.goalId, input.person);
        const registradoPorUserId = await requireAutor();
        await insertFintualDeposito({
          goalId: input.goalId,
          bagId: bag.id,
          fecha: input.fecha,
          monto: input.monto,
          nota: input.nota,
          registradoPorUserId,
        });
      }),
    [write, requireAutor, requireBag]
  );

  const registrarRetiro = useCallback(
    (input: {
      goalId: string;
      person: Person;
      fecha: string;
      monto: number;
      nota?: string;
    }) =>
      write(async () => {
        const bag = requireBag(input.goalId, input.person);
        const registradoPorUserId = await requireAutor();
        await insertFintualRetiro({
          goalId: input.goalId,
          bagId: bag.id,
          fecha: input.fecha,
          monto: input.monto,
          nota: input.nota,
          registradoPorUserId,
        });
      }),
    [write, requireAutor, requireBag]
  );

  const registrarVariacion = useCallback(
    (input: { goalId: string; fecha: string; variacionTotal: number }) =>
      write(async () => {
        const registradoPorUserId = await requireAutor();
        await insertFintualVariacion({ ...input, registradoPorUserId });
      }),
    [write, requireAutor]
  );

  // Los balances visibles SIEMPRE se derivan de los eventos que la base
  // confirmó, con la misma proyección que usa el resto del módulo.
  const goals = useMemo<FintualGoal[]>(
    () =>
      goalRecords.map((g) =>
        projectGoal(
          g,
          bags.filter((b) => b.goalId === g.id),
          events.filter((e) => e.goalId === g.id),
          users
        )
      ),
    [goalRecords, bags, events, users]
  );

  return {
    status,
    errorCarga,
    goals,
    users,
    currentPerson,
    guardando,
    reload,
    crearObjetivo,
    registrarDeposito,
    registrarRetiro,
    registrarVariacion,
  };
}

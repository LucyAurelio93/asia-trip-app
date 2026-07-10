// Proyecciones del módulo Finanzas: QUÉ SE DERIVA.
//
// Todo lo visible en la UI (saldos, capital vigente, rentabilidad, bolsas,
// historiales) se reconstruye aquí plegando los eventos de types.ts en orden
// cronológico. Nada de este archivo se persiste.
//
//   DAP      apertura/renovación fijan la base del devengo; el retiro reduce
//            base y capital. valor actual = base + interés devengado (lineal
//            por días); rentabilidad acumulada = valor actual − capital.
//   Fintual  depositado por bolsa = Σ depósitos − retiros de esa bolsa.
//            variación = último evento de variación (total declarado, nivel
//            objetivo). balance = depositado + variación.
//   Caja     saldo = Σ aportes − gastos, con ajustes que redeclaran el saldo.
//   Historial global = unión de los movimientos normalizados de los tres.

import type {
  CashBoxEvent,
  CashBoxRecord,
  DapEvent,
  DapRecord,
  FinanceStore,
  FintualEvent,
  FintualGoalBag,
  FintualGoalRecord,
  Person,
  User,
} from "./types";
import {
  addDays,
  daysBetween,
  formatCLP,
  formatSignedCLP,
  formatTasa,
  todayISO,
} from "./format";

// ── Vista: tipos que consume la UI (derivados, nunca guardados) ─────────────

export type ModuleId = "dap" | "fintual" | "caja";

export type MovementKind =
  | "apertura"
  | "renovacion"
  | "retiro"
  | "cierre"
  | "deposito"
  | "variacion"
  | "aporte"
  | "gasto"
  | "ajuste";

// Movimiento normalizado: forma común de todo evento para los historiales
// (el individual de cada entidad y el global).
export type Movement = {
  id: string;
  date: string; // ISO yyyy-mm-dd
  amount: number; // CLP, con signo
  kind: MovementKind;
  label: string;
  detail?: string;
  module: ModuleId;
  sourceId?: string;
  sourceName: string;
  person?: Person; // dueño de la bolsa Fintual (no es el autor del registro)
  registradoPor: Person; // quién registró el evento (types.ts: registradoPorUserId)
};

export type Snapshot = { date: string; value: number };

export type Dap = {
  id: string;
  banco: string;
  titular: Person;
  tasa: number; // % del período vigente
  dias: number; // plazo vigente en días
  fechaRenovacion: string; // última apertura/renovación
  valorRenovacion: number; // base del devengo (valor total al renovar − retiros)
  capitalVigente: number; // aportes netos, sin rentabilidad
  cerrado: boolean;
  snapshots: Snapshot[]; // evolución para el gráfico
  movimientos: Movement[]; // historial individual, más reciente primero
};

export type FintualBolsa = { person: Person; depositado: number };

export type FintualGoal = {
  id: string;
  nombre: string;
  tipo: "grupal" | "personal";
  bolsas: FintualBolsa[]; // personal → una sola bolsa
  variacion: number; // siempre a nivel del objetivo, nunca por bolsa
  movimientos: Movement[]; // historial individual, más reciente primero
};

export type Caja = {
  saldo: number;
  movimientos: Movement[]; // más reciente primero
};

export type FinanceState = {
  daps: Dap[];
  fintual: FintualGoal[];
  caja: Caja;
};

// ── Plegado de eventos ───────────────────────────────────────────────────────

// Orden cronológico; empates de fecha conservan el orden de registro (sort
// estable), que es el orden en que se agregaron los eventos.
function byFecha<T extends { fecha: string }>(events: T[]): T[] {
  return [...events].sort((a, b) =>
    a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0
  );
}

function personOf(users: User[], userId: string): Person {
  return users.find((u) => u.id === userId)?.nombre ?? "Piero";
}

function projectDap(record: DapRecord, events: DapEvent[], users: User[]): Dap {
  let valorRenovacion = 0;
  let capitalVigente = 0;
  let fechaRenovacion = "";
  let dias = 1;
  let tasa = 0;
  let cerrado = false;
  const snapshots: Snapshot[] = [];
  const movimientos: Movement[] = [];

  const push = (
    ev: DapEvent,
    amount: number,
    kind: MovementKind,
    label: string,
    detail?: string
  ) => {
    movimientos.push({
      id: ev.id,
      date: ev.fecha,
      amount,
      kind,
      label,
      detail,
      module: "dap",
      sourceId: record.id,
      sourceName: record.banco,
      registradoPor: personOf(users, ev.registradoPorUserId),
    });
  };

  for (const ev of byFecha(events)) {
    switch (ev.tipo) {
      case "apertura":
        valorRenovacion = ev.montoTotal;
        capitalVigente = ev.montoTotal;
        fechaRenovacion = ev.fecha;
        dias = ev.dias;
        tasa = ev.tasa;
        snapshots.push({ date: ev.fecha, value: ev.montoTotal });
        push(
          ev,
          ev.montoTotal,
          "apertura",
          `Apertura DAP ${record.banco}`,
          `${ev.dias} días · ${formatTasa(ev.tasa)}`
        );
        break;

      case "renovacion":
        valorRenovacion = ev.montoTotal;
        capitalVigente += ev.aporte;
        fechaRenovacion = ev.fecha;
        dias = ev.dias;
        tasa = ev.tasa;
        snapshots.push({ date: ev.fecha, value: ev.montoTotal });
        push(
          ev,
          ev.aporte,
          "renovacion",
          `Renovación DAP ${record.banco}`,
          `Nuevo total ${formatCLP(ev.montoTotal)} · ${ev.dias} días · ${formatTasa(ev.tasa)}`
        );
        break;

      case "retiro":
        valorRenovacion = Math.max(0, valorRenovacion - ev.monto);
        capitalVigente = Math.max(0, capitalVigente - ev.monto);
        snapshots.push({ date: ev.fecha, value: valorRenovacion });
        push(ev, -ev.monto, "retiro", `Retiro DAP ${record.banco}`, ev.razon);
        break;

      case "cierre":
        push(ev, -valorRenovacion, "cierre", `Cierre DAP ${record.banco}`, ev.nota);
        valorRenovacion = 0;
        capitalVigente = 0;
        cerrado = true;
        snapshots.push({ date: ev.fecha, value: 0 });
        break;
    }
  }

  return {
    id: record.id,
    banco: record.banco,
    titular: personOf(users, record.titularUserId),
    tasa,
    dias,
    fechaRenovacion,
    valorRenovacion,
    capitalVigente,
    cerrado,
    snapshots,
    movimientos: movimientos.reverse(),
  };
}

function projectGoal(
  record: FintualGoalRecord,
  bags: FintualGoalBag[],
  events: FintualEvent[],
  users: User[]
): FintualGoal {
  const depositadoPorBolsa = new Map<string, number>(bags.map((b) => [b.id, 0]));
  const personPorBolsa = new Map<string, Person>(
    bags.map((b) => [b.id, personOf(users, b.userId)])
  );
  let variacion = 0;
  const movimientos: Movement[] = [];

  const detalleBolsa = (bagId: string, nota?: string) => {
    const partes = [
      record.tipo === "grupal" ? `Bolsa ${personPorBolsa.get(bagId)}` : null,
      nota || null,
    ].filter(Boolean);
    return partes.length > 0 ? partes.join(" · ") : undefined;
  };

  for (const ev of byFecha(events)) {
    switch (ev.tipo) {
      case "deposito": {
        depositadoPorBolsa.set(
          ev.bagId,
          (depositadoPorBolsa.get(ev.bagId) ?? 0) + ev.monto
        );
        movimientos.push({
          id: ev.id,
          date: ev.fecha,
          amount: ev.monto,
          kind: "deposito",
          label: `Depósito · ${record.nombre}`,
          detail: detalleBolsa(ev.bagId, ev.nota),
          module: "fintual",
          sourceId: record.id,
          sourceName: record.nombre,
          person: personPorBolsa.get(ev.bagId),
          registradoPor: personOf(users, ev.registradoPorUserId),
        });
        break;
      }

      case "retiro": {
        depositadoPorBolsa.set(
          ev.bagId,
          Math.max(0, (depositadoPorBolsa.get(ev.bagId) ?? 0) - ev.monto)
        );
        movimientos.push({
          id: ev.id,
          date: ev.fecha,
          amount: -ev.monto,
          kind: "retiro",
          label: `Retiro · ${record.nombre}`,
          detail: detalleBolsa(ev.bagId, ev.nota),
          module: "fintual",
          sourceId: record.id,
          sourceName: record.nombre,
          person: personPorBolsa.get(ev.bagId),
          registradoPor: personOf(users, ev.registradoPorUserId),
        });
        break;
      }

      case "variacion": {
        const delta = ev.variacionTotal - variacion;
        variacion = ev.variacionTotal;
        movimientos.push({
          id: ev.id,
          date: ev.fecha,
          amount: delta,
          kind: "variacion",
          label: `Variación · ${record.nombre}`,
          detail: `Variación total ${formatSignedCLP(ev.variacionTotal)}`,
          module: "fintual",
          sourceId: record.id,
          sourceName: record.nombre,
          registradoPor: personOf(users, ev.registradoPorUserId),
        });
        break;
      }
    }
  }

  return {
    id: record.id,
    nombre: record.nombre,
    tipo: record.tipo,
    bolsas: bags.map((b) => ({
      person: personPorBolsa.get(b.id) as Person,
      depositado: depositadoPorBolsa.get(b.id) ?? 0,
    })),
    variacion,
    movimientos: movimientos.reverse(),
  };
}

function projectCaja(
  box: CashBoxRecord,
  events: CashBoxEvent[],
  users: User[]
): Caja {
  let saldo = 0;
  const movimientos: Movement[] = [];

  for (const ev of byFecha(events)) {
    switch (ev.tipo) {
      case "aporte":
        saldo += ev.monto;
        movimientos.push({
          id: ev.id,
          date: ev.fecha,
          amount: ev.monto,
          kind: "aporte",
          label: `Aporte a ${box.nombre.toLowerCase()}`,
          detail: ev.nota,
          module: "caja",
          sourceName: box.nombre,
          registradoPor: personOf(users, ev.registradoPorUserId),
        });
        break;

      case "gasto":
        saldo -= ev.monto;
        movimientos.push({
          id: ev.id,
          date: ev.fecha,
          amount: -ev.monto,
          kind: "gasto",
          label: ev.descripcion || "Gasto de casa",
          module: "caja",
          sourceName: box.nombre,
          registradoPor: personOf(users, ev.registradoPorUserId),
        });
        break;

      case "ajuste": {
        const delta = ev.nuevoSaldo - saldo;
        saldo = ev.nuevoSaldo;
        movimientos.push({
          id: ev.id,
          date: ev.fecha,
          amount: delta,
          kind: "ajuste",
          label: "Ajuste de saldo",
          detail: ev.nota || `Saldo ajustado a ${formatCLP(ev.nuevoSaldo)}`,
          module: "caja",
          sourceName: box.nombre,
          registradoPor: personOf(users, ev.registradoPorUserId),
        });
        break;
      }
    }
  }

  return { saldo, movimientos: movimientos.reverse() };
}

// Proyección completa: del store persistible al estado que consume la UI.
export function projectFinanceState(store: FinanceStore): FinanceState {
  const box = store.cashBoxes[0];
  return {
    daps: store.daps.map((d) =>
      projectDap(d, store.dapEvents.filter((e) => e.dapId === d.id), store.users)
    ),
    fintual: store.fintualGoals.map((g) =>
      projectGoal(
        g,
        store.fintualGoalBags.filter((b) => b.goalId === g.id),
        store.fintualEvents.filter((e) => e.goalId === g.id),
        store.users
      )
    ),
    caja: box
      ? projectCaja(
          box,
          store.cashBoxEvents.filter((e) => e.boxId === box.id),
          store.users
        )
      : { saldo: 0, movimientos: [] },
  };
}

// ── Derivados DAP sobre la vista ─────────────────────────────────────────────
// La separación capital / rentabilidad es automática:
//   valor actual   = base al renovar + interés devengado (lineal por días)
//   rentabilidad   = valor actual − capital vigente (aportes netos)

export type DapDerived = {
  valorActual: number;
  devengado: number;
  rentabilidadAcumulada: number;
  vencimiento: string;
  diasRestantes: number;
  diasTranscurridos: number;
};

export function dapDerived(dap: Dap, hoy: string = todayISO()): DapDerived {
  const transcurridos = Math.min(
    Math.max(daysBetween(dap.fechaRenovacion, hoy), 0),
    dap.dias
  );
  const devengado = Math.round(
    dap.valorRenovacion * (dap.tasa / 100) * (transcurridos / dap.dias)
  );
  const valorActual = dap.valorRenovacion + devengado;
  const vencimiento = addDays(dap.fechaRenovacion, dap.dias);
  return {
    valorActual,
    devengado,
    rentabilidadAcumulada: valorActual - dap.capitalVigente,
    vencimiento,
    diasRestantes: Math.max(0, daysBetween(hoy, vencimiento)),
    diasTranscurridos: transcurridos,
  };
}

export function dapChartPoints(dap: Dap, hoy: string = todayISO()): Snapshot[] {
  const { valorActual } = dapDerived(dap, hoy);
  const points = [...dap.snapshots];
  if (points.length === 0 || points[points.length - 1].date < hoy) {
    points.push({ date: hoy, value: valorActual });
  }
  return points;
}

export function proximoVencimiento(
  daps: Dap[],
  hoy: string = todayISO()
): { dap: Dap; derived: DapDerived } | null {
  let best: { dap: Dap; derived: DapDerived } | null = null;
  for (const dap of daps) {
    if (dap.cerrado) continue;
    const derived = dapDerived(dap, hoy);
    if (!best || derived.vencimiento < best.derived.vencimiento) {
      best = { dap, derived };
    }
  }
  return best;
}

// ── Derivados Fintual sobre la vista ─────────────────────────────────────────

export function goalDepositado(goal: FintualGoal): number {
  return goal.bolsas.reduce((sum, b) => sum + b.depositado, 0);
}

export function goalBalance(goal: FintualGoal): number {
  return goalDepositado(goal) + goal.variacion;
}

export function goalVariacionPct(goal: FintualGoal): number {
  const dep = goalDepositado(goal);
  return dep > 0 ? (goal.variacion / dep) * 100 : 0;
}

export function bolsaDe(goal: FintualGoal, person: Person): number {
  return goal.bolsas.find((b) => b.person === person)?.depositado ?? 0;
}

// ── Totales ──────────────────────────────────────────────────────────────────

export function totalDap(daps: Dap[], hoy: string = todayISO()): number {
  return daps.reduce((sum, d) => sum + dapDerived(d, hoy).valorActual, 0);
}

export function totalFintual(goals: FintualGoal[]): number {
  return goals.reduce((sum, g) => sum + goalBalance(g), 0);
}

export function patrimonio(state: FinanceState, hoy: string = todayISO()): number {
  return totalDap(state.daps, hoy) + totalFintual(state.fintual) + state.caja.saldo;
}

// ── Historial global ─────────────────────────────────────────────────────────
// Se construye desde los movimientos ya normalizados de DAP, Fintual y Caja.

export function allMovements(state: FinanceState): Movement[] {
  const merged = [
    ...state.daps.flatMap((d) => d.movimientos),
    ...state.fintual.flatMap((g) => g.movimientos),
    ...state.caja.movimientos,
  ];
  return merged.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

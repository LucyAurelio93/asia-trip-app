// Tipos, formato y lógica pura del módulo Finanzas.
// Todo es mock/local: sin backend, sin persistencia, sin integraciones.

// ── Tipos ────────────────────────────────────────────────────────────────────

export type ModuleId = "dap" | "fintual" | "caja";

export type Person = "Piero" | "Consu";

export type MovementKind =
  | "apertura"
  | "renovacion"
  | "retiro"
  | "deposito"
  | "variacion"
  | "aporte"
  | "gasto"
  | "ajuste";

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
  person?: Person;
};

export type Snapshot = { date: string; value: number };

export type Dap = {
  id: string;
  banco: string;
  titular: Person;
  tasa: number; // % del período
  dias: number; // plazo en días
  fechaRenovacion: string; // última renovación
  valorRenovacion: number; // valor total al renovar (base del devengo)
  capitalVigente: number; // aportes netos (sin rentabilidad)
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

// ── Fechas ───────────────────────────────────────────────────────────────────

const MS_DAY = 86_400_000;
const MESES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

export function todayISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((Date.parse(toISO) - Date.parse(fromISO)) / MS_DAY);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(Date.parse(iso) + days * MS_DAY);
  return d.toISOString().slice(0, 10);
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES[m - 1]} ${y}`;
}

export function formatDateShort(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES[m - 1]}`;
}

// ── Moneda ───────────────────────────────────────────────────────────────────

export function formatCLP(value: number): string {
  const abs = Math.round(Math.abs(value))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${value < 0 ? "−" : ""}$${abs}`;
}

export function formatSignedCLP(value: number): string {
  return value >= 0 ? `+${formatCLP(value)}` : formatCLP(value);
}

export function formatPct(value: number): string {
  const s = (Math.round(value * 100) / 100).toFixed(2).replace(".", ",");
  return `${value >= 0 ? "+" : ""}${s}%`;
}

export function formatTasa(value: number): string {
  return `${String(value).replace(".", ",")}%`;
}

// ── Derivados DAP ────────────────────────────────────────────────────────────
// La separación capital / rentabilidad es automática:
//   valor actual   = valor al renovar + interés devengado (lineal por días)
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
    const derived = dapDerived(dap, hoy);
    if (!best || derived.vencimiento < best.derived.vencimiento) {
      best = { dap, derived };
    }
  }
  return best;
}

// ── Derivados Fintual ────────────────────────────────────────────────────────

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

export function allMovements(state: FinanceState): Movement[] {
  const merged = [
    ...state.daps.flatMap((d) => d.movimientos),
    ...state.fintual.flatMap((g) => g.movimientos),
    ...state.caja.movimientos,
  ];
  return merged.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

// ── Reducer ──────────────────────────────────────────────────────────────────

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

export function financeReducer(
  state: FinanceState,
  action: FinanceAction
): FinanceState {
  switch (action.type) {
    case "dap/renovar": {
      return {
        ...state,
        daps: state.daps.map((dap) => {
          if (dap.id !== action.dapId) return dap;
          const movement: Movement = {
            id: makeId(),
            date: action.fecha,
            amount: action.aporte,
            kind: "renovacion",
            label: `Renovación DAP ${dap.banco}`,
            detail: `Nuevo total ${formatCLP(action.montoTotal)} · ${action.dias} días · ${formatTasa(action.tasa)}`,
            module: "dap",
            sourceId: dap.id,
            sourceName: dap.banco,
          };
          return {
            ...dap,
            valorRenovacion: action.montoTotal,
            capitalVigente: dap.capitalVigente + action.aporte,
            fechaRenovacion: action.fecha,
            dias: action.dias,
            tasa: action.tasa,
            snapshots: [...dap.snapshots, { date: action.fecha, value: action.montoTotal }],
            movimientos: [movement, ...dap.movimientos],
          };
        }),
      };
    }

    case "dap/retirar": {
      return {
        ...state,
        daps: state.daps.map((dap) => {
          if (dap.id !== action.dapId) return dap;
          const nuevoValor = Math.max(0, dap.valorRenovacion - action.monto);
          const movement: Movement = {
            id: makeId(),
            date: action.fecha,
            amount: -action.monto,
            kind: "retiro",
            label: `Retiro DAP ${dap.banco}`,
            detail: action.razon || undefined,
            module: "dap",
            sourceId: dap.id,
            sourceName: dap.banco,
          };
          return {
            ...dap,
            valorRenovacion: nuevoValor,
            capitalVigente: Math.max(0, dap.capitalVigente - action.monto),
            snapshots: [...dap.snapshots, { date: action.fecha, value: nuevoValor }],
            movimientos: [movement, ...dap.movimientos],
          };
        }),
      };
    }

    case "fintual/deposito": {
      return {
        ...state,
        fintual: state.fintual.map((goal) => {
          if (goal.id !== action.goalId) return goal;
          const movement: Movement = {
            id: makeId(),
            date: action.fecha,
            amount: action.monto,
            kind: "deposito",
            label: `Depósito · ${goal.nombre}`,
            detail: goal.tipo === "grupal" ? `Bolsa ${action.person}` : undefined,
            module: "fintual",
            sourceId: goal.id,
            sourceName: goal.nombre,
            person: action.person,
          };
          return {
            ...goal,
            bolsas: goal.bolsas.map((b) =>
              b.person === action.person
                ? { ...b, depositado: b.depositado + action.monto }
                : b
            ),
            movimientos: [movement, ...goal.movimientos],
          };
        }),
      };
    }

    case "fintual/retiro": {
      return {
        ...state,
        fintual: state.fintual.map((goal) => {
          if (goal.id !== action.goalId) return goal;
          const movement: Movement = {
            id: makeId(),
            date: action.fecha,
            amount: -action.monto,
            kind: "retiro",
            label: `Retiro · ${goal.nombre}`,
            detail: [
              goal.tipo === "grupal" ? `Bolsa ${action.person}` : null,
              action.nota || null,
            ]
              .filter(Boolean)
              .join(" · ") || undefined,
            module: "fintual",
            sourceId: goal.id,
            sourceName: goal.nombre,
            person: action.person,
          };
          return {
            ...goal,
            bolsas: goal.bolsas.map((b) =>
              b.person === action.person
                ? { ...b, depositado: Math.max(0, b.depositado - action.monto) }
                : b
            ),
            movimientos: [movement, ...goal.movimientos],
          };
        }),
      };
    }

    case "fintual/variacion": {
      return {
        ...state,
        fintual: state.fintual.map((goal) => {
          if (goal.id !== action.goalId) return goal;
          const delta = action.nuevaVariacion - goal.variacion;
          const movement: Movement = {
            id: makeId(),
            date: action.fecha,
            amount: delta,
            kind: "variacion",
            label: `Variación · ${goal.nombre}`,
            detail: `Variación total ${formatSignedCLP(action.nuevaVariacion)}`,
            module: "fintual",
            sourceId: goal.id,
            sourceName: goal.nombre,
          };
          return {
            ...goal,
            variacion: action.nuevaVariacion,
            movimientos: [movement, ...goal.movimientos],
          };
        }),
      };
    }

    case "caja/aporte": {
      const movement: Movement = {
        id: makeId(),
        date: action.fecha,
        amount: action.monto,
        kind: "aporte",
        label: "Aporte a caja casa",
        detail: action.nota || undefined,
        module: "caja",
        sourceName: "Caja casa",
      };
      return {
        ...state,
        caja: {
          saldo: state.caja.saldo + action.monto,
          movimientos: [movement, ...state.caja.movimientos],
        },
      };
    }

    case "caja/gasto": {
      const movement: Movement = {
        id: makeId(),
        date: action.fecha,
        amount: -action.monto,
        kind: "gasto",
        label: action.descripcion || "Gasto de casa",
        module: "caja",
        sourceName: "Caja casa",
      };
      return {
        ...state,
        caja: {
          saldo: state.caja.saldo - action.monto,
          movimientos: [movement, ...state.caja.movimientos],
        },
      };
    }

    case "caja/ajuste": {
      const delta = action.nuevoSaldo - state.caja.saldo;
      const movement: Movement = {
        id: makeId(),
        date: action.fecha,
        amount: delta,
        kind: "ajuste",
        label: "Ajuste de saldo",
        detail: action.nota || `Saldo ajustado a ${formatCLP(action.nuevoSaldo)}`,
        module: "caja",
        sourceName: "Caja casa",
      };
      return {
        ...state,
        caja: {
          saldo: action.nuevoSaldo,
          movimientos: [movement, ...state.caja.movimientos],
        },
      };
    }
  }
}

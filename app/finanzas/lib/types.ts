// Modelo persistible del módulo Finanzas: QUÉ SE GUARDA.
//
// Regla del dominio: se guardan entidades y eventos; los saldos se derivan.
// Cada tipo de aquí es espejo 1:1 de una tabla de schema.sql:
//
//   User            → users
//   DapRecord       → daps
//   DapEvent        → dap_events
//   FintualGoalRecord → fintual_goals
//   FintualGoalBag  → fintual_goal_bags
//   FintualEvent    → fintual_events
//   CashBoxRecord   → cash_boxes
//   CashBoxEvent    → cash_box_events
//
// Aquí NO hay saldos, valores actuales ni rentabilidades: eso vive en
// derive.ts. Los eventos se agregan solo vía commands.ts.

export type UserId = string;

// Nombre visible de cada persona. En persistencia real esto es users.nombre;
// la UI actual lo usa como identificador de display.
export type Person = "Piero" | "Consu";

export type User = {
  id: UserId;
  nombre: Person;
  // Vínculo con Supabase Auth (users.auth_user_id). Null mientras el módulo
  // corre con datos mock; al activar Auth cada persona queda asociada a su
  // usuario autenticado.
  authUserId?: string | null;
};

// Autoría de eventos: todo evento (DAP, Fintual, Caja) guarda quién lo
// registró en la app. No confundir con el titular de un DAP, el dueño de una
// bolsa Fintual ni la persona de un objetivo: esos describen a quién pertenece
// el dinero; registradoPorUserId describe quién ingresó el dato. Hoy lo fija
// commands.ts; al conectar Supabase Auth vendrá del usuario autenticado.

// ── DAP ──────────────────────────────────────────────────────────────────────
// La entidad solo identifica el instrumento. Tasa, plazo, capital y valor
// viven en los eventos: la apertura/renovación vigente define el devengo.

export type DapRecord = {
  id: string;
  banco: string;
  titularUserId: UserId;
};

export type DapEvent =
  | {
      id: string;
      dapId: string;
      fecha: string; // ISO yyyy-mm-dd
      tipo: "apertura";
      montoTotal: number; // CLP, valor total inicial del DAP
      dias: number;
      tasa: number; // % del período
      registradoPorUserId: UserId; // autor del registro (no el titular)
    }
  | {
      id: string;
      dapId: string;
      fecha: string;
      tipo: "renovacion";
      montoTotal: number; // nuevo valor total del DAP
      aporte: number; // aporte nuevo (0 si solo renueva)
      dias: number;
      tasa: number;
      registradoPorUserId: UserId;
    }
  | {
      id: string;
      dapId: string;
      fecha: string;
      tipo: "retiro";
      monto: number; // CLP, positivo
      razon?: string;
      registradoPorUserId: UserId;
    }
  | {
      id: string;
      dapId: string;
      fecha: string;
      tipo: "cierre"; // retiro total: deja el DAP en cero
      nota?: string;
      registradoPorUserId: UserId;
    };

// ── Fintual ──────────────────────────────────────────────────────────────────
// Un objetivo grupal tiene una bolsa por persona; uno personal, una sola.
// Depósitos y retiros pertenecen a una bolsa. La variación pertenece solo al
// objetivo (nunca se divide por persona) y se registra como valor total
// declarado, no como delta: el delta se deriva comparando eventos.

export type FintualGoalRecord = {
  id: string;
  nombre: string;
  tipo: "grupal" | "personal";
};

export type FintualGoalBag = {
  id: string;
  goalId: string;
  userId: UserId;
};

export type FintualEvent =
  | {
      id: string;
      goalId: string;
      fecha: string;
      tipo: "deposito";
      bagId: string;
      monto: number; // CLP, positivo
      nota?: string;
      registradoPorUserId: UserId; // autor del registro (no el dueño de la bolsa)
    }
  | {
      id: string;
      goalId: string;
      fecha: string;
      tipo: "retiro";
      bagId: string;
      monto: number; // CLP, positivo
      nota?: string;
      registradoPorUserId: UserId;
    }
  | {
      id: string;
      goalId: string;
      fecha: string;
      tipo: "variacion";
      variacionTotal: number; // variación acumulada declarada a esa fecha
      registradoPorUserId: UserId;
    };

// ── Caja ─────────────────────────────────────────────────────────────────────
// Caja acumulativa (no presupuesto mensual). El ajuste declara el saldo
// correcto a una fecha; el delta se deriva.

export type CashBoxRecord = {
  id: string;
  nombre: string;
};

export type CashBoxEvent =
  | {
      id: string;
      boxId: string;
      fecha: string;
      tipo: "aporte";
      monto: number; // CLP, positivo
      nota?: string;
      registradoPorUserId: UserId; // autor del registro
    }
  | {
      id: string;
      boxId: string;
      fecha: string;
      tipo: "gasto";
      monto: number; // CLP, positivo
      descripcion: string;
      registradoPorUserId: UserId;
    }
  | {
      id: string;
      boxId: string;
      fecha: string;
      tipo: "ajuste";
      nuevoSaldo: number; // saldo declarado tras el ajuste
      nota?: string;
      registradoPorUserId: UserId;
    };

// ── Store ────────────────────────────────────────────────────────────────────
// Imagen en memoria de las tablas. Es la única fuente de verdad del módulo;
// la UI nunca lee este store directo, consume projectFinanceState (derive.ts).

export type FinanceStore = {
  users: User[];
  daps: DapRecord[];
  dapEvents: DapEvent[];
  fintualGoals: FintualGoalRecord[];
  fintualGoalBags: FintualGoalBag[];
  fintualEvents: FintualEvent[];
  cashBoxes: CashBoxRecord[];
  cashBoxEvents: CashBoxEvent[];
};

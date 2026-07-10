// Fachada del dominio Finanzas. Los componentes importan solo desde aquí.
//
// Capas (regla: guardar eventos, derivar saldos):
//   types.ts    → QUÉ SE GUARDA: entidades y eventos persistibles
//                 (espejo de schema.sql: users, daps, dap_events,
//                 fintual_goals, fintual_goal_bags, fintual_events,
//                 cash_boxes, cash_box_events)
//   commands.ts → CÓMO SE REGISTRA (DAP, aún mock): acciones que agregan
//                 eventos al store en memoria
//   cajaData.ts → CÓMO SE PERSISTE Caja: selects/inserts a Supabase bajo RLS
//                 (incluye listUsers y fetchCurrentAppUserId, compartidas)
//   useCaja.ts  → estado de Caja conectado: carga, escrituras y proyección
//   fintualData.ts → CÓMO SE PERSISTE Fintual: selects a Supabase bajo RLS
//                 (objetivos y bolsas, que se crean manualmente en la base)
//                 e inserts SOLO de eventos
//   useFintual.ts → estado de Fintual conectado: carga, escrituras y proyección
//   derive.ts   → QUÉ SE DERIVA: proyecciones que reconstruyen desde eventos
//                 el estado visible (valor actual, capital, rentabilidad,
//                 bolsas, saldos, historiales)
//   format.ts   → helpers de fechas y formato, sin dominio
//
// La UI consume FinanceState (vista derivada) vía projectFinanceState.
// DAP despacha FinanceAction (mock); Caja usa useCaja y Fintual useFintual
// (Supabase). Nadie lee ni escribe saldos directamente.

export * from "./types";
export * from "./format";
export * from "./derive";
export * from "./commands";
export * from "./cajaData";
export * from "./useCaja";
export * from "./fintualData";
export * from "./useFintual";

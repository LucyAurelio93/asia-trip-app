// Fachada del dominio Finanzas. Los componentes importan solo desde aquí.
//
// Capas (regla: guardar eventos, derivar saldos):
//   types.ts    → QUÉ SE GUARDA: entidades y eventos persistibles
//                 (espejo de schema.sql: users, daps, dap_events,
//                 fintual_goals, fintual_goal_bags, fintual_events,
//                 cash_boxes, cash_box_events)
//   commands.ts → CÓMO SE REGISTRA: acciones que agregan eventos al store
//   derive.ts   → QUÉ SE DERIVA: proyecciones que reconstruyen desde eventos
//                 el estado visible (valor actual, capital, rentabilidad,
//                 bolsas, saldos, historiales)
//   format.ts   → helpers de fechas y formato, sin dominio
//
// La UI consume FinanceState (vista derivada) vía projectFinanceState y
// despacha FinanceAction; nunca lee ni escribe saldos directamente.

export * from "./types";
export * from "./format";
export * from "./derive";
export * from "./commands";

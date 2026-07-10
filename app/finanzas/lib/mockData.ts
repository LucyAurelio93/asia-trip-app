import type { FinanceStore } from "./types";

// Datos mock del módulo Finanzas en su forma persistible: entidades y eventos,
// nunca saldos. Cada arreglo es espejo de una tabla de schema.sql; al conectar
// Supabase este archivo se reemplaza por selects equivalentes.
//
// Los eventos están en orden cronológico.
//
// registradoPorUserId alterna entre Piero y Consu para poder verificar en la
// UI que el autor del registro es independiente del titular del DAP
// (p. ej. Piero registra la renovación del DAP de Consu).

export const initialFinanceStore: FinanceStore = {
  users: [
    { id: "user-piero", nombre: "Piero" },
    { id: "user-consu", nombre: "Consu" },
  ],

  daps: [
    { id: "dap-santander", banco: "Santander", titularUserId: "user-piero" },
    { id: "dap-bancoestado", banco: "BancoEstado", titularUserId: "user-consu" },
  ],

  dapEvents: [
    // Santander: apertura + renovaciones mensuales; una con aporte nuevo.
    {
      id: "dap1-e1",
      dapId: "dap-santander",
      fecha: "2026-02-20",
      tipo: "apertura",
      montoTotal: 11_550_000,
      dias: 30,
      tasa: 0.55,
      registradoPorUserId: "user-piero",
    },
    {
      id: "dap1-e2",
      dapId: "dap-santander",
      fecha: "2026-03-22",
      tipo: "renovacion",
      montoTotal: 11_614_000,
      aporte: 0,
      dias: 30,
      tasa: 0.55,
      registradoPorUserId: "user-piero",
    },
    {
      id: "dap1-e3",
      dapId: "dap-santander",
      fecha: "2026-04-21",
      tipo: "renovacion",
      montoTotal: 11_678_000,
      aporte: 0,
      dias: 30,
      tasa: 0.55,
      registradoPorUserId: "user-consu",
    },
    {
      id: "dap1-e4",
      dapId: "dap-santander",
      fecha: "2026-05-21",
      tipo: "renovacion",
      montoTotal: 12_170_000,
      aporte: 0,
      dias: 30,
      tasa: 0.55,
      registradoPorUserId: "user-piero",
    },
    {
      id: "dap1-e5",
      dapId: "dap-santander",
      fecha: "2026-06-20",
      tipo: "renovacion",
      montoTotal: 12_485_000,
      aporte: 250_000,
      dias: 30,
      tasa: 0.55,
      registradoPorUserId: "user-piero",
    },
    // BancoEstado: apertura trimestral + una renovación.
    {
      id: "dap2-e1",
      dapId: "dap-bancoestado",
      fecha: "2026-02-11",
      tipo: "apertura",
      montoTotal: 6_000_000,
      dias: 90,
      tasa: 1.6,
      registradoPorUserId: "user-consu",
    },
    {
      id: "dap2-e2",
      dapId: "dap-bancoestado",
      fecha: "2026-05-12",
      tipo: "renovacion",
      montoTotal: 6_230_000,
      aporte: 0,
      dias: 90,
      tasa: 1.6,
      registradoPorUserId: "user-piero",
    },
  ],

  // Caja y Fintual ya persisten en Supabase (cajaData.ts/useCaja.ts y
  // fintualData.ts/useFintual.ts): sus mocks se retiraron para no mezclar
  // entidades ni eventos mock con los reales en Resumen ni en Historial.
  // Solo DAP sigue sobre los mocks de arriba.
  fintualGoals: [],

  fintualGoalBags: [],

  fintualEvents: [],

  cashBoxes: [],

  cashBoxEvents: [],
};

import type { FinanceStore } from "./types";

// Datos mock del módulo Finanzas en su forma persistible: entidades y eventos,
// nunca saldos. Cada arreglo es espejo de una tabla de schema.sql; al conectar
// Supabase este archivo se reemplaza por selects equivalentes.
//
// Los eventos están en orden cronológico. Los montos "Saldo inicial" son la
// carga inicial de cada bolsa (histórico previo resumido en un depósito).

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
    },
  ],

  fintualGoals: [
    { id: "fin-depa", nombre: "Depa", tipo: "grupal" },
    { id: "fin-viaje", nombre: "Viaje Asia", tipo: "grupal" },
    { id: "fin-jubilacion", nombre: "Jubilación Piero", tipo: "personal" },
  ],

  fintualGoalBags: [
    { id: "bag-depa-piero", goalId: "fin-depa", userId: "user-piero" },
    { id: "bag-depa-consu", goalId: "fin-depa", userId: "user-consu" },
    { id: "bag-viaje-piero", goalId: "fin-viaje", userId: "user-piero" },
    { id: "bag-viaje-consu", goalId: "fin-viaje", userId: "user-consu" },
    { id: "bag-jub-piero", goalId: "fin-jubilacion", userId: "user-piero" },
  ],

  fintualEvents: [
    // Depa — bolsas: Piero 4.200.000 · Consu 3.800.000 · variación +612.400
    {
      id: "fd-e1",
      goalId: "fin-depa",
      fecha: "2026-05-01",
      tipo: "deposito",
      bagId: "bag-depa-piero",
      monto: 3_800_000,
      nota: "Saldo inicial",
    },
    {
      id: "fd-e2",
      goalId: "fin-depa",
      fecha: "2026-05-01",
      tipo: "deposito",
      bagId: "bag-depa-consu",
      monto: 3_600_000,
      nota: "Saldo inicial",
    },
    {
      id: "fd-e3",
      goalId: "fin-depa",
      fecha: "2026-05-31",
      tipo: "variacion",
      variacionTotal: 516_200,
    },
    {
      id: "fd-e4",
      goalId: "fin-depa",
      fecha: "2026-06-02",
      tipo: "deposito",
      bagId: "bag-depa-piero",
      monto: 200_000,
    },
    {
      id: "fd-e5",
      goalId: "fin-depa",
      fecha: "2026-06-30",
      tipo: "variacion",
      variacionTotal: 612_400,
    },
    {
      id: "fd-e6",
      goalId: "fin-depa",
      fecha: "2026-07-01",
      tipo: "deposito",
      bagId: "bag-depa-consu",
      monto: 200_000,
    },
    {
      id: "fd-e7",
      goalId: "fin-depa",
      fecha: "2026-07-01",
      tipo: "deposito",
      bagId: "bag-depa-piero",
      monto: 200_000,
    },

    // Viaje Asia — bolsas: 900.000 c/u · variación −24.300
    {
      id: "fv-e1",
      goalId: "fin-viaje",
      fecha: "2026-05-01",
      tipo: "deposito",
      bagId: "bag-viaje-piero",
      monto: 750_000,
      nota: "Saldo inicial",
    },
    {
      id: "fv-e2",
      goalId: "fin-viaje",
      fecha: "2026-05-01",
      tipo: "deposito",
      bagId: "bag-viaje-consu",
      monto: 750_000,
      nota: "Saldo inicial",
    },
    {
      id: "fv-e3",
      goalId: "fin-viaje",
      fecha: "2026-05-31",
      tipo: "variacion",
      variacionTotal: 7_200,
    },
    {
      id: "fv-e4",
      goalId: "fin-viaje",
      fecha: "2026-06-15",
      tipo: "deposito",
      bagId: "bag-viaje-piero",
      monto: 150_000,
    },
    {
      id: "fv-e5",
      goalId: "fin-viaje",
      fecha: "2026-06-15",
      tipo: "deposito",
      bagId: "bag-viaje-consu",
      monto: 150_000,
    },
    {
      id: "fv-e6",
      goalId: "fin-viaje",
      fecha: "2026-06-30",
      tipo: "variacion",
      variacionTotal: -24_300,
    },

    // Jubilación Piero — bolsa única: 2.500.000 · variación +181.700
    {
      id: "fj-e1",
      goalId: "fin-jubilacion",
      fecha: "2026-05-01",
      tipo: "deposito",
      bagId: "bag-jub-piero",
      monto: 2_400_000,
      nota: "Saldo inicial",
    },
    {
      id: "fj-e2",
      goalId: "fin-jubilacion",
      fecha: "2026-05-31",
      tipo: "variacion",
      variacionTotal: 139_600,
    },
    {
      id: "fj-e3",
      goalId: "fin-jubilacion",
      fecha: "2026-06-05",
      tipo: "deposito",
      bagId: "bag-jub-piero",
      monto: 100_000,
    },
    {
      id: "fj-e4",
      goalId: "fin-jubilacion",
      fecha: "2026-06-30",
      tipo: "variacion",
      variacionTotal: 181_700,
    },
  ],

  cashBoxes: [{ id: "caja-casa", nombre: "Caja casa" }],

  cashBoxEvents: [
    // Saldo derivado: 500.000 − 135.000 + 500.000 − 85.000 − 42.500 = 737.500
    {
      id: "cj-e1",
      boxId: "caja-casa",
      fecha: "2026-06-01",
      tipo: "aporte",
      monto: 500_000,
      nota: "Aporte mensual",
    },
    {
      id: "cj-e2",
      boxId: "caja-casa",
      fecha: "2026-06-14",
      tipo: "gasto",
      monto: 135_000,
      descripcion: "Reparación lavadora",
    },
    {
      id: "cj-e3",
      boxId: "caja-casa",
      fecha: "2026-07-01",
      tipo: "aporte",
      monto: 500_000,
      nota: "Aporte mensual",
    },
    {
      id: "cj-e4",
      boxId: "caja-casa",
      fecha: "2026-07-03",
      tipo: "gasto",
      monto: 85_000,
      descripcion: "Gásfiter baño",
    },
    {
      id: "cj-e5",
      boxId: "caja-casa",
      fecha: "2026-07-05",
      tipo: "gasto",
      monto: 42_500,
      descripcion: "Ferretería",
    },
  ],
};

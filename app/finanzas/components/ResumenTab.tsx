"use client";

import { ChevronRight, History, Landmark, TrendingUp, Wallet } from "lucide-react";
import {
  allMovements,
  formatCLP,
  formatDate,
  patrimonio,
  proximoVencimiento,
  totalDap,
  totalFintual,
  type CajaStatus,
  type FinanceState,
  type FintualStatus,
} from "../lib/model";
import type { TabId } from "./FinanzasApp";
import {
  Card,
  GhostButton,
  HeroCard,
  MovementList,
  SectionHeading,
  SectionLabel,
} from "./ui";

type Props = {
  state: FinanceState;
  // Estados de carga de Caja y Fintual (Supabase). Mientras alguno no sea
  // "listo", su parte de state es la proyección vacía y NO puede sumarse al
  // patrimonio como si fuera $0.
  cajaStatus: CajaStatus;
  fintualStatus: FintualStatus;
  onReloadCaja: () => void;
  onReloadFintual: () => void;
  onGoTo: (tab: TabId) => void;
};

export default function ResumenTab({
  state,
  cajaStatus,
  fintualStatus,
  onReloadCaja,
  onReloadFintual,
  onGoTo,
}: Props) {
  const cajaLista = cajaStatus === "listo";
  const fintualListo = fintualStatus === "listo";
  const todoListo = cajaLista && fintualListo;
  const modulosConError = [
    cajaStatus === "error" ? "Caja" : null,
    fintualStatus === "error" ? "Fintual" : null,
  ].filter((m): m is string => m !== null);
  const modulosPendientes = [
    !cajaLista ? "Caja" : null,
    !fintualListo ? "Fintual" : null,
  ].filter((m): m is string => m !== null);
  const reintentar = () => {
    if (cajaStatus === "error") onReloadCaja();
    if (fintualStatus === "error") onReloadFintual();
  };

  const total = patrimonio(state);
  const proximo = proximoVencimiento(state.daps);
  const recientes = allMovements(state).slice(0, 5);

  const desglose = [
    {
      tab: "dap" as const,
      label: "DAP",
      sub: `${state.daps.length} depósitos a plazo`,
      value: totalDap(state.daps) as number | null,
      icon: <Landmark size={16} />,
    },
    {
      tab: "fintual" as const,
      label: "Fintual",
      sub: fintualListo
        ? `${state.fintual.length} objetivos`
        : fintualStatus === "cargando"
          ? "Cargando desde Supabase…"
          : "No se pudo cargar",
      // null = balance aún no disponible: se muestra un placeholder, nunca $0.
      value: fintualListo ? totalFintual(state.fintual) : null,
      icon: <TrendingUp size={16} />,
    },
    {
      tab: "caja" as const,
      label: "Caja casa",
      sub: cajaLista
        ? "Fondo acumulativo para gastos extra"
        : cajaStatus === "cargando"
          ? "Cargando desde Supabase…"
          : "No se pudo cargar",
      // null = saldo aún no disponible: se muestra un placeholder, nunca $0.
      value: cajaLista ? state.caja.saldo : null,
      icon: <Wallet size={16} />,
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-[#e9ebee]">Finanzas</h1>
        <p className="mt-0.5 text-sm text-[#8b929c]">Resumen familiar</p>
      </header>

      <HeroCard className="p-6">
        <SectionLabel>Patrimonio familiar</SectionLabel>
        {todoListo ? (
          <p className="mt-2 text-[2.75rem] font-bold leading-none tracking-tight text-[#e9ebee]">
            {formatCLP(total)}
          </p>
        ) : modulosConError.length > 0 ? (
          <div className="mt-3 space-y-4">
            <p className="text-sm text-[#f87171]">
              El patrimonio total no puede calcularse completamente: los datos
              de {modulosConError.join(" y ")} no se pudieron cargar.
            </p>
            <GhostButton onClick={reintentar}>Reintentar</GhostButton>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[#8b929c]">
            El patrimonio total aún no está completo: cargando datos de{" "}
            {modulosPendientes.join(" y ")}…
          </p>
        )}
        <p className="mt-3 text-xs text-[#6b727c]">
          DAP: datos de prueba · Fintual y Caja casa: datos reales
        </p>
      </HeroCard>

      <div>
        <SectionHeading>Desglose</SectionHeading>
        <Card>
          <ul className="divide-y divide-[#1a1e25]">
            {desglose.map((item) => (
              <li key={item.tab}>
                <button
                  type="button"
                  onClick={() => onGoTo(item.tab)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#23272f] bg-[#171b22] text-[#9aa1ab]">
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-[#e9ebee]">
                      {item.label}
                    </span>
                    <span className="block truncate text-xs text-[#6b727c]">
                      {item.sub}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 text-sm font-bold tabular-nums ${
                      item.value !== null ? "text-[#e9ebee]" : "text-[#6b727c]"
                    }`}
                  >
                    {item.value !== null ? formatCLP(item.value) : "—"}
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-[#4a505a]" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div>
        <SectionHeading
          action={
            <button
              type="button"
              onClick={() => onGoTo("historial")}
              className="flex items-center gap-1 text-xs font-bold text-[#8b929c]"
            >
              <History size={13} />
              Ver todo
            </button>
          }
        >
          Últimos movimientos
        </SectionHeading>
        <Card className="px-5 py-2">
          {!todoListo ? (
            <p className="border-b border-[#1a1e25] py-3 text-xs text-[#8b929c]">
              {modulosConError.length > 0
                ? `Los movimientos de ${modulosConError.join(" y ")} no se pudieron cargar: esta lista está incompleta.`
                : `Los movimientos de ${modulosPendientes.join(" y ")} aún se están cargando y no aparecen aquí.`}
            </p>
          ) : null}
          <MovementList movements={recientes} showSource />
        </Card>
      </div>

      {proximo ? (
        <div>
          <SectionHeading>Próximo vencimiento DAP</SectionHeading>
          <button
            type="button"
            onClick={() => onGoTo("dap")}
            className="block w-full rounded-2xl border border-[#1f242b] bg-[#12151b] p-5 text-left transition-transform active:scale-[0.99]"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[#e9ebee]">
                  {proximo.dap.banco} · {proximo.dap.titular}
                </p>
                <p className="mt-0.5 text-xs text-[#8b929c]">
                  Vence {formatDate(proximo.derived.vencimiento)}
                </p>
              </div>
              <span className="rounded-full border border-[#23272f] bg-[#171b22] px-3 py-1 text-xs font-bold text-[#e9ebee]">
                {proximo.derived.diasRestantes} días
              </span>
            </div>
            <p className="mt-3 text-lg font-bold tabular-nums text-[#e9ebee]">
              {formatCLP(proximo.derived.valorActual)}
            </p>
          </button>
        </div>
      ) : null}
    </div>
  );
}

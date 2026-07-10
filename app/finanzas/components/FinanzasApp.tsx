"use client";

import { useMemo, useReducer, useState } from "react";
import Link from "next/link";
import { ChevronLeft, History, Landmark, LayoutGrid, TrendingUp, Wallet } from "lucide-react";
import { financeReducer, projectFinanceState, useCaja } from "../lib/model";
import { initialFinanceStore } from "../lib/mockData";
import { BackNavProvider, useBackStack } from "./backNav";
import CajaTab from "./CajaTab";
import DapTab from "./DapTab";
import FintualTab from "./FintualTab";
import HistorialTab from "./HistorialTab";
import ResumenTab from "./ResumenTab";

export type TabId = "resumen" | "dap" | "fintual" | "caja" | "historial";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "resumen", label: "Resumen", icon: <LayoutGrid size={20} /> },
  { id: "dap", label: "DAP", icon: <Landmark size={20} /> },
  { id: "fintual", label: "Fintual", icon: <TrendingUp size={20} /> },
  { id: "caja", label: "Caja", icon: <Wallet size={20} /> },
  { id: "historial", label: "Historial", icon: <History size={20} /> },
];

export default function FinanzasApp() {
  // DAP y Fintual siguen sobre el store mock en memoria; Caja se carga desde
  // Supabase (useCaja) y su proyección reemplaza a la del store, que ya no
  // trae eventos de caja. Resumen e Historial consumen así Caja real y
  // DAP/Fintual mock, sin mezclar eventos de ambos orígenes.
  //
  // Mientras useCaja está "cargando" o en "error", cajaConn.caja es la
  // proyección vacía (saldo 0, sin movimientos): las tabs agregadas reciben
  // también cajaConn.status para NO presentar ese vacío como un total o un
  // historial definitivos.
  const [store, dispatch] = useReducer(financeReducer, initialFinanceStore);
  const cajaConn = useCaja();
  const state = useMemo(
    () => ({ ...projectFinanceState(store), caja: cajaConn.caja }),
    [store, cajaConn.caja]
  );
  // Cada tab se remonta al cambiar (key), así los detalles abiertos se cierran
  // al navegar y cada sección parte en su vista raíz.
  const [tab, setTab] = useState<TabId>("resumen");

  // Botón Atrás jerárquico (regla en backNav.tsx): cierra la vista interna
  // más profunda; sin vistas internas vuelve a Resumen; desde Resumen sale
  // al Dashboard Familiar. Solo ese último caso navega fuera del módulo.
  const { register, depth, closeTop } = useBackStack();
  const atRoot = depth === 0 && tab === "resumen";
  const backLabel = depth > 0 ? TABS.find((t) => t.id === tab)!.label : "Resumen";
  const backClass =
    "mb-5 inline-flex items-center gap-1.5 text-xs font-bold text-[#6b727c]";

  return (
    <div className="mx-auto min-h-[100dvh] w-full max-w-[420px] bg-[#0c0e12] text-[#e9ebee]">
      <div className="px-5 pb-32 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
        {atRoot ? (
          <Link
            href="/"
            aria-label="Volver al Dashboard Familiar"
            className={backClass}
          >
            <ChevronLeft size={14} />
            Familia
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => (closeTop ? closeTop() : setTab("resumen"))}
            aria-label={`Volver a ${backLabel}`}
            className={backClass}
          >
            <ChevronLeft size={14} />
            {backLabel}
          </button>
        )}

        <BackNavProvider register={register}>
          {tab === "resumen" ? (
            <ResumenTab
              key="resumen"
              state={state}
              cajaStatus={cajaConn.status}
              onReloadCaja={cajaConn.reload}
              onGoTo={setTab}
            />
          ) : null}
          {tab === "dap" ? (
            <DapTab key="dap" daps={state.daps} dispatch={dispatch} />
          ) : null}
          {tab === "fintual" ? (
            <FintualTab key="fintual" goals={state.fintual} dispatch={dispatch} />
          ) : null}
          {tab === "caja" ? <CajaTab key="caja" conn={cajaConn} /> : null}
          {tab === "historial" ? (
            <HistorialTab key="historial" state={state} cajaStatus={cajaConn.status} />
          ) : null}
        </BackNavProvider>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center">
        <div className="w-full max-w-[420px] border-t border-[#1f242b] bg-[#0f1218]/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 backdrop-blur">
          <ul className="flex">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <li key={t.id} className="flex-1">
                  <button
                    type="button"
                    onClick={() => setTab(t.id)}
                    aria-current={active ? "page" : undefined}
                    className={`flex w-full flex-col items-center gap-1 rounded-xl py-1.5 transition-colors ${
                      active ? "text-[#e9ebee]" : "text-[#5b616b]"
                    }`}
                  >
                    {t.icon}
                    <span className="text-[10px] font-bold">{t.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </div>
  );
}

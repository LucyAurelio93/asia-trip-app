"use client";

import { useMemo, useReducer, useState } from "react";
import Link from "next/link";
import { ChevronLeft, History, Landmark, LayoutGrid, TrendingUp, Wallet } from "lucide-react";
import { financeReducer, projectFinanceState } from "../lib/model";
import { initialFinanceStore } from "../lib/mockData";
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
  // La verdad es el log de eventos (store); la UI consume la proyección.
  const [store, dispatch] = useReducer(financeReducer, initialFinanceStore);
  const state = useMemo(() => projectFinanceState(store), [store]);
  // Cada tab se remonta al cambiar (key), así los detalles abiertos se cierran
  // al navegar y cada sección parte en su vista raíz.
  const [tab, setTab] = useState<TabId>("resumen");

  return (
    <div className="mx-auto min-h-[100dvh] w-full max-w-[420px] bg-[#0c0e12] text-[#e9ebee]">
      <div className="px-5 pb-32 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
        <Link
          href="/"
          aria-label="Volver al Dashboard Familiar"
          className="mb-5 inline-flex items-center gap-1.5 text-xs font-bold text-[#6b727c]"
        >
          <ChevronLeft size={14} />
          Familia
        </Link>

        {tab === "resumen" ? (
          <ResumenTab key="resumen" state={state} onGoTo={setTab} />
        ) : null}
        {tab === "dap" ? (
          <DapTab key="dap" daps={state.daps} dispatch={dispatch} />
        ) : null}
        {tab === "fintual" ? (
          <FintualTab key="fintual" goals={state.fintual} dispatch={dispatch} />
        ) : null}
        {tab === "caja" ? (
          <CajaTab key="caja" caja={state.caja} dispatch={dispatch} />
        ) : null}
        {tab === "historial" ? <HistorialTab key="historial" state={state} /> : null}
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

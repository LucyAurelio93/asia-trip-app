"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import {
  allMovements,
  type CajaStatus,
  type FinanceState,
  type FintualStatus,
  type ModuleId,
} from "../lib/model";
import { Card, MovementList, useMockNotice } from "./ui";

// Historial global: todos los movimientos de DAP, Fintual y Caja.
// Los historiales individuales viven dentro de cada DAP / objetivo Fintual.
// Mientras Caja o Fintual (Supabase) no estén listos, el combinado es
// INCOMPLETO y se advierte de forma explícita: DAP mock se muestra igual.

type Filter = "todos" | ModuleId;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "dap", label: "DAP" },
  { value: "fintual", label: "Fintual" },
  { value: "caja", label: "Caja" },
];

export default function HistorialTab({
  state,
  cajaStatus,
  fintualStatus,
}: {
  state: FinanceState;
  cajaStatus: CajaStatus;
  fintualStatus: FintualStatus;
}) {
  const [filter, setFilter] = useState<Filter>("todos");
  const [notice, setNotice] = useMockNotice();

  const modulosCargando = [
    cajaStatus === "cargando" ? "Caja" : null,
    fintualStatus === "cargando" ? "Fintual" : null,
  ].filter((m): m is string => m !== null);
  const modulosConError = [
    cajaStatus === "error" ? "Caja" : null,
    fintualStatus === "error" ? "Fintual" : null,
  ].filter((m): m is string => m !== null);

  const movements = allMovements(state).filter(
    (m) => filter === "todos" || m.module === filter
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-[#e9ebee]">Historial</h1>
        <p className="mt-0.5 text-sm text-[#8b929c]">
          Todos los movimientos de la familia
        </p>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-bold transition-colors ${
              filter === f.value
                ? "border-[#e9ebee] bg-[#e9ebee] text-[#0c0e12]"
                : "border-[#23272f] bg-[#12151b] text-[#8b929c]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setNotice("Exportar a PDF estará disponible próximamente")}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#23272f] bg-[#12151b] text-xs font-bold text-[#8b929c]"
        >
          <FileText size={15} />
          Exportar PDF
        </button>
        <button
          type="button"
          onClick={() => setNotice("Exportar a Excel estará disponible próximamente")}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#23272f] bg-[#12151b] text-xs font-bold text-[#8b929c]"
        >
          <FileSpreadsheet size={15} />
          Exportar Excel
        </button>
      </div>

      {notice ? (
        <p className="rounded-xl border border-[#1f242b] bg-[#0f1218] px-4 py-3 text-center text-xs text-[#8b929c]">
          {notice}
        </p>
      ) : null}

      {modulosCargando.length > 0 ? (
        <p className="rounded-xl border border-[#1f242b] bg-[#0f1218] px-4 py-3 text-xs text-[#8b929c]">
          Los movimientos de {modulosCargando.join(" y ")} aún se están
          cargando: este historial todavía no los incluye.
        </p>
      ) : null}
      {modulosConError.length > 0 ? (
        <p className="rounded-xl border border-[#3a2429] bg-[#1a1216] px-4 py-3 text-xs text-[#f87171]">
          No se pudieron cargar los movimientos de {modulosConError.join(" y ")}:
          este historial está incompleto. Reintenta desde la pestaña
          correspondiente o desde Resumen.
        </p>
      ) : null}

      <Card className="px-5 py-2">
        <MovementList movements={movements} showSource />
      </Card>
    </div>
  );
}

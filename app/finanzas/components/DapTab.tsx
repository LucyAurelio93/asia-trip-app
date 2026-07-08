"use client";

import { useState } from "react";
import { ChevronRight, History, RefreshCw } from "lucide-react";
import {
  dapChartPoints,
  dapDerived,
  formatCLP,
  formatDate,
  todayISO,
  type Dap,
  type FinanceAction,
} from "../lib/model";
import EvolutionChart from "./EvolutionChart";
import {
  BackHeader,
  Card,
  DateInput,
  DeltaText,
  Field,
  GhostButton,
  HeroCard,
  MoneyInput,
  MovementList,
  NumberInput,
  PrimaryButton,
  SectionHeading,
  SectionLabel,
  Sheet,
  TextInput,
} from "./ui";

type Props = {
  daps: Dap[];
  dispatch: (action: FinanceAction) => void;
};

export default function DapTab({ daps, dispatch }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = daps.find((d) => d.id === selectedId) ?? null;

  if (selected) {
    return (
      <DapDetail
        dap={selected}
        dispatch={dispatch}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-[#e9ebee]">DAP</h1>
        <p className="mt-0.5 text-sm text-[#8b929c]">Depósitos a plazo</p>
      </header>

      <div className="space-y-3">
        {daps.map((dap) => {
          const der = dapDerived(dap);
          return (
            <button
              key={dap.id}
              type="button"
              onClick={() => setSelectedId(dap.id)}
              className="block w-full rounded-2xl border border-[#1f242b] bg-[#12151b] p-5 text-left transition-transform active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-bold text-[#e9ebee]">{dap.banco}</p>
                  <p className="mt-0.5 text-xs text-[#8b929c]">
                    {dap.titular} · {dap.dias} días · {String(dap.tasa).replace(".", ",")}%
                  </p>
                </div>
                <ChevronRight size={18} className="text-[#4a505a]" />
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-xs text-[#6b727c]">Valor actual</p>
                  <p className="text-xl font-bold tabular-nums text-[#e9ebee]">
                    {formatCLP(der.valorActual)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#6b727c]">Vence {formatDate(der.vencimiento)}</p>
                  <p className="text-xs font-semibold text-[#8b929c]">
                    {der.diasRestantes} días restantes
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Detalle de un DAP ────────────────────────────────────────────────────────

function DapDetail({
  dap,
  dispatch,
  onBack,
}: {
  dap: Dap;
  dispatch: (action: FinanceAction) => void;
  onBack: () => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [sheet, setSheet] = useState<"renovar" | "retirar" | null>(null);
  const der = dapDerived(dap);

  if (showHistory) {
    return (
      <div className="space-y-5">
        <BackHeader
          title={`Historial · ${dap.banco}`}
          subtitle="Movimientos de este DAP"
          onBack={() => setShowHistory(false)}
        />
        <Card className="px-5 py-2">
          <MovementList movements={dap.movimientos} />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <BackHeader
        title={dap.banco}
        subtitle={`Titular ${dap.titular}`}
        onBack={onBack}
        right={
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            aria-label="Historial de este DAP"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#23272f] bg-[#12151b] text-[#9aa1ab]"
          >
            <History size={16} />
          </button>
        }
      />

      <HeroCard className="p-6">
        <SectionLabel>Valor actual</SectionLabel>
        <p className="mt-2 text-4xl font-bold tracking-tight text-[#e9ebee]">
          {formatCLP(der.valorActual)}
        </p>
        <div className="mt-5 space-y-2.5 border-t border-[#1f242b] pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-[#8b929c]">Capital vigente</span>
            <span className="font-semibold tabular-nums text-[#e9ebee]">
              {formatCLP(dap.capitalVigente)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8b929c]">Rentabilidad acumulada</span>
            <DeltaText
              value={der.rentabilidadAcumulada}
              className="font-semibold tabular-nums"
            />
          </div>
        </div>
      </HeroCard>

      <Card className="p-5">
        <SectionHeading>Condiciones</SectionHeading>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <InfoItem label="Banco" value={dap.banco} />
          <InfoItem label="Titular" value={dap.titular} />
          <InfoItem label="Tasa" value={`${String(dap.tasa).replace(".", ",")}% período`} />
          <InfoItem label="Plazo" value={`${dap.dias} días`} />
          <InfoItem label="Última renovación" value={formatDate(dap.fechaRenovacion)} />
          <InfoItem
            label="Vencimiento"
            value={`${formatDate(der.vencimiento)} (${der.diasRestantes} días)`}
          />
        </dl>
      </Card>

      <Card className="p-5">
        <SectionHeading>Evolución</SectionHeading>
        <EvolutionChart points={dapChartPoints(dap)} />
      </Card>

      <div className="space-y-3">
        <PrimaryButton onClick={() => setSheet("renovar")}>
          <RefreshCw size={16} />
          Renovar DAP
        </PrimaryButton>
        <GhostButton danger onClick={() => setSheet("retirar")}>
          Retirar
        </GhostButton>
      </div>

      {/* Montados solo al abrir, para que los valores por defecto se recalculen */}
      {sheet === "renovar" ? (
        <RenovarSheet
          dap={dap}
          valorActual={der.valorActual}
          onClose={() => setSheet(null)}
          dispatch={dispatch}
        />
      ) : null}
      {sheet === "retirar" ? (
        <RetirarSheet
          dap={dap}
          valorActual={der.valorActual}
          onClose={() => setSheet(null)}
          dispatch={dispatch}
        />
      ) : null}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[#6b727c]">{label}</dt>
      <dd className="mt-0.5 font-semibold text-[#e9ebee]">{value}</dd>
    </div>
  );
}

// ── Renovar ──────────────────────────────────────────────────────────────────

function RenovarSheet({
  dap,
  valorActual,
  onClose,
  dispatch,
}: {
  dap: Dap;
  valorActual: number;
  onClose: () => void;
  dispatch: (action: FinanceAction) => void;
}) {
  const [fecha, setFecha] = useState(todayISO());
  const [aporte, setAporte] = useState<number | null>(0);
  const [montoTotal, setMontoTotal] = useState<number | null>(valorActual);
  const [dias, setDias] = useState<number | null>(dap.dias);
  const [tasa, setTasa] = useState<number | null>(dap.tasa);

  const sugerido = valorActual + (aporte ?? 0);
  const valid =
    fecha !== "" && (montoTotal ?? 0) > 0 && (dias ?? 0) > 0 && (tasa ?? 0) > 0;

  function submit() {
    if (!valid) return;
    dispatch({
      type: "dap/renovar",
      dapId: dap.id,
      fecha,
      montoTotal: montoTotal!,
      aporte: aporte ?? 0,
      dias: dias!,
      tasa: tasa!,
    });
    onClose();
  }

  return (
    <Sheet open title="Renovar DAP" onClose={onClose}>
      <div className="space-y-4">
        <p className="rounded-xl border border-[#1f242b] bg-[#0f1218] px-4 py-3 text-sm text-[#8b929c]">
          Valor actual hoy:{" "}
          <span className="font-bold tabular-nums text-[#e9ebee]">
            {formatCLP(valorActual)}
          </span>
        </p>
        <Field label="Fecha de renovación">
          <DateInput value={fecha} onChange={setFecha} />
        </Field>
        <Field label="Nuevo aporte">
          <MoneyInput value={aporte} onChange={setAporte} />
        </Field>
        <Field
          label="Monto total nuevo del DAP"
          hint={`Sugerido: ${formatCLP(sugerido)} (valor actual + aporte)`}
        >
          <MoneyInput value={montoTotal} onChange={setMontoTotal} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Días">
            <NumberInput value={dias} onChange={setDias} suffix="días" />
          </Field>
          <Field label="Tasa del período">
            <NumberInput value={tasa} onChange={setTasa} suffix="%" />
          </Field>
        </div>
        <PrimaryButton onClick={submit} disabled={!valid}>
          Confirmar renovación
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

// ── Retirar ──────────────────────────────────────────────────────────────────

function RetirarSheet({
  dap,
  valorActual,
  onClose,
  dispatch,
}: {
  dap: Dap;
  valorActual: number;
  onClose: () => void;
  dispatch: (action: FinanceAction) => void;
}) {
  const [fecha, setFecha] = useState(todayISO());
  const [monto, setMonto] = useState<number | null>(null);
  const [razon, setRazon] = useState("");

  const valid = fecha !== "" && (monto ?? 0) > 0 && (monto ?? 0) <= valorActual;

  function submit() {
    if (!valid) return;
    dispatch({ type: "dap/retirar", dapId: dap.id, fecha, monto: monto!, razon });
    setMonto(null);
    setRazon("");
    onClose();
  }

  return (
    <Sheet open title="Retirar del DAP" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Fecha">
          <DateInput value={fecha} onChange={setFecha} />
        </Field>
        <Field
          label="Monto a retirar"
          hint={`Disponible: ${formatCLP(valorActual)}`}
        >
          <MoneyInput value={monto} onChange={setMonto} />
        </Field>
        <Field label="Razón / descripción">
          <TextInput
            value={razon}
            onChange={setRazon}
            placeholder="Ej: pie del auto, emergencia…"
          />
        </Field>
        <PrimaryButton onClick={submit} disabled={!valid}>
          Confirmar retiro
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

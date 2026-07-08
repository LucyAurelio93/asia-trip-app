"use client";

import { useState } from "react";
import { ChevronRight, History } from "lucide-react";
import {
  bolsaDe,
  formatCLP,
  formatPct,
  formatSignedCLP,
  goalBalance,
  goalDepositado,
  goalVariacionPct,
  todayISO,
  totalFintual,
  type FinanceAction,
  type FintualGoal,
  type Person,
} from "../lib/model";
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
  PillToggle,
  PrimaryButton,
  SectionHeading,
  SectionLabel,
  Sheet,
  TextInput,
} from "./ui";

const YO: Person = "Piero"; // "Mi parte" del mock

type Props = {
  goals: FintualGoal[];
  dispatch: (action: FinanceAction) => void;
};

export default function FintualTab({ goals, dispatch }: Props) {
  const [vista, setVista] = useState<"grupo" | "mi">("grupo");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = goals.find((g) => g.id === selectedId) ?? null;

  if (selected) {
    return (
      <GoalDetail
        goal={selected}
        dispatch={dispatch}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  const depositadoTotal = goals.reduce((s, g) => s + goalDepositado(g), 0);
  const variacionTotal = goals.reduce((s, g) => s + g.variacion, 0);
  const balanceTotal = totalFintual(goals);
  const pctTotal = depositadoTotal > 0 ? (variacionTotal / depositadoTotal) * 100 : 0;

  // "Mi parte" solo suma depósitos propios; la variación nunca se individualiza.
  const miDepositado = goals.reduce((s, g) => s + bolsaDe(g, YO), 0);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#e9ebee]">Fintual</h1>
          <p className="mt-0.5 text-sm text-[#8b929c]">Objetivos de inversión</p>
        </div>
      </header>

      <PillToggle
        options={[
          { value: "grupo", label: "Grupo" },
          { value: "mi", label: "Mi parte" },
        ]}
        value={vista}
        onChange={setVista}
      />

      {vista === "grupo" ? (
        <HeroCard className="p-6">
          <SectionLabel>Balance total</SectionLabel>
          <p className="mt-2 text-4xl font-bold tracking-tight text-[#e9ebee]">
            {formatCLP(balanceTotal)}
          </p>
          <div className="mt-5 space-y-2.5 border-t border-[#1f242b] pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-[#8b929c]">Depositado</span>
              <span className="font-semibold tabular-nums text-[#e9ebee]">
                {formatCLP(depositadoTotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8b929c]">Variación</span>
              <DeltaText
                value={variacionTotal}
                suffix={`(${formatPct(pctTotal)})`}
                className="font-semibold tabular-nums"
              />
            </div>
          </div>
        </HeroCard>
      ) : (
        <HeroCard className="p-6">
          <SectionLabel>Depositado por {YO}</SectionLabel>
          <p className="mt-2 text-4xl font-bold tracking-tight text-[#e9ebee]">
            {formatCLP(miDepositado)}
          </p>
          <p className="mt-3 border-t border-[#1f242b] pt-3 text-xs text-[#6b727c]">
            La variación se muestra solo a nivel del objetivo.
          </p>
        </HeroCard>
      )}

      <div>
        <SectionHeading>Objetivos</SectionHeading>
        <div className="space-y-3">
          {goals.map((goal) => {
            const balance = goalBalance(goal);
            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => setSelectedId(goal.id)}
                className="block w-full rounded-2xl border border-[#1f242b] bg-[#12151b] p-5 text-left transition-transform active:scale-[0.99]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-base font-bold text-[#e9ebee]">
                        {goal.nombre}
                      </p>
                      <span className="shrink-0 rounded-full border border-[#23272f] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#8b929c]">
                        {goal.tipo === "grupal" ? "Grupal" : "Personal"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#6b727c]">
                      {vista === "mi"
                        ? `Total objetivo: ${formatCLP(goalDepositado(goal))}`
                        : `Depositado ${formatCLP(goalDepositado(goal))}`}
                    </p>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-[#4a505a]" />
                </div>
                {vista === "mi" ? (
                  <div className="mt-3 flex items-baseline justify-between">
                    <p className="text-lg font-bold tabular-nums text-[#e9ebee]">
                      {formatCLP(bolsaDe(goal, YO))}
                    </p>
                    <span className="text-xs font-semibold text-[#6b727c]">
                      Mi depositado
                    </span>
                  </div>
                ) : (
                  <div className="mt-3 flex items-baseline justify-between">
                    <p className="text-lg font-bold tabular-nums text-[#e9ebee]">
                      {formatCLP(balance)}
                    </p>
                    <DeltaText
                      value={goal.variacion}
                      suffix={`(${formatPct(goalVariacionPct(goal))})`}
                      className="text-xs font-semibold tabular-nums"
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Detalle de un objetivo ───────────────────────────────────────────────────

type GoalSheet = "deposito" | "retiro" | "variacion";

function GoalDetail({
  goal,
  dispatch,
  onBack,
}: {
  goal: FintualGoal;
  dispatch: (action: FinanceAction) => void;
  onBack: () => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [sheet, setSheet] = useState<GoalSheet | null>(null);

  const depositado = goalDepositado(goal);
  const balance = goalBalance(goal);

  if (showHistory) {
    return (
      <div className="space-y-5">
        <BackHeader
          title={`Historial · ${goal.nombre}`}
          subtitle="Movimientos de este objetivo"
          onBack={() => setShowHistory(false)}
        />
        <Card className="px-5 py-2">
          <MovementList movements={goal.movimientos} />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <BackHeader
        title={goal.nombre}
        subtitle={goal.tipo === "grupal" ? "Objetivo grupal" : "Objetivo personal"}
        onBack={onBack}
        right={
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            aria-label="Historial de este objetivo"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#23272f] bg-[#12151b] text-[#9aa1ab]"
          >
            <History size={16} />
          </button>
        }
      />

      <HeroCard className="p-6">
        <SectionLabel>Balance</SectionLabel>
        <p className="mt-2 text-4xl font-bold tracking-tight text-[#e9ebee]">
          {formatCLP(balance)}
        </p>
        <div className="mt-5 space-y-2.5 border-t border-[#1f242b] pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-[#8b929c]">Depositado</span>
            <span className="font-semibold tabular-nums text-[#e9ebee]">
              {formatCLP(depositado)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8b929c]">Variación</span>
            <DeltaText
              value={goal.variacion}
              suffix={`(${formatPct(goalVariacionPct(goal))})`}
              className="font-semibold tabular-nums"
            />
          </div>
        </div>
      </HeroCard>

      {goal.tipo === "grupal" ? (
        <Card className="p-5">
          <SectionHeading>Bolsas por persona</SectionHeading>
          <div className="space-y-2.5 text-sm">
            {goal.bolsas.map((bolsa) => (
              <div key={bolsa.person} className="flex justify-between">
                <span className="text-[#8b929c]">{bolsa.person}</span>
                <span className="font-semibold tabular-nums text-[#e9ebee]">
                  {formatCLP(bolsa.depositado)}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 border-t border-[#1f242b] pt-3 text-xs text-[#6b727c]">
            Solo depósitos y retiros se separan por bolsa. La variación queda a
            nivel del objetivo.
          </p>
        </Card>
      ) : null}

      <div className="space-y-3">
        <PrimaryButton onClick={() => setSheet("deposito")}>
          Sumar depósito
        </PrimaryButton>
        <div className="grid grid-cols-2 gap-3">
          <GhostButton onClick={() => setSheet("retiro")}>Registrar retiro</GhostButton>
          <GhostButton onClick={() => setSheet("variacion")}>
            Actualizar variación
          </GhostButton>
        </div>
      </div>

      {/* Montados solo al abrir, para que los valores por defecto se recalculen */}
      {sheet === "deposito" ? (
        <MovimientoSheet
          mode="deposito"
          goal={goal}
          onClose={() => setSheet(null)}
          dispatch={dispatch}
        />
      ) : null}
      {sheet === "retiro" ? (
        <MovimientoSheet
          mode="retiro"
          goal={goal}
          onClose={() => setSheet(null)}
          dispatch={dispatch}
        />
      ) : null}
      {sheet === "variacion" ? (
        <VariacionSheet goal={goal} onClose={() => setSheet(null)} dispatch={dispatch} />
      ) : null}
    </div>
  );
}

// ── Depósito / retiro (por bolsa si es grupal) ───────────────────────────────

function MovimientoSheet({
  mode,
  goal,
  onClose,
  dispatch,
}: {
  mode: "deposito" | "retiro";
  goal: FintualGoal;
  onClose: () => void;
  dispatch: (action: FinanceAction) => void;
}) {
  const [fecha, setFecha] = useState(todayISO());
  const [monto, setMonto] = useState<number | null>(null);
  const [person, setPerson] = useState<Person>(goal.bolsas[0].person);
  const [nota, setNota] = useState("");

  const disponible = bolsaDe(goal, person);
  const valid =
    fecha !== "" &&
    (monto ?? 0) > 0 &&
    (mode === "deposito" || (monto ?? 0) <= disponible);

  function submit() {
    if (!valid) return;
    if (mode === "deposito") {
      dispatch({ type: "fintual/deposito", goalId: goal.id, person, fecha, monto: monto! });
    } else {
      dispatch({
        type: "fintual/retiro",
        goalId: goal.id,
        person,
        fecha,
        monto: monto!,
        nota: nota || undefined,
      });
    }
    onClose();
  }

  return (
    <Sheet
      open
      title={mode === "deposito" ? "Sumar depósito" : "Registrar retiro"}
      onClose={onClose}
    >
      <div className="space-y-4">
        <Field label="Fecha">
          <DateInput value={fecha} onChange={setFecha} />
        </Field>
        {goal.tipo === "grupal" ? (
          <Field label="Bolsa">
            <PillToggle
              options={goal.bolsas.map((b) => ({ value: b.person, label: b.person }))}
              value={person}
              onChange={setPerson}
            />
          </Field>
        ) : null}
        <Field
          label="Monto"
          hint={
            mode === "retiro"
              ? `Depositado en la bolsa: ${formatCLP(disponible)}`
              : undefined
          }
        >
          <MoneyInput value={monto} onChange={setMonto} />
        </Field>
        {mode === "retiro" ? (
          <Field label="Nota (opcional)">
            <TextInput value={nota} onChange={setNota} placeholder="Motivo del retiro" />
          </Field>
        ) : null}
        <PrimaryButton onClick={submit} disabled={!valid}>
          {mode === "deposito" ? "Confirmar depósito" : "Confirmar retiro"}
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

// ── Actualizar variación ─────────────────────────────────────────────────────

function VariacionSheet({
  goal,
  onClose,
  dispatch,
}: {
  goal: FintualGoal;
  onClose: () => void;
  dispatch: (action: FinanceAction) => void;
}) {
  const [fecha, setFecha] = useState(todayISO());
  const [signo, setSigno] = useState<"pos" | "neg">(goal.variacion >= 0 ? "pos" : "neg");
  const [monto, setMonto] = useState<number | null>(Math.abs(goal.variacion));

  const nuevaVariacion = (signo === "pos" ? 1 : -1) * (monto ?? 0);
  const valid = fecha !== "" && monto !== null;

  function submit() {
    if (!valid) return;
    dispatch({ type: "fintual/variacion", goalId: goal.id, fecha, nuevaVariacion });
    onClose();
  }

  return (
    <Sheet open title="Actualizar variación" onClose={onClose}>
      <div className="space-y-4">
        <p className="rounded-xl border border-[#1f242b] bg-[#0f1218] px-4 py-3 text-sm text-[#8b929c]">
          Variación actual:{" "}
          <span className="font-bold tabular-nums text-[#e9ebee]">
            {formatSignedCLP(goal.variacion)}
          </span>
        </p>
        <Field label="Fecha">
          <DateInput value={fecha} onChange={setFecha} />
        </Field>
        <Field label="Signo">
          <PillToggle
            options={[
              { value: "pos", label: "Ganancia (+)" },
              { value: "neg", label: "Pérdida (−)" },
            ]}
            value={signo}
            onChange={setSigno}
          />
        </Field>
        <Field
          label="Variación total del objetivo"
          hint="Se reemplaza la variación completa, no se suma."
        >
          <MoneyInput value={monto} onChange={setMonto} />
        </Field>
        <PrimaryButton onClick={submit} disabled={!valid}>
          Guardar variación {formatSignedCLP(nuevaVariacion)}
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

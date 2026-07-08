"use client";

import { useState } from "react";
import {
  formatCLP,
  formatDate,
  todayISO,
  type Caja,
  type FinanceAction,
} from "../lib/model";
import {
  Card,
  DateInput,
  Field,
  GhostButton,
  HeroCard,
  MoneyInput,
  MovementList,
  PrimaryButton,
  SectionHeading,
  SectionLabel,
  Sheet,
  TextInput,
} from "./ui";

type Props = {
  caja: Caja;
  dispatch: (action: FinanceAction) => void;
};

type CajaSheet = "aporte" | "gasto" | "ajuste";

export default function CajaTab({ caja, dispatch }: Props) {
  const [sheet, setSheet] = useState<CajaSheet | null>(null);

  const ultimoAporte = caja.movimientos.find((m) => m.kind === "aporte") ?? null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-[#e9ebee]">Caja casa</h1>
        <p className="mt-0.5 text-sm text-[#8b929c]">
          Fondo acumulativo para gastos extra
        </p>
      </header>

      <HeroCard className="p-6">
        <SectionLabel>Saldo actual</SectionLabel>
        <p className="mt-2 text-4xl font-bold tracking-tight text-[#e9ebee]">
          {formatCLP(caja.saldo)}
        </p>
        <p className="mt-3 border-t border-[#1f242b] pt-3 text-sm text-[#8b929c]">
          {ultimoAporte
            ? `Último aporte: ${formatCLP(ultimoAporte.amount)} · ${formatDate(ultimoAporte.date)}`
            : "Sin aportes registrados"}
        </p>
      </HeroCard>

      <div className="space-y-3">
        <PrimaryButton onClick={() => setSheet("aporte")}>Aporte</PrimaryButton>
        <div className="grid grid-cols-2 gap-3">
          <GhostButton onClick={() => setSheet("gasto")}>Gasto</GhostButton>
          <GhostButton onClick={() => setSheet("ajuste")}>Ajustar saldo</GhostButton>
        </div>
      </div>

      <Card className="px-5 py-3">
        <SectionHeading>Movimientos recientes</SectionHeading>
        <MovementList movements={caja.movimientos} />
      </Card>

      {/* Montados solo al abrir, para que los valores por defecto se recalculen */}
      {sheet === "aporte" ? (
        <AporteSheet onClose={() => setSheet(null)} dispatch={dispatch} />
      ) : null}
      {sheet === "gasto" ? (
        <GastoSheet saldo={caja.saldo} onClose={() => setSheet(null)} dispatch={dispatch} />
      ) : null}
      {sheet === "ajuste" ? (
        <AjusteSheet saldo={caja.saldo} onClose={() => setSheet(null)} dispatch={dispatch} />
      ) : null}
    </div>
  );
}

function AporteSheet({
  onClose,
  dispatch,
}: {
  onClose: () => void;
  dispatch: (action: FinanceAction) => void;
}) {
  const [fecha, setFecha] = useState(todayISO());
  const [monto, setMonto] = useState<number | null>(500_000);
  const [nota, setNota] = useState("Aporte mensual");

  const valid = fecha !== "" && (monto ?? 0) > 0;

  return (
    <Sheet open title="Aporte a caja" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Fecha">
          <DateInput value={fecha} onChange={setFecha} />
        </Field>
        <Field label="Monto" hint="Aporte habitual: $500.000 al mes">
          <MoneyInput value={monto} onChange={setMonto} />
        </Field>
        <Field label="Nota (opcional)">
          <TextInput value={nota} onChange={setNota} />
        </Field>
        <PrimaryButton
          disabled={!valid}
          onClick={() => {
            dispatch({ type: "caja/aporte", fecha, monto: monto!, nota: nota || undefined });
            onClose();
          }}
        >
          Confirmar aporte
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

function GastoSheet({
  saldo,
  onClose,
  dispatch,
}: {
  saldo: number;
  onClose: () => void;
  dispatch: (action: FinanceAction) => void;
}) {
  const [fecha, setFecha] = useState(todayISO());
  const [monto, setMonto] = useState<number | null>(null);
  const [descripcion, setDescripcion] = useState("");

  const valid = fecha !== "" && (monto ?? 0) > 0 && descripcion.trim() !== "";

  return (
    <Sheet open title="Gasto de casa" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Fecha">
          <DateInput value={fecha} onChange={setFecha} />
        </Field>
        <Field label="Monto" hint={`Saldo disponible: ${formatCLP(saldo)}`}>
          <MoneyInput value={monto} onChange={setMonto} />
        </Field>
        <Field label="Descripción">
          <TextInput
            value={descripcion}
            onChange={setDescripcion}
            placeholder="Ej: gásfiter, ferretería…"
          />
        </Field>
        <PrimaryButton
          disabled={!valid}
          onClick={() => {
            dispatch({ type: "caja/gasto", fecha, monto: monto!, descripcion: descripcion.trim() });
            onClose();
          }}
        >
          Confirmar gasto
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

function AjusteSheet({
  saldo,
  onClose,
  dispatch,
}: {
  saldo: number;
  onClose: () => void;
  dispatch: (action: FinanceAction) => void;
}) {
  const [fecha, setFecha] = useState(todayISO());
  const [nuevoSaldo, setNuevoSaldo] = useState<number | null>(saldo);
  const [nota, setNota] = useState("");

  const valid = fecha !== "" && nuevoSaldo !== null;

  return (
    <Sheet open title="Ajustar saldo" onClose={onClose}>
      <div className="space-y-4">
        <p className="rounded-xl border border-[#1f242b] bg-[#0f1218] px-4 py-3 text-sm text-[#8b929c]">
          Saldo actual:{" "}
          <span className="font-bold tabular-nums text-[#e9ebee]">{formatCLP(saldo)}</span>
        </p>
        <Field label="Fecha">
          <DateInput value={fecha} onChange={setFecha} />
        </Field>
        <Field label="Nuevo saldo">
          <MoneyInput value={nuevoSaldo} onChange={setNuevoSaldo} />
        </Field>
        <Field label="Nota (opcional)">
          <TextInput value={nota} onChange={setNota} placeholder="Motivo del ajuste" />
        </Field>
        <PrimaryButton
          disabled={!valid}
          onClick={() => {
            dispatch({
              type: "caja/ajuste",
              fecha,
              nuevoSaldo: nuevoSaldo!,
              nota: nota || undefined,
            });
            onClose();
          }}
        >
          Guardar ajuste
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

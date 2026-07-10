"use client";

// Caja conectada a Supabase (única tab de Finanzas con datos reales):
// lee cajas/eventos vía useCaja, inserta con autor real y recarga tras cada
// escritura. Los formularios devuelven el error de la base si el insert fue
// rechazado y el saldo mostrado nunca se adelanta a lo persistido.

import { useState } from "react";
import {
  formatCLP,
  formatDate,
  todayISO,
  type UseCajaResult,
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
  useMockNotice,
} from "./ui";

type Props = {
  conn: UseCajaResult;
};

type CajaSheet = "crear" | "aporte" | "gasto" | "ajuste";

function CajaHeader({ subtitle }: { subtitle: string }) {
  return (
    <header>
      <h1 className="text-2xl font-bold tracking-tight text-[#e9ebee]">Caja casa</h1>
      <p className="mt-0.5 text-sm text-[#8b929c]">{subtitle}</p>
    </header>
  );
}

export default function CajaTab({ conn }: Props) {
  const {
    status,
    errorCarga,
    box,
    caja,
    guardando,
    reload,
    crearCaja,
    registrarAporte,
    registrarGasto,
    registrarAjuste,
  } = conn;
  const [sheet, setSheet] = useState<CajaSheet | null>(null);
  const [notice, setNotice] = useMockNotice();

  // Envuelve un comando: si la base aceptó, cierra el sheet y confirma;
  // si no, devuelve el error para mostrarlo dentro del formulario.
  const submit =
    <T,>(comando: (input: T) => Promise<string | null>, confirmacion: string) =>
    async (input: T): Promise<string | null> => {
      const error = await comando(input);
      if (!error) {
        setSheet(null);
        setNotice(confirmacion);
      }
      return error;
    };

  if (status === "cargando") {
    return (
      <div className="space-y-6">
        <CajaHeader subtitle="Fondo acumulativo para gastos extra" />
        <Card className="p-6">
          <p className="text-center text-sm text-[#8b929c]">Cargando caja…</p>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="space-y-6">
        <CajaHeader subtitle="Fondo acumulativo para gastos extra" />
        <Card className="space-y-4 p-6">
          <p className="text-sm text-[#f87171]">{errorCarga}</p>
          <PrimaryButton onClick={reload}>Reintentar</PrimaryButton>
        </Card>
      </div>
    );
  }

  // Estado vacío: aún no existe ninguna caja en la base.
  if (!box) {
    return (
      <div className="space-y-6">
        <CajaHeader subtitle="Fondo acumulativo para gastos extra" />
        <Card className="space-y-4 p-6 text-center">
          <p className="text-sm text-[#8b929c]">
            Todavía no hay una caja creada. Crea la primera para empezar a
            registrar aportes y gastos.
          </p>
          <PrimaryButton onClick={() => setSheet("crear")}>
            Crear la primera caja
          </PrimaryButton>
        </Card>
        {notice ? <NoticeBanner text={notice} /> : null}
        {sheet === "crear" ? (
          <CrearCajaSheet
            onClose={() => setSheet(null)}
            guardando={guardando}
            onSubmit={submit(crearCaja, "Caja creada")}
          />
        ) : null}
      </div>
    );
  }

  const ultimoAporte = caja.movimientos.find((m) => m.kind === "aporte") ?? null;

  return (
    <div className="space-y-6">
      <CajaHeader subtitle="Fondo acumulativo para gastos extra" />

      <HeroCard className="p-6">
        <SectionLabel>Saldo actual · {box.nombre}</SectionLabel>
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
        <PrimaryButton disabled={guardando} onClick={() => setSheet("aporte")}>
          Aporte
        </PrimaryButton>
        <div className="grid grid-cols-2 gap-3">
          <GhostButton disabled={guardando} onClick={() => setSheet("gasto")}>
            Gasto
          </GhostButton>
          <GhostButton disabled={guardando} onClick={() => setSheet("ajuste")}>
            Ajustar saldo
          </GhostButton>
        </div>
      </div>

      {notice ? <NoticeBanner text={notice} /> : null}

      <div>
        <SectionHeading>Movimientos recientes</SectionHeading>
        <Card className="px-5 py-2">
          <MovementList movements={caja.movimientos} />
        </Card>
      </div>

      {/* Montados solo al abrir, para que los valores por defecto se recalculen */}
      {sheet === "aporte" ? (
        <AporteSheet
          onClose={() => setSheet(null)}
          guardando={guardando}
          onSubmit={submit(registrarAporte, "Aporte registrado")}
        />
      ) : null}
      {sheet === "gasto" ? (
        <GastoSheet
          saldo={caja.saldo}
          onClose={() => setSheet(null)}
          guardando={guardando}
          onSubmit={submit(registrarGasto, "Gasto registrado")}
        />
      ) : null}
      {sheet === "ajuste" ? (
        <AjusteSheet
          saldo={caja.saldo}
          onClose={() => setSheet(null)}
          guardando={guardando}
          onSubmit={submit(registrarAjuste, "Ajuste guardado")}
        />
      ) : null}
    </div>
  );
}

// Confirmación efímera tras una escritura aceptada por la base.
function NoticeBanner({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-[#1d3a30] bg-[#12211c] px-4 py-3 text-center text-xs font-semibold text-[#34d399]">
      {text}
    </p>
  );
}

function SheetError({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p className="rounded-xl border border-[#3a2429] bg-[#1a1216] px-4 py-3 text-sm text-[#f87171]">
      {text}
    </p>
  );
}

// Estado común de envío de los sheets: bloquea el botón mientras guarda y
// muestra el error si Supabase rechazó la escritura (el sheet queda abierto).
function useSheetSubmit<T>(onSubmit: (input: T) => Promise<string | null>) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async (input: T) => {
    setEnviando(true);
    setError(null);
    const err = await onSubmit(input);
    if (err) {
      setError(err);
      setEnviando(false);
    }
    // En éxito el padre cierra el sheet: no hace falta re-habilitar.
  };

  return { enviando, error, handle };
}

function CrearCajaSheet({
  onClose,
  guardando,
  onSubmit,
}: {
  onClose: () => void;
  guardando: boolean;
  onSubmit: (nombre: string) => Promise<string | null>;
}) {
  const [nombre, setNombre] = useState("Caja casa");
  const { enviando, error, handle } = useSheetSubmit(onSubmit);

  const valid = nombre.trim() !== "";

  return (
    <Sheet open title="Crear caja" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Nombre" hint="Ej: Caja casa">
          <TextInput value={nombre} onChange={setNombre} />
        </Field>
        <SheetError text={error} />
        <PrimaryButton
          disabled={!valid || enviando || guardando}
          onClick={() => void handle(nombre.trim())}
        >
          {enviando ? "Creando…" : "Crear caja"}
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

type AporteInput = { fecha: string; monto: number; nota?: string };

function AporteSheet({
  onClose,
  guardando,
  onSubmit,
}: {
  onClose: () => void;
  guardando: boolean;
  onSubmit: (input: AporteInput) => Promise<string | null>;
}) {
  const [fecha, setFecha] = useState(todayISO());
  const [monto, setMonto] = useState<number | null>(500_000);
  const [nota, setNota] = useState("Aporte mensual");
  const { enviando, error, handle } = useSheetSubmit(onSubmit);

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
        <SheetError text={error} />
        <PrimaryButton
          disabled={!valid || enviando || guardando}
          onClick={() => void handle({ fecha, monto: monto!, nota: nota || undefined })}
        >
          {enviando ? "Guardando…" : "Confirmar aporte"}
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

type GastoInput = { fecha: string; monto: number; descripcion: string };

function GastoSheet({
  saldo,
  onClose,
  guardando,
  onSubmit,
}: {
  saldo: number;
  onClose: () => void;
  guardando: boolean;
  onSubmit: (input: GastoInput) => Promise<string | null>;
}) {
  const [fecha, setFecha] = useState(todayISO());
  const [monto, setMonto] = useState<number | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const { enviando, error, handle } = useSheetSubmit(onSubmit);

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
        <SheetError text={error} />
        <PrimaryButton
          disabled={!valid || enviando || guardando}
          onClick={() =>
            void handle({ fecha, monto: monto!, descripcion: descripcion.trim() })
          }
        >
          {enviando ? "Guardando…" : "Confirmar gasto"}
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

type AjusteInput = { fecha: string; nuevoSaldo: number; nota?: string };

function AjusteSheet({
  saldo,
  onClose,
  guardando,
  onSubmit,
}: {
  saldo: number;
  onClose: () => void;
  guardando: boolean;
  onSubmit: (input: AjusteInput) => Promise<string | null>;
}) {
  const [fecha, setFecha] = useState(todayISO());
  const [nuevoSaldo, setNuevoSaldo] = useState<number | null>(saldo);
  const [nota, setNota] = useState("");
  const { enviando, error, handle } = useSheetSubmit(onSubmit);

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
        <SheetError text={error} />
        <PrimaryButton
          disabled={!valid || enviando || guardando}
          onClick={() =>
            void handle({ fecha, nuevoSaldo: nuevoSaldo!, nota: nota || undefined })
          }
        >
          {enviando ? "Guardando…" : "Guardar ajuste"}
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

"use client";

// Fintual conectado a Supabase: lee objetivos/bolsas/eventos vía useFintual,
// inserta con autor real y recarga tras cada escritura. Los formularios
// muestran el error de la base si el insert fue rechazado (quedan abiertos)
// y los balances mostrados nunca se adelantan a lo persistido.
//
// Los objetivos se crean desde esta tab vía conn.crearObjetivo (RPC atómica
// create_fintual_goal: objetivo + bolsas en una sola transacción). Depósitos,
// retiros y variaciones se registran solo sobre bolsas ya existentes.

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
  type FintualGoal,
  type FintualWriteResult,
  type Person,
  type UseFintualResult,
  type User,
} from "../lib/model";
import { useBackView } from "./backNav";
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
  useMockNotice,
} from "./ui";

type Props = {
  conn: UseFintualResult;
};

function FintualHeader() {
  return (
    <header className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#e9ebee]">Fintual</h1>
        <p className="mt-0.5 text-sm text-[#8b929c]">Objetivos de inversión</p>
      </div>
    </header>
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

// Aviso persistente para "se guardó, pero no se pudo refrescar la vista":
// NO es efímero porque el usuario debe leerlo antes de recargar.
function WarningBanner({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-[#3a2429] bg-[#1a1216] px-4 py-3 text-xs text-[#f87171]">
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

// Traduce el resultado de un comando de useFintual al contrato de los sheets:
// null cierra el sheet (guardado; si además falló el refresco, el aviso se
// muestra fuera); string deja el sheet abierto mostrando el error.
function useWriteFeedback() {
  const [notice, setNotice] = useMockNotice();
  const [aviso, setAviso] = useState<string | null>(null);

  const wrap =
    <T,>(
      comando: (input: T) => Promise<FintualWriteResult>,
      confirmacion: string,
      onDone: () => void
    ) =>
    async (input: T): Promise<string | null> => {
      const result = await comando(input);
      if (result && !result.guardado) return result.mensaje;
      onDone();
      if (result) {
        // Guardado, pero el refresco falló: aviso persistente, no confirmación.
        setAviso(result.mensaje);
      } else {
        setAviso(null);
        setNotice(confirmacion);
      }
      return null;
    };

  return { notice, aviso, wrap };
}

export default function FintualTab({ conn }: Props) {
  const { status, errorCarga, goals, users, currentPerson, guardando, reload, crearObjetivo } =
    conn;
  const [vista, setVista] = useState<"grupo" | "mi">("grupo");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  // Feedback de crearObjetivo: confirmación efímera o aviso persistente si el
  // guardado pasó pero el refresco falló (mismo contrato que en GoalDetail).
  const { notice, aviso, wrap } = useWriteFeedback();

  const selected = goals.find((g) => g.id === selectedId) ?? null;
  // El detalle abierto participa del Atrás global (ver backNav.tsx).
  useBackView(selected !== null, () => setSelectedId(null));

  if (status === "cargando") {
    return (
      <div className="space-y-6">
        <FintualHeader />
        <Card className="p-6">
          <p className="text-center text-sm text-[#8b929c]">Cargando objetivos…</p>
        </Card>
      </div>
    );
  }

  // Sin persona autenticada resuelta no hay "Mi parte" válida: useFintual
  // deja la carga en error si la sesión no está vinculada, así que el caso
  // currentPerson === null con status "listo" es solo defensa extra.
  if (status === "error" || currentPerson === null) {
    return (
      <div className="space-y-6">
        <FintualHeader />
        {/* Si la escritura pasó pero el refresco falló, la vista cae aquí:
            el aviso persistente aclara que NO hay que reintentar el guardado. */}
        {aviso ? <WarningBanner text={aviso} /> : null}
        <Card className="space-y-4 p-6">
          <p className="text-sm text-[#f87171]">
            {errorCarga ??
              "No se pudo identificar tu usuario de la familia. Recarga e intenta de nuevo."}
          </p>
          <PrimaryButton onClick={reload}>Reintentar</PrimaryButton>
        </Card>
      </div>
    );
  }

  if (selected) {
    return <GoalDetail goal={selected} conn={conn} onBack={() => setSelectedId(null)} />;
  }

  // El sheet de creación se comparte entre el estado vacío y la lista; se
  // monta solo al abrir para que el formulario arranque limpio cada vez.
  const cerrarCrear = () => setCreando(false);
  const crearSheet = creando ? (
    <CrearObjetivoSheet
      users={users}
      currentPerson={currentPerson}
      guardando={guardando}
      onClose={cerrarCrear}
      onSubmit={wrap(crearObjetivo, "Objetivo creado", cerrarCrear)}
    />
  ) : null;

  // Estado vacío: aún no existe ningún objetivo en la base.
  if (goals.length === 0) {
    return (
      <div className="space-y-6">
        <FintualHeader />
        {notice ? <NoticeBanner text={notice} /> : null}
        {aviso ? <WarningBanner text={aviso} /> : null}
        <Card className="space-y-4 p-6 text-center">
          <p className="text-sm text-[#8b929c]">
            Todavía no hay objetivos configurados. Crea el primero para empezar
            a registrar depósitos, retiros y variaciones.
          </p>
          <PrimaryButton disabled={guardando} onClick={() => setCreando(true)}>
            Crear primer objetivo
          </PrimaryButton>
        </Card>
        {crearSheet}
      </div>
    );
  }

  const depositadoTotal = goals.reduce((s, g) => s + goalDepositado(g), 0);
  const variacionTotal = goals.reduce((s, g) => s + g.variacion, 0);
  const balanceTotal = totalFintual(goals);
  const pctTotal = depositadoTotal > 0 ? (variacionTotal / depositadoTotal) * 100 : 0;

  // "Mi parte" = la persona autenticada: solo suma sus depósitos; la
  // variación nunca se individualiza.
  const miDepositado = goals.reduce((s, g) => s + bolsaDe(g, currentPerson), 0);

  return (
    <div className="space-y-6">
      <FintualHeader />

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
          <SectionLabel>Depositado por {currentPerson}</SectionLabel>
          <p className="mt-2 text-4xl font-bold tracking-tight text-[#e9ebee]">
            {formatCLP(miDepositado)}
          </p>
          <p className="mt-3 border-t border-[#1f242b] pt-3 text-xs text-[#6b727c]">
            La variación se muestra solo a nivel del objetivo.
          </p>
        </HeroCard>
      )}

      {notice ? <NoticeBanner text={notice} /> : null}
      {aviso ? <WarningBanner text={aviso} /> : null}

      <div>
        <SectionHeading
          action={
            <button
              type="button"
              onClick={() => setCreando(true)}
              disabled={guardando}
              className="rounded-full border border-[#23272f] bg-[#12151b] px-3 py-1 text-xs font-bold text-[#e9ebee] transition-transform active:scale-95 disabled:opacity-40"
            >
              Nuevo objetivo
            </button>
          }
        >
          Objetivos
        </SectionHeading>
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
                      {formatCLP(bolsaDe(goal, currentPerson))}
                    </p>
                    <span className="text-xs font-semibold text-[#6b727c]">
                      Depositado por {currentPerson}
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

      {crearSheet}
    </div>
  );
}

// ── Crear objetivo ───────────────────────────────────────────────────────────

type CrearObjetivoInput = {
  nombre: string;
  tipo: "grupal" | "personal";
  titular?: Person;
};

function CrearObjetivoSheet({
  users,
  currentPerson,
  guardando,
  onClose,
  onSubmit,
}: {
  users: User[];
  currentPerson: Person;
  guardando: boolean;
  onClose: () => void;
  onSubmit: (input: CrearObjetivoInput) => Promise<string | null>;
}) {
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<"grupal" | "personal">("grupal");
  // El titular solo aplica a objetivos personales; parte en la persona
  // autenticada, que siempre existe en users (el snapshot la validó al cargar).
  const [titular, setTitular] = useState<Person>(currentPerson);
  const { enviando, error, handle } = useSheetSubmit(onSubmit);

  const valid = nombre.trim() !== "";

  return (
    <Sheet open title="Nuevo objetivo" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Nombre">
          <TextInput
            value={nombre}
            onChange={setNombre}
            placeholder="Ej: Fondo de emergencia"
          />
        </Field>
        <Field
          label="Tipo"
          hint={
            tipo === "grupal"
              ? "Se crea una bolsa por cada persona de la familia."
              : "Se crea una sola bolsa a nombre del titular."
          }
        >
          <PillToggle
            options={[
              { value: "grupal", label: "Grupal" },
              { value: "personal", label: "Personal" },
            ]}
            value={tipo}
            onChange={setTipo}
          />
        </Field>
        {tipo === "personal" ? (
          <Field label="Titular">
            <PillToggle
              options={users.map((u) => ({ value: u.nombre, label: u.nombre }))}
              value={titular}
              onChange={setTitular}
            />
          </Field>
        ) : null}
        <SheetError text={error} />
        <PrimaryButton
          disabled={!valid || enviando || guardando}
          onClick={() =>
            void handle({
              nombre: nombre.trim(),
              tipo,
              titular: tipo === "personal" ? titular : undefined,
            })
          }
        >
          {enviando ? "Guardando…" : "Crear objetivo"}
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

// ── Detalle de un objetivo ───────────────────────────────────────────────────

type GoalSheet = "deposito" | "retiro" | "variacion";

function GoalDetail({
  goal,
  conn,
  onBack,
}: {
  goal: FintualGoal;
  conn: UseFintualResult;
  onBack: () => void;
}) {
  const { guardando, registrarDeposito, registrarRetiro, registrarVariacion } = conn;
  const [showHistory, setShowHistory] = useState(false);
  const [sheet, setSheet] = useState<GoalSheet | null>(null);
  const { notice, aviso, wrap } = useWriteFeedback();
  // El historial del objetivo es un nivel más profundo que el detalle; los
  // sheets se registran solos (ver Sheet en ui.tsx) como el nivel más profundo.
  useBackView(showHistory, () => setShowHistory(false));

  const depositado = goalDepositado(goal);
  const balance = goalBalance(goal);
  const cerrarSheet = () => setSheet(null);

  // Objetivo sin bolsas: estructura incompleta en la base (las bolsas se
  // crean manualmente junto con el objetivo). No hay dónde depositar ni de
  // dónde retirar, y la UI no debe "elegir" un titular que la base no define.
  const sinBolsas = goal.bolsas.length === 0;

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

      {goal.tipo === "grupal" && !sinBolsas ? (
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

      {sinBolsas ? (
        <WarningBanner text="Este objetivo no tiene bolsas configuradas en la base: no se pueden registrar depósitos ni retiros hasta que se creen sus bolsas en Supabase." />
      ) : null}

      {notice ? <NoticeBanner text={notice} /> : null}
      {aviso ? <WarningBanner text={aviso} /> : null}

      <div className="space-y-3">
        <PrimaryButton
          disabled={guardando || sinBolsas}
          onClick={() => setSheet("deposito")}
        >
          Sumar depósito
        </PrimaryButton>
        <div className="grid grid-cols-2 gap-3">
          <GhostButton
            disabled={guardando || sinBolsas}
            onClick={() => setSheet("retiro")}
          >
            Registrar retiro
          </GhostButton>
          <GhostButton disabled={guardando} onClick={() => setSheet("variacion")}>
            Actualizar variación
          </GhostButton>
        </div>
      </div>

      {/* Montados solo al abrir, para que los valores por defecto se recalculen.
          Depósito/retiro exigen bolsas existentes (botones deshabilitados si
          sinBolsas), así que goal.bolsas nunca está vacío dentro del sheet. */}
      {sheet === "deposito" && !sinBolsas ? (
        <MovimientoSheet
          mode="deposito"
          goal={goal}
          guardando={guardando}
          onClose={cerrarSheet}
          onSubmit={wrap(registrarDeposito, "Depósito registrado", cerrarSheet)}
        />
      ) : null}
      {sheet === "retiro" && !sinBolsas ? (
        <MovimientoSheet
          mode="retiro"
          goal={goal}
          guardando={guardando}
          onClose={cerrarSheet}
          onSubmit={wrap(registrarRetiro, "Retiro registrado", cerrarSheet)}
        />
      ) : null}
      {sheet === "variacion" ? (
        <VariacionSheet
          goal={goal}
          guardando={guardando}
          onClose={cerrarSheet}
          onSubmit={wrap(registrarVariacion, "Variación guardada", cerrarSheet)}
        />
      ) : null}
    </div>
  );
}

// ── Depósito / retiro (por bolsa si es grupal) ───────────────────────────────

type MovimientoInput = {
  goalId: string;
  person: Person;
  fecha: string;
  monto: number;
  nota?: string;
};

function MovimientoSheet({
  mode,
  goal,
  guardando,
  onClose,
  onSubmit,
}: {
  mode: "deposito" | "retiro";
  goal: FintualGoal;
  guardando: boolean;
  onClose: () => void;
  onSubmit: (input: MovimientoInput) => Promise<string | null>;
}) {
  // Solo personas con bolsa EXISTENTE en el objetivo: un personal ofrece
  // únicamente a su titular real y un grupal a quienes tengan bolsa creada.
  // La UI nunca inventa titulares ni bolsas.
  const persons = goal.bolsas.map((b) => b.person);

  const [fecha, setFecha] = useState(todayISO());
  const [monto, setMonto] = useState<number | null>(null);
  const [person, setPerson] = useState<Person>(persons[0]);
  const [nota, setNota] = useState("");
  const { enviando, error, handle } = useSheetSubmit(onSubmit);

  const disponible = bolsaDe(goal, person);
  const valid =
    fecha !== "" &&
    (monto ?? 0) > 0 &&
    (mode === "deposito" || (monto ?? 0) <= disponible);

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
        {persons.length > 1 ? (
          <Field label="Bolsa">
            <PillToggle
              options={persons.map((p) => ({ value: p, label: p }))}
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
        <SheetError text={error} />
        <PrimaryButton
          disabled={!valid || enviando || guardando}
          onClick={() =>
            void handle({
              goalId: goal.id,
              person,
              fecha,
              monto: monto!,
              nota: mode === "retiro" ? nota || undefined : undefined,
            })
          }
        >
          {enviando
            ? "Guardando…"
            : mode === "deposito"
              ? "Confirmar depósito"
              : "Confirmar retiro"}
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

// ── Actualizar variación ─────────────────────────────────────────────────────

type VariacionInput = { goalId: string; fecha: string; variacionTotal: number };

function VariacionSheet({
  goal,
  guardando,
  onClose,
  onSubmit,
}: {
  goal: FintualGoal;
  guardando: boolean;
  onClose: () => void;
  onSubmit: (input: VariacionInput) => Promise<string | null>;
}) {
  const [fecha, setFecha] = useState(todayISO());
  const [signo, setSigno] = useState<"pos" | "neg">(goal.variacion >= 0 ? "pos" : "neg");
  const [monto, setMonto] = useState<number | null>(Math.abs(goal.variacion));
  const { enviando, error, handle } = useSheetSubmit(onSubmit);

  const nuevaVariacion = (signo === "pos" ? 1 : -1) * (monto ?? 0);
  const valid = fecha !== "" && monto !== null;

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
        <SheetError text={error} />
        <PrimaryButton
          disabled={!valid || enviando || guardando}
          onClick={() =>
            void handle({ goalId: goal.id, fecha, variacionTotal: nuevaVariacion })
          }
        >
          {enviando
            ? "Guardando…"
            : `Guardar variación ${formatSignedCLP(nuevaVariacion)}`}
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

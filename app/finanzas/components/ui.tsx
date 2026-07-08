"use client";

import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, RefreshCw, Settings2, X } from "lucide-react";
import {
  formatCLP,
  formatDateShort,
  formatSignedCLP,
  type Movement,
} from "../lib/model";

// Primitivas visuales del módulo Finanzas.
// Tokens: fondo #0c0e12 · card #12151b · bordes #23272f/#1f242b
// texto #e9ebee / #8b929c / #6b727c · positivo #34d399 · negativo #f87171

// ── Contenedores ─────────────────────────────────────────────────────────────

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-[#1f242b] bg-[#12151b] ${className}`}
    >
      {children}
    </section>
  );
}

export function HeroCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-[#23272f] bg-gradient-to-b from-[#161a21] to-[#12151b] ${className}`}
    >
      {children}
    </section>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b929c]">
      {children}
    </p>
  );
}

export function SectionHeading({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="text-sm font-bold text-[#e9ebee]">{children}</h2>
      {action}
    </div>
  );
}

// ── Cabeceras de vista ───────────────────────────────────────────────────────

export function BackHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  right?: React.ReactNode;
}) {
  return (
    <header className="flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        aria-label="Volver"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#23272f] bg-[#12151b] text-[#9aa1ab] transition-transform active:scale-95"
      >
        <ChevronLeft size={18} />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-bold tracking-tight text-[#e9ebee]">
          {title}
        </h1>
        {subtitle ? (
          <p className="truncate text-xs text-[#8b929c]">{subtitle}</p>
        ) : null}
      </div>
      {right}
    </header>
  );
}

// ── Cifras ───────────────────────────────────────────────────────────────────

export function DeltaText({
  value,
  suffix,
  className = "",
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const color = value >= 0 ? "text-[#34d399]" : "text-[#f87171]";
  return (
    <span className={`${color} ${className}`}>
      {formatSignedCLP(value)}
      {suffix ? <span className="opacity-80"> {suffix}</span> : null}
    </span>
  );
}

// ── Botones ──────────────────────────────────────────────────────────────────

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#e9ebee] text-sm font-bold text-[#0c0e12] transition-transform active:scale-[0.98] disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl border text-sm font-bold transition-transform active:scale-[0.98] ${
        danger
          ? "border-[#3a2429] bg-[#1a1216] text-[#f87171]"
          : "border-[#23272f] bg-[#12151b] text-[#e9ebee]"
      }`}
    >
      {children}
    </button>
  );
}

export function PillToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-full border border-[#23272f] bg-[#0f1218] p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
            value === opt.value
              ? "bg-[#e9ebee] text-[#0c0e12]"
              : "text-[#8b929c]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Formularios ──────────────────────────────────────────────────────────────

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-[#8b929c]">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-[#6b727c]">{hint}</span> : null}
    </label>
  );
}

const inputClass =
  "h-12 w-full rounded-xl border border-[#23272f] bg-[#0f1218] px-4 text-base text-[#e9ebee] outline-none placeholder:text-[#4a505a] focus:border-[#3987e5]";

export function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputClass}
    />
  );
}

export function DateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputClass} [color-scheme:dark]`}
    />
  );
}

export function NumberInput({
  value,
  onChange,
  placeholder,
  suffix,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  suffix?: string;
}) {
  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        value={value === null ? "" : String(value).replace(".", ",")}
        onChange={(e) => {
          const raw = e.target.value.replace(",", ".").replace(/[^0-9.]/g, "");
          onChange(raw === "" ? null : Number(raw));
        }}
        placeholder={placeholder}
        className={inputClass}
      />
      {suffix ? (
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-[#6b727c]">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

// Monto en CLP: formatea miles con punto mientras se escribe.
export function MoneyInput({
  value,
  onChange,
  placeholder = "0",
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
}) {
  const display =
    value === null ? "" : Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-base text-[#6b727c]">
        $
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          onChange(digits === "" ? null : Number(digits));
        }}
        placeholder={placeholder}
        className={`${inputClass} pl-8 tabular-nums`}
      />
    </div>
  );
}

// ── Sheet (modal inferior) ───────────────────────────────────────────────────

export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // Evita el scroll del fondo mientras el sheet está abierto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-black/70"
      />
      <div className="relative w-full max-w-[420px] rounded-t-3xl border-t border-x border-[#23272f] bg-[#12151b] px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-5">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#2a2f38]" />
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#e9ebee]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#23272f] text-[#8b929c]"
          >
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[70dvh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ── Movimientos ──────────────────────────────────────────────────────────────

function movementIcon(mov: Movement) {
  if (mov.kind === "renovacion") return <RefreshCw size={15} />;
  if (mov.kind === "ajuste" || mov.kind === "variacion") return <Settings2 size={15} />;
  return mov.amount >= 0 ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />;
}

export function MovementRow({
  mov,
  showSource,
}: {
  mov: Movement;
  showSource?: boolean;
}) {
  const positive = mov.amount >= 0;
  return (
    <li className="flex items-center gap-3 py-3">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
          positive
            ? "border-[#1d3a30] bg-[#12211c] text-[#34d399]"
            : "border-[#23272f] bg-[#171b22] text-[#9aa1ab]"
        }`}
      >
        {movementIcon(mov)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#e9ebee]">{mov.label}</p>
        <p className="truncate text-xs text-[#6b727c]">
          {formatDateShort(mov.date)}
          {showSource ? ` · ${mov.sourceName}` : ""}
          {mov.detail ? ` · ${mov.detail}` : ""}
        </p>
      </div>
      <span
        className={`shrink-0 text-sm font-bold tabular-nums ${
          positive ? "text-[#34d399]" : "text-[#e9ebee]"
        }`}
      >
        {positive ? `+${formatCLP(mov.amount)}` : formatCLP(mov.amount)}
      </span>
    </li>
  );
}

export function MovementList({
  movements,
  showSource,
  emptyText = "Sin movimientos todavía",
}: {
  movements: Movement[];
  showSource?: boolean;
  emptyText?: string;
}) {
  if (movements.length === 0) {
    return <p className="py-6 text-center text-sm text-[#6b727c]">{emptyText}</p>;
  }
  return (
    <ul className="divide-y divide-[#1a1e25]">
      {movements.map((mov) => (
        <MovementRow key={mov.id} mov={mov} showSource={showSource} />
      ))}
    </ul>
  );
}

// ── Notas efímeras (acciones mock) ───────────────────────────────────────────

export function useMockNotice(): [string | null, (msg: string) => void] {
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(t);
  }, [notice]);
  return [notice, setNotice];
}

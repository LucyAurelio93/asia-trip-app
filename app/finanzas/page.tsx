import Link from "next/link";

// ── Secciones del módulo Finanzas ────────────────────────────────────────────

type FinanceSection = {
  id: string;
  title: string;
  description: string;
};

const sections: FinanceSection[] = [
  {
    id: "objetivos",
    title: "Objetivos",
    description: "Ahorro, inversión y metas familiares",
  },
  {
    id: "dap",
    title: "DAP",
    description: "Montos, tasas y vencimientos",
  },
  {
    id: "vencimientos",
    title: "Vencimientos",
    description: "Pagos importantes y recordatorios",
  },
  {
    id: "movimientos",
    title: "Movimientos",
    description: "Ingresos y gastos por categorizar",
  },
];

// ── Finanzas ─────────────────────────────────────────────────────────────────

export default function FinanzasPage() {
  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-[420px] bg-[#0c0e12] px-5 pb-12 text-[#e9ebee]">
      <header className="relative pt-[calc(env(safe-area-inset-top)+2.5rem)]">
        <Link
          href="/"
          aria-label="Volver al Dashboard Familiar"
          className="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#23272f] bg-[#12151b] text-lg text-[#9aa1ab] transition-transform active:scale-95"
        >
          ←
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Finanzas</h1>
        <p className="mt-1 text-sm text-[#8b929c]">
          Objetivos, DAP y vencimientos
        </p>
      </header>

      <section className="mt-8 rounded-2xl border border-[#23272f] bg-gradient-to-b from-[#161a21] to-[#12151b] p-6">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#8b929c]">
          Patrimonio familiar
        </p>
        <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums">
          $0
        </p>
        <p className="mt-2 text-sm text-[#6b727c]">Vista inicial</p>
      </section>

      <section className="mt-6 space-y-3">
        {sections.map((section) => (
          <div
            key={section.id}
            className="rounded-2xl border border-[#1f242b] bg-[#12151b] p-5"
          >
            <h2 className="text-base font-semibold text-[#e9ebee]">
              {section.title}
            </h2>
            <p className="mt-1 text-sm text-[#8b929c]">{section.description}</p>
          </div>
        ))}
      </section>
    </main>
  );
}

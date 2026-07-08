import Link from "next/link";

// ── Módulos del dashboard ────────────────────────────────────────────────────

type ModuleCard = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  href?: string;
  actionLabel?: string;
};

const modules: ModuleCard[] = [
  {
    id: "viajes",
    emoji: "✈️",
    title: "Viajes",
    description: "Asia Trip",
    href: "/viajes",
    actionLabel: "Abrir viaje",
  },
  {
    id: "finanzas",
    emoji: "💰",
    title: "Finanzas",
    description: "Objetivos, DAP y vencimientos",
    href: "/finanzas",
    actionLabel: "Abrir finanzas",
  },
  {
    id: "gatos",
    emoji: "🐱",
    title: "Gatos",
    description: "Salud, controles y exámenes",
  },
  {
    id: "casa",
    emoji: "🏠",
    title: "Casa",
    description: "Compras, pendientes y reposición",
  },
];

// ── Cards ────────────────────────────────────────────────────────────────────

function ActiveModuleCard({ module }: { module: ModuleCard }) {
  return (
    <Link
      href={module.href!}
      className="block rounded-2xl border border-[#e8e2da] bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f6f1ea] text-2xl">
          {module.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-[#2d2a26]">{module.title}</h2>
          <p className="mt-0.5 text-sm text-[#7a746f]">{module.description}</p>
          <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#2d2a26] px-4 py-1.5 text-sm font-semibold text-white">
            {module.actionLabel} →
          </span>
        </div>
      </div>
    </Link>
  );
}

function UpcomingModuleCard({ module }: { module: ModuleCard }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#e0d9d0] bg-white/60 p-5">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f6f1ea] text-2xl opacity-70">
          {module.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#5b554f]">{module.title}</h2>
            <span className="rounded-full bg-[#efe9e1] px-2.5 py-0.5 text-[11px] font-semibold text-[#8a827a]">
              Próximamente
            </span>
          </div>
          <p className="mt-0.5 text-sm text-[#9b938b]">{module.description}</p>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard Familiar ───────────────────────────────────────────────────────

export default function FamilyDashboard() {
  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-[420px] bg-[#faf7f2] px-5 pb-12 text-[#2d2a26]">
      <header className="pt-[calc(env(safe-area-inset-top)+2.5rem)]">
        <h1 className="text-3xl font-extrabold tracking-tight">Familia</h1>
        <p className="mt-1 text-sm text-[#7a746f]">Todo en un solo lugar</p>
      </header>

      <section className="mt-8 space-y-4">
        {modules.map((module) =>
          module.href ? (
            <ActiveModuleCard key={module.id} module={module} />
          ) : (
            <UpcomingModuleCard key={module.id} module={module} />
          )
        )}
      </section>
    </main>
  );
}

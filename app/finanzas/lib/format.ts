// Helpers de fechas y formato del módulo Finanzas. Sin reglas de dominio.

const MS_DAY = 86_400_000;
const MESES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

// ── Fechas ───────────────────────────────────────────────────────────────────

export function todayISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((Date.parse(toISO) - Date.parse(fromISO)) / MS_DAY);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(Date.parse(iso) + days * MS_DAY);
  return d.toISOString().slice(0, 10);
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES[m - 1]} ${y}`;
}

export function formatDateShort(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES[m - 1]}`;
}

// ── Moneda ───────────────────────────────────────────────────────────────────

export function formatCLP(value: number): string {
  const abs = Math.round(Math.abs(value))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${value < 0 ? "−" : ""}$${abs}`;
}

export function formatSignedCLP(value: number): string {
  return value >= 0 ? `+${formatCLP(value)}` : formatCLP(value);
}

export function formatPct(value: number): string {
  const s = (Math.round(value * 100) / 100).toFixed(2).replace(".", ",");
  return `${value >= 0 ? "+" : ""}${s}%`;
}

export function formatTasa(value: number): string {
  return `${String(value).replace(".", ",")}%`;
}

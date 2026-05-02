export type TripOrderState = Record<string, string[]>;
export type TripNotesState = Record<string, string[]>;

export function normalizeOrder(raw: unknown): TripOrderState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: TripOrderState = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(v)) {
      result[k] = (v as unknown[]).filter((x): x is string => typeof x === "string");
    }
  }
  return result;
}

export function normalizeNotes(raw: unknown): TripNotesState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: TripNotesState = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string") {
      result[k] = v.trim() ? [v] : [];
    } else if (Array.isArray(v)) {
      result[k] = (v as unknown[]).filter((x): x is string => typeof x === "string");
    } else {
      result[k] = [];
    }
  }
  return result;
}

export function loadLocalTripState(): { orderByDay: TripOrderState; notes: TripNotesState } {
  let orderByDay: TripOrderState = {};
  let notes: TripNotesState = {};
  try {
    const raw = localStorage.getItem("asia-trip-order");
    if (raw) orderByDay = normalizeOrder(JSON.parse(raw));
  } catch { /* ignore */ }
  try {
    const raw = localStorage.getItem("asia-trip-notes");
    if (raw) notes = normalizeNotes(JSON.parse(raw));
  } catch { /* ignore */ }
  return { orderByDay, notes };
}

export function saveLocalOrder(orderByDay: TripOrderState): void {
  localStorage.setItem("asia-trip-order", JSON.stringify(orderByDay));
}

export function saveLocalNotes(notes: TripNotesState): void {
  localStorage.setItem("asia-trip-notes", JSON.stringify(notes));
}

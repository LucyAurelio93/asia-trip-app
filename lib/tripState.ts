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

type ActivityRef = { id: string; title: string };
type DayRef = { id: string; activities: ActivityRef[] };

function buildMaps(itinerary: DayRef[]) {
  const titleToId: Record<string, Record<string, string>> = {};
  const validIds: Record<string, Set<string>> = {};
  for (const day of itinerary) {
    titleToId[day.id] = {};
    validIds[day.id] = new Set();
    for (const a of day.activities) {
      titleToId[day.id][a.title] = a.id;
      validIds[day.id].add(a.id);
    }
  }
  return { titleToId, validIds };
}

export function migrateOrderToActivityIds(
  order: TripOrderState,
  itinerary: DayRef[]
): TripOrderState {
  const { titleToId, validIds } = buildMaps(itinerary);
  const result: TripOrderState = {};
  for (const [dayId, items] of Object.entries(order)) {
    const dayValidIds = validIds[dayId];
    const dayTitleToId = titleToId[dayId];
    if (!dayValidIds || !dayTitleToId) continue;
    const seen = new Set<string>();
    const migrated: string[] = [];
    for (const item of items) {
      const activityId = dayValidIds.has(item) ? item : dayTitleToId[item];
      if (activityId && !seen.has(activityId)) {
        seen.add(activityId);
        migrated.push(activityId);
      }
    }
    if (migrated.length > 0) result[dayId] = migrated;
  }
  return result;
}

export function migrateNotesToActivityIds(
  notes: TripNotesState,
  itinerary: DayRef[]
): TripNotesState {
  const { titleToId, validIds } = buildMaps(itinerary);
  const result: TripNotesState = {};
  for (const [key, noteList] of Object.entries(notes)) {
    const sep = key.indexOf("::");
    if (sep === -1) continue;
    const dayId = key.substring(0, sep);
    const activityRef = key.substring(sep + 2);
    const dayValidIds = validIds[dayId];
    const dayTitleToId = titleToId[dayId];
    if (!dayValidIds || !dayTitleToId) continue;
    const activityId = dayValidIds.has(activityRef) ? activityRef : dayTitleToId[activityRef];
    if (!activityId) continue;
    const newKey = `${dayId}::${activityId}`;
    if (result[newKey]) {
      const merged = [...result[newKey]];
      for (const note of noteList) {
        if (!merged.includes(note)) merged.push(note);
      }
      result[newKey] = merged;
    } else {
      result[newKey] = noteList;
    }
  }
  return result;
}

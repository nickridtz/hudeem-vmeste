export interface WeightEntry {
  id: string;
  date: string;   // YYYY-MM-DD
  weight: number;
}

function key(userId: string) {
  return `hudeem_weights_${userId}`;
}

export function loadEntries(userId: string): WeightEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key(userId));
    return raw ? (JSON.parse(raw) as WeightEntry[]) : [];
  } catch { return []; }
}

function saveEntries(userId: string, entries: WeightEntry[]): void {
  localStorage.setItem(key(userId), JSON.stringify(entries));
}

export function addEntry(userId: string, entry: Omit<WeightEntry, "id">): WeightEntry[] {
  const entries = loadEntries(userId);
  const newEntry: WeightEntry = { ...entry, id: crypto.randomUUID() };
  // one entry per day — replace if same date
  const updated = [...entries.filter((e) => e.date !== entry.date), newEntry];
  updated.sort((a, b) => a.date.localeCompare(b.date));
  saveEntries(userId, updated);
  return updated;
}

export function updateEntry(
  userId: string,
  id: string,
  weight: number,
  date: string
): WeightEntry[] {
  const entries = loadEntries(userId).map((e) =>
    e.id === id ? { ...e, weight, date } : e
  );
  entries.sort((a, b) => a.date.localeCompare(b.date));
  saveEntries(userId, entries);
  return entries;
}

export function deleteEntry(userId: string, id: string): WeightEntry[] {
  const updated = loadEntries(userId).filter((e) => e.id !== id);
  saveEntries(userId, updated);
  return updated;
}

export function deleteAllEntriesForUser(userId: string): void {
  if (typeof window !== "undefined") localStorage.removeItem(key(userId));
}

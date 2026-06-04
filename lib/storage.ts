import { supabase } from "./supabase";

export interface WeightEntry {
  id: string;
  date: string;
  weight: number;
}

export async function loadEntries(userId: string): Promise<WeightEntry[]> {
  const { data, error } = await supabase
    .from("weight_entries")
    .select("id, date, weight")
    .eq("user_id", userId)
    .order("date");
  if (error) { console.error(error); return []; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({ id: r.id, date: String(r.date).split("T")[0], weight: Number(r.weight) }));
}

export async function addEntry(
  userId: string,
  entry: Omit<WeightEntry, "id">
): Promise<WeightEntry[]> {
  // upsert — one entry per day
  await supabase
    .from("weight_entries")
    .upsert({ user_id: userId, date: entry.date, weight: entry.weight },
             { onConflict: "user_id,date" });
  return loadEntries(userId);
}

export async function updateEntry(
  userId: string,
  id: string,
  weight: number,
  date: string
): Promise<WeightEntry[]> {
  await supabase
    .from("weight_entries")
    .update({ weight, date })
    .eq("id", id)
    .eq("user_id", userId);
  return loadEntries(userId);
}

export async function deleteEntry(userId: string, id: string): Promise<WeightEntry[]> {
  await supabase.from("weight_entries").delete().eq("id", id).eq("user_id", userId);
  return loadEntries(userId);
}

export async function deleteAllEntriesForUser(userId: string): Promise<void> {
  await supabase.from("weight_entries").delete().eq("user_id", userId);
}

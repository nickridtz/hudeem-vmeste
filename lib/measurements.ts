import { supabase } from "./supabase";

export interface Measurement {
  id: string;
  date: string;
  waist: number | null;   // талия
  chest: number | null;   // грудь
  hips:  number | null;   // бёдра
  thigh: number | null;   // бедро
  arm:   number | null;   // рука/бицепс
}

export const MEASURE_FIELDS: { key: keyof Omit<Measurement, "id" | "date">; label: string; emoji: string }[] = [
  { key: "waist", label: "Талия",  emoji: "📏" },
  { key: "chest", label: "Грудь",  emoji: "🫁" },
  { key: "hips",  label: "Бёдра",  emoji: "🍑" },
  { key: "thigh", label: "Бедро",  emoji: "🦵" },
  { key: "arm",   label: "Рука",   emoji: "💪" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowTo(r: any): Measurement {
  const num = (v: unknown) => (v == null ? null : Number(v));
  return {
    id:    r.id,
    date:  String(r.date).split("T")[0],
    waist: num(r.waist),
    chest: num(r.chest),
    hips:  num(r.hips),
    thigh: num(r.thigh),
    arm:   num(r.arm),
  };
}

export async function loadMeasurements(userId: string): Promise<Measurement[]> {
  const { data, error } = await supabase
    .from("body_measurements")
    .select("*")
    .eq("user_id", userId)
    .order("date");
  if (error) { console.error(error); return []; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => rowTo(r));
}

export async function saveMeasurement(
  userId: string,
  date: string,
  values: Partial<Record<keyof Omit<Measurement, "id" | "date">, number | null>>
): Promise<Measurement[]> {
  await supabase.from("body_measurements").upsert(
    {
      user_id: userId,
      date,
      waist: values.waist ?? null,
      chest: values.chest ?? null,
      hips:  values.hips  ?? null,
      thigh: values.thigh ?? null,
      arm:   values.arm   ?? null,
    },
    { onConflict: "user_id,date" }
  );
  return loadMeasurements(userId);
}

export async function deleteMeasurement(userId: string, id: string): Promise<Measurement[]> {
  await supabase.from("body_measurements").delete().eq("id", id).eq("user_id", userId);
  return loadMeasurements(userId);
}

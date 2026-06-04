import { supabase } from "./supabase";

export interface FoodEntry {
  id: string;
  date: string;
  barcode: string;
  name: string;
  brand: string;
  portionGrams: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  carbsPer100g: number;
}

export interface DailyGoal { calories: number }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToEntry(r: any): FoodEntry {
  return {
    id:              r.id,
    date:            String(r.date).split("T")[0],
    barcode:         r.barcode ?? "",
    name:            r.name,
    brand:           r.brand ?? "",
    portionGrams:    Number(r.portion_grams),
    caloriesPer100g: Number(r.calories_per_100g),
    proteinPer100g:  Number(r.protein_per_100g),
    fatPer100g:      Number(r.fat_per_100g),
    carbsPer100g:    Number(r.carbs_per_100g),
  };
}

export async function loadFoodEntries(userId: string): Promise<FoodEntry[]> {
  const { data, error } = await supabase
    .from("food_entries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at");
  if (error) { console.error(error); return []; }
  return (data ?? []).map(rowToEntry);
}

export async function saveFoodEntry(
  userId: string,
  entry: Omit<FoodEntry, "id">
): Promise<FoodEntry[]> {
  await supabase.from("food_entries").insert({
    user_id:           userId,
    date:              entry.date,
    barcode:           entry.barcode,
    name:              entry.name,
    brand:             entry.brand,
    portion_grams:     entry.portionGrams,
    calories_per_100g: entry.caloriesPer100g,
    protein_per_100g:  entry.proteinPer100g,
    fat_per_100g:      entry.fatPer100g,
    carbs_per_100g:    entry.carbsPer100g,
  });
  return loadFoodEntries(userId);
}

export async function deleteFoodEntry(userId: string, id: string): Promise<FoodEntry[]> {
  await supabase.from("food_entries").delete().eq("id", id).eq("user_id", userId);
  return loadFoodEntries(userId);
}

export async function loadGoal(userId: string): Promise<DailyGoal> {
  const { data } = await supabase
    .from("calorie_goals")
    .select("calories")
    .eq("user_id", userId)
    .single();
  return { calories: data?.calories ?? 1800 };
}

export async function saveGoal(userId: string, goal: DailyGoal): Promise<void> {
  await supabase
    .from("calorie_goals")
    .upsert({ user_id: userId, calories: goal.calories }, { onConflict: "user_id" });
}

export function totalCalories(entries: FoodEntry[]): number {
  return entries.reduce((s, e) => s + (e.caloriesPer100g * e.portionGrams) / 100, 0);
}

export function macros(entries: FoodEntry[]) {
  return {
    protein: entries.reduce((s, e) => s + (e.proteinPer100g * e.portionGrams) / 100, 0),
    fat:     entries.reduce((s, e) => s + (e.fatPer100g     * e.portionGrams) / 100, 0),
    carbs:   entries.reduce((s, e) => s + (e.carbsPer100g   * e.portionGrams) / 100, 0),
  };
}

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

const foodKey = (userId: string) => `hudeem_food_${userId}`;
const goalKey = (userId: string) => `hudeem_calgoal_${userId}`;
const DEFAULT_GOAL: DailyGoal = { calories: 1800 };

export function loadFoodEntries(userId: string): FoodEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(foodKey(userId));
    return raw ? (JSON.parse(raw) as FoodEntry[]) : [];
  } catch { return []; }
}

export function saveFoodEntry(userId: string, entry: Omit<FoodEntry, "id">): FoodEntry[] {
  const entries = loadFoodEntries(userId);
  const newEntry: FoodEntry = { ...entry, id: crypto.randomUUID() };
  const updated = [...entries, newEntry];
  localStorage.setItem(foodKey(userId), JSON.stringify(updated));
  return updated;
}

export function deleteFoodEntry(userId: string, id: string): FoodEntry[] {
  const updated = loadFoodEntries(userId).filter((e) => e.id !== id);
  localStorage.setItem(foodKey(userId), JSON.stringify(updated));
  return updated;
}

export function loadGoal(userId: string): DailyGoal {
  if (typeof window === "undefined") return DEFAULT_GOAL;
  try {
    const raw = localStorage.getItem(goalKey(userId));
    return raw ? (JSON.parse(raw) as DailyGoal) : DEFAULT_GOAL;
  } catch { return DEFAULT_GOAL; }
}

export function saveGoal(userId: string, goal: DailyGoal): void {
  localStorage.setItem(goalKey(userId), JSON.stringify(goal));
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

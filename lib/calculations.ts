import type { UserProfile } from "./auth";

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Normalize any date value (Date, ISO timestamp, or YYYY-MM-DD) to "YYYY-MM-DD". */
export function normalizeDate(value: unknown): string {
  if (!value) return "";
  return String(value).split("T")[0];
}

export function formatDate(isoDate: string): string {
  const [y, m, d] = normalizeDate(isoDate).split("-");
  return `${d}.${m}.${y}`;
}

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── Per-user calculations ────────────────────────────────────────────────────

export function totalDays(startDate: string, goalDate: string): number {
  const s = new Date(startDate);
  const e = new Date(goalDate);
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000));
}

export function daysRemaining(goalDate: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const end   = new Date(goalDate); end.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((end.getTime() - today.getTime()) / 86400000));
}

export function progressPercent(
  currentWeight: number,
  startWeight: number,
  goalWeight: number
): number {
  const lost  = startWeight - currentWeight;
  const total = startWeight - goalWeight;
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, (lost / total) * 100));
}

export function idealWeightForDate(
  isoDate: string,
  startDate: string,
  goalDate: string,
  startWeight: number,
  goalWeight: number
): number {
  const start     = new Date(startDate);
  const date      = new Date(isoDate);
  const days      = totalDays(startDate, goalDate);
  const elapsed   = Math.max(0, (date.getTime() - start.getTime()) / 86400000);
  const rate      = (startWeight - goalWeight) / days;
  return Math.max(goalWeight, startWeight - rate * elapsed);
}

export function requiredWeeklyLoss(
  currentWeight: number,
  goalWeight: number,
  goalDate: string
): number {
  const rem = daysRemaining(goalDate);
  if (rem <= 0) return 0;
  const toGo = currentWeight - goalWeight;
  return toGo / (rem / 7);
}

export type MotivationalStatus = "on_track" | "goal_reached" | "behind";

export function getStatus(
  currentWeight: number,
  profile: UserProfile
): MotivationalStatus {
  if (currentWeight <= profile.goalWeight) return "goal_reached";
  const ideal = idealWeightForDate(
    todayISO(),
    profile.startDate,
    profile.goalDate,
    profile.startWeight,
    profile.goalWeight
  );
  return currentWeight <= ideal + 0.5 ? "on_track" : "behind";
}

// ─── BMI ──────────────────────────────────────────────────────────────────────

export interface BMICategory {
  label: string;
  labelShort: string;
  color: string;
  min: number;
  max: number;
}

export const BMI_CATEGORIES: BMICategory[] = [
  { label: "Недостаточный вес", labelShort: "Дефицит",     color: "#3b82f6", min: 0,    max: 18.5 },
  { label: "Норма",             labelShort: "Норма",        color: "#22c55e", min: 18.5, max: 25   },
  { label: "Избыточный вес",    labelShort: "Избыток",      color: "#f59e0b", min: 25,   max: 30   },
  { label: "Ожирение I",        labelShort: "Ожирение I",   color: "#f97316", min: 30,   max: 35   },
  { label: "Ожирение II+",      labelShort: "Ожирение II+", color: "#ef4444", min: 35,   max: 999  },
];

export function calcBMI(weightKg: number, heightCm: number): number {
  if (heightCm <= 0) return 0;
  const h = heightCm / 100;
  return weightKg / (h * h);
}

export function getBMICategory(bmi: number): BMICategory {
  return (
    BMI_CATEGORIES.find((c) => bmi >= c.min && bmi < c.max) ??
    BMI_CATEGORIES[BMI_CATEGORIES.length - 1]
  );
}

// ─── Height localStorage ──────────────────────────────────────────────────────

export function saveHeight(userId: string, cm: number): void {
  if (typeof window !== "undefined")
    localStorage.setItem(`hudeem_height_${userId}`, String(cm));
}

export function loadHeight(userId: string, fallback = 170): number {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(`hudeem_height_${userId}`);
  return raw ? Number(raw) : fallback;
}

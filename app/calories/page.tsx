"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import {
  loadFoodEntries, saveFoodEntry, deleteFoodEntry,
  loadGoal, saveGoal, totalCalories, macros, FoodEntry,
} from "@/lib/caloriesStorage";
import { formatDate, todayISO } from "@/lib/calculations";
import { getUserById } from "@/lib/auth";
import type { Session, UserProfile } from "@/lib/auth";

// ── КБЖУ / Mifflin-St Jeor ──────────────────────────────
function calcKBJU(profile: UserProfile) {
  const w = profile.startWeight, h = profile.heightCm, a = profile.age;
  const bmr = profile.gender === "male"
    ? 10 * w + 6.25 * h - 5 * a + 5
    : 10 * w + 6.25 * h - 5 * a - 161;
  const tdee  = Math.round(bmr * profile.activityLevel);
  const cut   = Math.max(1200, tdee - 500);
  return {
    bmr:     Math.round(bmr),
    tdee,
    cut,
    protein: Math.round(w * 1.8),
    fat:     Math.round(cut * 0.28 / 9),
    carbs:   Math.round((cut - w * 1.8 * 4 - cut * 0.28) / 4),
  };
}

interface ManualEntry {
  name: string; brand: string;
  caloriesPer100g: string; proteinPer100g: string; fatPer100g: string; carbsPer100g: string;
  portionGrams: string;
}

const EMPTY_FORM: ManualEntry = {
  name: "", brand: "", caloriesPer100g: "", proteinPer100g: "",
  fatPer100g: "", carbsPer100g: "", portionGrams: "100",
};

function CaloriesInner({ session }: { session: Session }) {
  const uid = session.userId;
  const [entries, setEntries]         = useState<FoodEntry[]>([]);
  const [goal, setGoal]               = useState(1800);
  const [goalInput, setGoalInput]     = useState("1800");
  const [date, setDate]               = useState(todayISO());
  const [form, setForm]               = useState<ManualEntry>(EMPTY_FORM);
  const [showForm, setShowForm]       = useState(false);
  const [glasses, setGlasses]         = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const WATER_GOAL = 8;

  useEffect(() => {
    (async () => {
      const [ents, g, waterRes, user] = await Promise.all([
        loadFoodEntries(uid),
        loadGoal(uid),
        fetch(`/api/water?userId=${uid}&date=${todayISO()}`).then(r => r.json()),
        getUserById(uid),
      ]);
      setEntries(ents);
      setGoal(g.calories);
      setGoalInput(String(g.calories));
      setGlasses(waterRes.glasses ?? 0);
      if (user) setUserProfile(user.profile);
    })();
  }, [uid]);

  async function setWater(n: number) {
    const v = Math.max(0, Math.min(20, n));
    setGlasses(v);
    await fetch("/api/water", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: uid, date: todayISO(), glasses: v }),
    });
  }

  const dayEntries = entries.filter((e) => e.date === date);
  const dayKcal    = totalCalories(dayEntries);
  const dayMacros  = macros(dayEntries);
  const progress   = Math.min(100, (dayKcal / goal) * 100);
  const remaining  = goal - dayKcal;

  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    const g = parseFloat(form.portionGrams);
    if (!form.name.trim() || isNaN(g) || g <= 0) return;
    setEntries(await saveFoodEntry(uid, {
      date,
      barcode: "",
      name:            form.name.trim(),
      brand:           form.brand.trim(),
      portionGrams:    g,
      caloriesPer100g: parseFloat(form.caloriesPer100g) || 0,
      proteinPer100g:  parseFloat(form.proteinPer100g)  || 0,
      fatPer100g:      parseFloat(form.fatPer100g)      || 0,
      carbsPer100g:    parseFloat(form.carbsPer100g)    || 0,
    }));
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  async function saveGoalFn() {
    const g = parseInt(goalInput);
    if (!isNaN(g) && g >= 500) { setGoal(g); await saveGoal(uid, { calories: g }); }
  }

  const previewKcal = (parseFloat(form.caloriesPer100g) || 0) * (parseFloat(form.portionGrams) || 0) / 100;
  const barColor = progress < 80 ? "from-green-500 to-emerald-400" : progress < 100 ? "from-amber-500 to-yellow-400" : "from-red-500 to-rose-400";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white">🍎 Дневник питания</h2>
        <p className="text-zinc-400 text-sm mt-1">Добавляй продукты · следи за КБЖУ</p>
      </div>

      {/* Date + Goal */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Дата", children: <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-transparent text-sm text-zinc-900 dark:text-white focus:outline-none" /> },
          { label: "Цель (ккал)", children: (
            <div className="flex gap-1 items-center">
              <input type="number" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} className="w-full bg-transparent text-sm text-zinc-900 dark:text-white focus:outline-none" min="500" />
              <button onClick={saveGoalFn} className="text-green-500 font-bold hover:text-green-400">✓</button>
            </div>
          )},
        ].map(({ label, children }) => (
          <div key={label} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-card dark:shadow-none space-y-1">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">{label}</label>
            {children}
          </div>
        ))}
      </div>

      {/* Daily summary */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-card dark:shadow-none space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-400 mb-1">{date === todayISO() ? "Сегодня" : formatDate(date)}</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-extrabold text-zinc-900 dark:text-white">{Math.round(dayKcal)}</span>
              <span className="text-lg text-zinc-400">/ {goal} ккал</span>
            </div>
            <p className={`text-sm font-medium mt-1 ${remaining > 0 ? "text-green-500" : "text-red-500"}`}>
              {remaining > 0 ? `Осталось ${Math.round(remaining)} ккал` : `Превышение +${Math.round(-remaining)} ккал`}
            </p>
          </div>
          <div className="relative w-14 h-14">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e4e4e7" strokeWidth="3" className="dark:[stroke:#27272a]" />
              <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${Math.min(100, progress)} 100`}
                style={{ stroke: progress > 100 ? "#ef4444" : progress > 80 ? "#f59e0b" : "#22c55e", transition: "stroke-dasharray .7s ease" }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-zinc-900 dark:text-white">{Math.round(progress)}%</div>
          </div>
        </div>
        <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`} style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[["Белки", dayMacros.protein, "text-blue-500 dark:text-blue-400", "bg-blue-50 dark:bg-blue-500/10"],
            ["Жиры",  dayMacros.fat,     "text-amber-500 dark:text-amber-400", "bg-amber-50 dark:bg-amber-500/10"],
            ["Углеводы", dayMacros.carbs, "text-orange-500 dark:text-orange-400", "bg-orange-50 dark:bg-orange-500/10"],
          ].map(([l, v, c, bg]) => (
            <div key={String(l)} className={`${bg} rounded-xl p-3 text-center`}>
              <p className={`text-base font-bold ${c}`}>{Math.round(v as number)}г</p>
              <p className="text-xs text-zinc-400">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Add product */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-card dark:shadow-none space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-zinc-900 dark:text-white text-base">Добавить продукт</h3>
          <button onClick={() => setShowForm(!showForm)}
            className="text-sm bg-green-500 hover:bg-green-400 text-white font-semibold rounded-xl px-4 py-2 transition-colors shadow-sm">
            {showForm ? "Отмена" : "＋ Добавить"}
          </button>
        </div>
        {showForm && (
          <form onSubmit={addManual} className="space-y-3 animate-fade-in">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <label className={lbl}>Название *</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="Куриная грудка" className={inp} />
              </div>
              <div className="col-span-2 space-y-1">
                <label className={lbl}>Бренд / марка</label>
                <input value={form.brand} onChange={e => setForm({...form, brand: e.target.value})}
                  placeholder="Необязательно" className={inp} />
              </div>
              <div className="space-y-1">
                <label className={lbl}>Ккал / 100г *</label>
                <input required type="number" min="0" step="0.1" value={form.caloriesPer100g}
                  onChange={e => setForm({...form, caloriesPer100g: e.target.value})}
                  placeholder="165" className={inp} />
              </div>
              <div className="space-y-1">
                <label className={lbl}>Порция (г) *</label>
                <input required type="number" min="1" value={form.portionGrams}
                  onChange={e => setForm({...form, portionGrams: e.target.value})}
                  placeholder="100" className={inp} />
              </div>
              <div className="space-y-1">
                <label className={lbl}>Белки / 100г</label>
                <input type="number" min="0" step="0.1" value={form.proteinPer100g}
                  onChange={e => setForm({...form, proteinPer100g: e.target.value})}
                  placeholder="31" className={inp} />
              </div>
              <div className="space-y-1">
                <label className={lbl}>Жиры / 100г</label>
                <input type="number" min="0" step="0.1" value={form.fatPer100g}
                  onChange={e => setForm({...form, fatPer100g: e.target.value})}
                  placeholder="3.6" className={inp} />
              </div>
              <div className="space-y-1 col-span-2">
                <label className={lbl}>Углеводы / 100г</label>
                <input type="number" min="0" step="0.1" value={form.carbsPer100g}
                  onChange={e => setForm({...form, carbsPer100g: e.target.value})}
                  placeholder="0" className={inp} />
              </div>
            </div>
            {previewKcal > 0 && (
              <div className="bg-green-50 dark:bg-green-500/10 rounded-xl p-3 text-center">
                <span className="text-2xl font-extrabold text-green-500">{Math.round(previewKcal)}</span>
                <span className="text-sm text-zinc-400 ml-1">ккал в порции</span>
              </div>
            )}
            <button type="submit"
              className="w-full bg-green-500 hover:bg-green-400 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors shadow-sm">
              Добавить в дневник
            </button>
          </form>
        )}
      </div>

      {/* ── Вода ───────────────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-card dark:shadow-none space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-white text-base">💧 Вода</h3>
            <p className="text-xs text-zinc-400">Цель: {WATER_GOAL} стаканов · {glasses * 250} мл выпито</p>
          </div>
          <span className={`text-sm font-bold ${glasses >= WATER_GOAL ? "text-green-500" : "text-blue-500"}`}>
            {glasses}/{WATER_GOAL}
          </span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {Array.from({ length: WATER_GOAL }).map((_, i) => (
            <button key={i} onClick={() => setWater(i < glasses ? i : i + 1)}
              className={`w-10 h-10 rounded-xl text-xl transition-all ${
                i < glasses
                  ? "bg-blue-100 dark:bg-blue-500/20 text-blue-500"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-600"
              }`}>💧</button>
          ))}
          {glasses > WATER_GOAL && (
            <span className="flex items-center text-sm text-blue-500 font-medium">+{glasses - WATER_GOAL}</span>
          )}
        </div>
        <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-blue-400 transition-all duration-500"
            style={{ width: `${Math.min(100, (glasses / WATER_GOAL) * 100)}%` }} />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setWater(glasses - 1)}
            className="flex-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl py-2 text-sm font-medium transition-colors">
            −1 стакан
          </button>
          <button onClick={() => setWater(glasses + 1)}
            className="flex-1 bg-blue-500 hover:bg-blue-400 text-white rounded-xl py-2 text-sm font-medium transition-colors">
            +1 стакан
          </button>
        </div>
      </div>

      {/* ── КБЖУ Калькулятор ───────────────────────────────── */}
      {userProfile && (() => {
        const kbju = calcKBJU(userProfile);
        return (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-card dark:shadow-none space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-white text-base">🧮 Норма КБЖУ</h3>
                <p className="text-xs text-zinc-400">По формуле Миффлина · настрой в профиле</p>
              </div>
              <button onClick={async () => {
                setGoal(kbju.cut); setGoalInput(String(kbju.cut));
                await saveGoal(uid, { calories: kbju.cut });
              }} className="text-xs bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 font-medium px-3 py-1.5 rounded-lg hover:bg-green-200 dark:hover:bg-green-500/30 transition-colors">
                Применить как цель
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["🔥 Базовый обмен", `${kbju.bmr} ккал`, "text-orange-500"],
                ["⚡ С учётом активности", `${kbju.tdee} ккал`, "text-yellow-500"],
                ["🎯 На похудение", `${kbju.cut} ккал`, "text-green-500"],
                ["💪 Белки", `${kbju.protein} г`, "text-blue-500"],
                ["🥑 Жиры", `${kbju.fat} г`, "text-amber-500"],
                ["🌾 Углеводы", `${kbju.carbs} г`, "text-orange-400"],
              ].map(([label, val, cls]) => (
                <div key={String(label)} className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3">
                  <p className="text-xs text-zinc-400 mb-0.5">{label}</p>
                  <p className={`text-base font-bold ${cls}`}>{val}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Day entries */}
      {dayEntries.length > 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-card dark:shadow-none">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="font-semibold text-zinc-900 dark:text-white text-base">
              📋 Съедено {date === todayISO() ? "сегодня" : formatDate(date)}
            </h3>
          </div>
          <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
            {dayEntries.map((e) => {
              const kcal = (e.caloriesPer100g * e.portionGrams) / 100;
              return (
                <div key={e.id} className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <div className="w-8 h-8 bg-green-50 dark:bg-green-500/10 rounded-xl flex items-center justify-center text-sm shrink-0">🍽️</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{e.name}</p>
                    <p className="text-xs text-zinc-400">{e.portionGrams} г{e.brand ? ` · ${e.brand}` : ""}</p>
                  </div>
                  <p className="text-sm font-bold text-green-500 shrink-0">{Math.round(kcal)} ккал</p>
                  <button onClick={async () => setEntries(await deleteFoodEntry(uid, e.id))} className="text-zinc-300 dark:text-zinc-600 hover:text-red-500 transition-colors text-lg leading-none">×</button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-zinc-400 text-sm">
          <div className="text-3xl mb-2">🥗</div>Ничего не добавлено
        </div>
      )}
    </div>
  );
}

const lbl = "text-xs font-medium text-zinc-500 uppercase tracking-wide";
const inp = "w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-base sm:text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition-all";

export default function CaloriesPage() {
  return <AuthGuard>{(s) => <CaloriesInner session={s} />}</AuthGuard>;
}

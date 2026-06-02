"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { getUserById } from "@/lib/auth";
import { todayISO } from "@/lib/calculations";
import type { Session, UserProfile } from "@/lib/auth";

// ── Mifflin-St Jeor ──────────────────────────────────────
function calcKBJU(p: UserProfile) {
  const w = p.startWeight, h = p.heightCm, a = p.age ?? 25;
  const bmr  = p.gender === "female"
    ? 10 * w + 6.25 * h - 5 * a - 161
    : 10 * w + 6.25 * h - 5 * a + 5;
  const tdee = Math.round(bmr * (p.activityLevel ?? 1.55));
  const cut  = Math.max(1200, tdee - 500);
  return {
    bmr:     Math.round(bmr),
    tdee,
    cut,
    protein: Math.round(w * 1.8),
    fat:     Math.round(cut * 0.28 / 9),
    carbs:   Math.round((cut - w * 1.8 * 4 - cut * 0.28) / 4),
  };
}

const WATER_GOAL = 8;

function NutritionInner({ session }: { session: Session }) {
  const uid = session.userId;
  const [profile, setProfile]   = useState<UserProfile | null>(null);
  const [glasses, setGlasses]   = useState(0);
  const today = todayISO();

  useEffect(() => {
    (async () => {
      const [user, waterRes] = await Promise.all([
        getUserById(uid),
        fetch(`/api/water?userId=${uid}&date=${today}`).then(r => r.json()),
      ]);
      if (user) setProfile(user.profile);
      setGlasses(waterRes.glasses ?? 0);
    })();
  }, [uid, today]);

  async function setWater(n: number) {
    const v = Math.max(0, Math.min(20, n));
    setGlasses(v);
    await fetch("/api/water", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: uid, date: today, glasses: v }),
    });
  }

  if (!profile) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const kbju = calcKBJU(profile);

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white">🍎 Питание</h2>
        <p className="text-zinc-400 text-sm mt-1">Твоя норма · вода · настрой в профиле</p>
      </div>

      {/* ── КБЖУ ──────────────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-card dark:shadow-none space-y-5">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-white text-base">🧮 Норма КБЖУ на день</h3>
          <p className="text-xs text-zinc-400 mt-0.5">По формуле Миффлина — Сен-Жеора</p>
        </div>

        {/* Главная карточка — цель */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 text-white">
          <p className="text-green-100 text-sm font-medium mb-1">🎯 На похудение (−500 ккал)</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-5xl font-extrabold">{kbju.cut}</span>
            <span className="text-xl text-green-100">ккал / день</span>
          </div>
          <p className="text-green-100 text-xs mt-2">
            Базовый обмен {kbju.bmr} ккал · С активностью {kbju.tdee} ккал
          </p>
        </div>

        {/* Макронутриенты */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "💪 Белки",    value: kbju.protein, unit: "г", color: "text-blue-500",   bg: "bg-blue-50 dark:bg-blue-500/10",   desc: "~" + Math.round(kbju.protein * 4) + " ккал" },
            { label: "🥑 Жиры",    value: kbju.fat,     unit: "г", color: "text-amber-500",  bg: "bg-amber-50 dark:bg-amber-500/10", desc: "~" + Math.round(kbju.fat * 9) + " ккал"     },
            { label: "🌾 Углеводы",value: kbju.carbs,   unit: "г", color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-500/10", desc: "~" + Math.round(kbju.carbs * 4) + " ккал"  },
          ].map(({ label, value, unit, color, bg, desc }) => (
            <div key={label} className={`${bg} rounded-2xl p-4 text-center`}>
              <p className={`text-2xl font-extrabold ${color}`}>{value}<span className="text-sm font-medium">{unit}</span></p>
              <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 mt-0.5">{label}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>

        {/* Пропорции */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Распределение</p>
          <div className="flex rounded-xl overflow-hidden h-4">
            <div className="bg-blue-400"  style={{ width: `${Math.round(kbju.protein * 4 / kbju.cut * 100)}%` }} />
            <div className="bg-amber-400" style={{ width: `${Math.round(kbju.fat * 9 / kbju.cut * 100)}%` }} />
            <div className="bg-orange-400"style={{ flex: 1 }} />
          </div>
          <div className="flex justify-between text-[10px] text-zinc-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block"/>Белки {Math.round(kbju.protein * 4 / kbju.cut * 100)}%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>Жиры {Math.round(kbju.fat * 9 / kbju.cut * 100)}%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block"/>Углеводы {Math.round(kbju.carbs * 4 / kbju.cut * 100)}%</span>
          </div>
        </div>

        <p className="text-xs text-zinc-400 bg-zinc-50 dark:bg-zinc-800 rounded-xl p-3">
          💡 Данные рассчитаны по твоему профилю. Чтобы изменить — обнови возраст, пол или уровень активности в <span className="text-green-500 font-medium">Профиле</span>.
        </p>
      </div>

      {/* ── Вода ──────────────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-card dark:shadow-none space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-white text-base">💧 Вода сегодня</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Цель {WATER_GOAL} стаканов · выпито {glasses * 250} мл</p>
          </div>
          <span className={`text-lg font-extrabold ${glasses >= WATER_GOAL ? "text-green-500" : "text-blue-500"}`}>
            {glasses}<span className="text-sm font-medium text-zinc-400">/{WATER_GOAL}</span>
          </span>
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {Array.from({ length: WATER_GOAL }).map((_, i) => (
            <button key={i} onClick={() => setWater(i < glasses ? i : i + 1)}
              className={`w-11 h-11 rounded-xl text-xl transition-all active:scale-95 ${
                i < glasses
                  ? "bg-blue-100 dark:bg-blue-500/20 text-blue-500 shadow-sm"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-600"
              }`}>💧</button>
          ))}
          {glasses > WATER_GOAL && (
            <span className="flex items-center text-sm text-blue-500 font-bold">+{glasses - WATER_GOAL}</span>
          )}
        </div>

        <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 transition-all duration-500"
            style={{ width: `${Math.min(100, (glasses / WATER_GOAL) * 100)}%` }} />
        </div>

        <div className="flex gap-2">
          <button onClick={() => setWater(glasses - 1)}
            className="flex-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl py-2.5 text-sm font-medium transition-colors">
            − Стакан
          </button>
          <button onClick={() => setWater(glasses + 1)}
            className="flex-1 bg-blue-500 hover:bg-blue-400 text-white rounded-xl py-2.5 text-sm font-medium transition-colors shadow-sm">
            + Стакан
          </button>
        </div>

        {glasses >= WATER_GOAL && (
          <p className="text-center text-sm text-green-500 font-medium animate-fade-in">
            🎉 Норма воды выполнена!
          </p>
        )}
      </div>
    </div>
  );
}

export default function NutritionPage() {
  return <AuthGuard>{(s) => <NutritionInner session={s} />}</AuthGuard>;
}

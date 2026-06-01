"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { AuthGuard } from "@/components/AuthGuard";
import {
  loadFoodEntries, saveFoodEntry, deleteFoodEntry,
  loadGoal, saveGoal, totalCalories, macros, FoodEntry,
} from "@/lib/caloriesStorage";
import { formatDate, todayISO } from "@/lib/calculations";
import type { Session } from "@/lib/auth";

const BarcodeScanner = dynamic(() => import("@/components/BarcodeScanner"), { ssr: false });

interface ProductInfo {
  barcode: string; name: string; brand: string;
  caloriesPer100g: number; proteinPer100g: number; fatPer100g: number; carbsPer100g: number;
}

async function fetchProduct(barcode: string): Promise<ProductInfo | null> {
  try {
    const res  = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const json = await res.json();
    if (json.status !== 1 || !json.product) return null;
    const p = json.product, n = p.nutriments ?? {};
    return {
      barcode, name: p.product_name_ru || p.product_name || "Неизвестный продукт",
      brand: p.brands || "",
      caloriesPer100g: n["energy-kcal_100g"] ?? n["energy-kcal"] ?? 0,
      proteinPer100g: n.proteins_100g ?? 0, fatPer100g: n.fat_100g ?? 0, carbsPer100g: n.carbohydrates_100g ?? 0,
    };
  } catch { return null; }
}

function CaloriesInner({ session }: { session: Session }) {
  const uid = session.userId;
  const [entries, setEntries]       = useState<FoodEntry[]>([]);
  const [goal, setGoal]             = useState(1800);
  const [goalInput, setGoalInput]   = useState("1800");
  const [date, setDate]             = useState(todayISO());
  const [showScanner, setShowScanner] = useState(false);
  const [manual, setManual]         = useState("");
  const [product, setProduct]       = useState<ProductInfo | null>(null);
  const [portion, setPortion]       = useState("100");
  const [lookupErr, setLookupErr]   = useState<string | null>(null);
  const [lookupLoad, setLookupLoad] = useState(false);

  useEffect(() => {
    (async () => {
      const [entries, g] = await Promise.all([loadFoodEntries(uid), loadGoal(uid)]);
      setEntries(entries);
      setGoal(g.calories);
      setGoalInput(String(g.calories));
    })();
  }, [uid]);

  const dayEntries = entries.filter((e) => e.date === date);
  const dayKcal    = totalCalories(dayEntries);
  const dayMacros  = macros(dayEntries);
  const progress   = Math.min(100, (dayKcal / goal) * 100);
  const remaining  = goal - dayKcal;

  const onDetected = useCallback(async (barcode: string) => {
    setShowScanner(false); setLookupErr(null); setProduct(null); setLookupLoad(true);
    const info = await fetchProduct(barcode);
    setLookupLoad(false);
    if (!info) setLookupErr(`Штрих-код ${barcode} не найден в базе.`);
    else { setProduct(info); setPortion("100"); }
  }, []);

  async function addProduct() {
    if (!product) return;
    const g = parseFloat(portion);
    if (isNaN(g) || g <= 0) return;
    setEntries(await saveFoodEntry(uid, { date, ...product, portionGrams: g }));
    setProduct(null);
  }

  async function saveGoalFn() {
    const g = parseInt(goalInput);
    if (!isNaN(g) && g >= 500) { setGoal(g); await saveGoal(uid, { calories: g }); }
  }

  const kcalFromProduct = product ? (product.caloriesPer100g * parseFloat(portion || "0")) / 100 : 0;
  const barColor = progress < 80 ? "from-green-500 to-emerald-400" : progress < 100 ? "from-amber-500 to-yellow-400" : "from-red-500 to-rose-400";

  return (
    <div className="space-y-5">
      {showScanner && <BarcodeScanner onDetected={onDetected} onClose={() => setShowScanner(false)} />}

      <div>
        <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white">🍎 Дневник питания</h2>
        <p className="text-zinc-400 text-sm mt-1">Сканируй штрих-коды · следи за КБЖУ</p>
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
        <h3 className="font-semibold text-zinc-900 dark:text-white text-base">Добавить продукт</h3>
        <button onClick={() => setShowScanner(true)}
          className="w-full bg-green-500 hover:bg-green-400 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 text-sm shadow-sm transition-colors">
          📷 Сканировать штрих-код
        </button>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
          <span className="text-xs text-zinc-400">или введи вручную</span>
          <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
        </div>
        <div className="flex gap-2">
          <input value={manual} onChange={(e) => setManual(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { onDetected(manual.trim()); setManual(""); } }}
            placeholder="Штрих-код (EAN-13)" className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition-all" />
          <button onClick={() => { onDetected(manual.trim()); setManual(""); }} disabled={lookupLoad}
            className="px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 rounded-xl transition-colors disabled:opacity-50">
            {lookupLoad ? <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" /> : "🔍"}
          </button>
        </div>
        {lookupErr && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-600 dark:text-red-300">{lookupErr}</div>}
        {product && (
          <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 space-y-4 animate-fade-in">
            <div className="flex justify-between gap-2">
              <div>
                <p className="font-semibold text-zinc-900 dark:text-white">{product.name}</p>
                {product.brand && <p className="text-xs text-zinc-400">{product.brand}</p>}
              </div>
              <button onClick={() => setProduct(null)} className="text-zinc-400 hover:text-zinc-600 text-xl leading-none">×</button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[["Ккал/100г", Math.round(product.caloriesPer100g), "text-green-500"],
                ["Белки", product.proteinPer100g.toFixed(1), "text-blue-500"],
                ["Жиры", product.fatPer100g.toFixed(1), "text-amber-500"],
                ["Углеводы", product.carbsPer100g.toFixed(1), "text-orange-500"],
              ].map(([l, v, c]) => (
                <div key={String(l)} className="bg-white dark:bg-zinc-900 rounded-lg p-2 text-center border border-zinc-100 dark:border-zinc-700">
                  <p className={`text-sm font-bold ${c}`}>{v}</p>
                  <p className="text-[10px] text-zinc-400">{l}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Порция (г)</label>
                <input type="number" value={portion} onChange={(e) => setPortion(e.target.value)} min="1"
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition-all" />
              </div>
              <div className="text-center pb-1">
                <p className="text-2xl font-extrabold text-green-500">{Math.round(kcalFromProduct)}</p>
                <p className="text-xs text-zinc-400">ккал</p>
              </div>
            </div>
            <button onClick={addProduct} className="w-full bg-green-500 hover:bg-green-400 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors shadow-sm">
              Добавить в дневник
            </button>
          </div>
        )}
      </div>

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

export default function CaloriesPage() {
  return <AuthGuard>{(s) => <CaloriesInner session={s} />}</AuthGuard>;
}

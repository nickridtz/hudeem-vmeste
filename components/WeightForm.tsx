"use client";

import { useState, useEffect } from "react";
import { WeightEntry } from "@/lib/storage";
import { todayISO } from "@/lib/calculations";
import type { UserProfile } from "@/lib/auth";

interface Props {
  onSave: (date: string, weight: number) => void;
  editEntry?: WeightEntry | null;
  onCancelEdit?: () => void;
  profile: UserProfile;
}

export default function WeightForm({ onSave, editEntry, onCancelEdit, profile }: Props) {
  const [date, setDate]     = useState(todayISO());
  const [weight, setWeight] = useState("");

  useEffect(() => {
    if (editEntry) { setDate(editEntry.date); setWeight(String(editEntry.weight)); }
  }, [editEntry]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const w = parseFloat(weight);
    if (!date || isNaN(w) || w < 20 || w > 500) return;
    onSave(date, w);
    if (!editEntry) { setDate(todayISO()); setWeight(""); }
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-card dark:shadow-none">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-4">
        {editEntry ? "✏️ Редактировать запись" : "➕ Добавить взвешивание"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-3 flex-col sm:flex-row">
          <div className="flex-1 space-y-1.5">
            <label className={lbl}>Дата</label>
            <input type="date" value={date} min={profile.startDate} max={profile.goalDate}
              onChange={(e) => setDate(e.target.value)} required className={inp} />
          </div>
          <div className="flex-1 space-y-1.5">
            <label className={lbl}>Вес (кг)</label>
            <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
              placeholder={`например, ${profile.startWeight - 5}.5`} step="0.1" min="20" max="500" required className={inp} />
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit"
            className="flex-1 bg-green-500 hover:bg-green-400 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors shadow-sm">
            {editEntry ? "Сохранить" : "Добавить"}
          </button>
          {editEntry && onCancelEdit && (
            <button type="button" onClick={onCancelEdit}
              className="px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 rounded-xl text-sm transition-colors">
              Отмена
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

const lbl = "text-xs font-medium text-zinc-500 uppercase tracking-wide";
const inp = "w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition-all";

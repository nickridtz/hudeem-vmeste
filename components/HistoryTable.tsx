"use client";

import { WeightEntry } from "@/lib/storage";
import { formatDate } from "@/lib/calculations";

interface Props {
  entries: WeightEntry[];
  onEdit: (entry: WeightEntry) => void;
  onDelete: (id: string) => void;
}

export default function HistoryTable({ entries, onEdit, onDelete }: Props) {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  if (sorted.length === 0)
    return (
      <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-sm border border-zinc-200/70 dark:border-zinc-800/70 rounded-3xl p-8 text-center text-zinc-400 text-sm shadow-soft dark:shadow-none">
        Нет записей
      </div>
    );

  return (
    <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-sm border border-zinc-200/70 dark:border-zinc-800/70 rounded-3xl overflow-hidden shadow-soft dark:shadow-none">
      <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
        <h2 className="text-base font-bold text-zinc-900 dark:text-white">📋 История взвешиваний</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
              <th className="text-left px-5 py-3 font-medium">Дата</th>
              <th className="text-right px-4 py-3 font-medium">Вес (кг)</th>
              <th className="text-right px-4 py-3 font-medium">Δ</th>
              <th className="text-right px-4 py-3 font-medium">Действия</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry, i) => {
              const prev  = sorted[i + 1];
              const delta = prev ? entry.weight - prev.weight : null;
              const trend = delta === null ? "" : delta < -0.05 ? "↘️" : delta > 0.05 ? "↗️" : "➡️";
              const dc    = delta === null ? "text-zinc-400" : delta < -0.05 ? "text-green-500 dark:text-green-400" : delta > 0.05 ? "text-red-500" : "text-zinc-400";
              return (
                <tr key={entry.id} className="border-b border-zinc-50 dark:border-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-300 font-mono text-xs">{formatDate(entry.date)}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-zinc-900 dark:text-white">{entry.weight.toFixed(1)}</td>
                  <td className={`px-4 py-3.5 text-right font-mono text-xs ${dc}`}>
                    {delta !== null
                      ? <>{trend} {delta > 0 ? "+" : ""}{delta.toFixed(1)}</>
                      : <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-1.5 justify-end">
                      <button onClick={() => onEdit(entry)} className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 transition-colors">✏️</button>
                      <button onClick={() => onDelete(entry.id)} className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-red-100 dark:hover:bg-red-900/40 text-zinc-500 hover:text-red-500 transition-colors">🗑️</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

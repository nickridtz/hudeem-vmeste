"use client";

import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, ReferenceLine, ResponsiveContainer } from "recharts";
import { WeightEntry } from "@/lib/storage";
import { formatDate, calcBMI, getBMICategory, BMI_CATEGORIES } from "@/lib/calculations";
import type { UserProfile } from "@/lib/auth";

interface Props {
  entries: WeightEntry[];
  heightCm: number;
  onHeightChange: (h: number) => void;
  profile: UserProfile;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const bmi = payload[0]?.value as number;
  if (!bmi) return null;
  const cat = getBMICategory(bmi);
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-sm shadow-xl">
      <p className="text-zinc-400 mb-1">{label}</p>
      <p className="font-bold text-zinc-900 dark:text-white">ИМТ: {bmi.toFixed(1)}</p>
      <p style={{ color: cat.color }} className="text-xs font-medium">{cat.label}</p>
    </div>
  );
};

export default function BMIChart({ entries, heightCm, onHeightChange, profile }: Props) {
  const [editing, setEditing]     = useState(false);
  const [heightInput, setHeightInput] = useState(String(heightCm));

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const data = sorted.map((e) => ({
    label: formatDate(e.date),
    bmi: parseFloat(calcBMI(e.weight, heightCm).toFixed(2)),
  }));
  const latestBMI = data[data.length - 1]?.bmi ?? 0;
  const cat = getBMICategory(latestBMI);

  function saveHeight() {
    const h = parseInt(heightInput);
    if (h > 100 && h < 250) onHeightChange(h);
    setEditing(false);
  }

  return (
    <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-sm border border-zinc-200/70 dark:border-zinc-800/70 rounded-3xl overflow-hidden shadow-soft dark:shadow-none">
      <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">🏋️ Индекс массы тела</h2>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xs text-zinc-400">Рост:</span>
            {editing ? (
              <div className="flex items-center gap-1">
                <input type="number" value={heightInput} onChange={(e) => setHeightInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveHeight()}
                  className="w-14 text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg px-2 py-0.5 text-zinc-900 dark:text-white focus:outline-none focus:border-green-500" autoFocus />
                <span className="text-xs text-zinc-400">см</span>
                <button onClick={saveHeight} className="text-xs text-green-500 hover:text-green-400 font-bold">✓</button>
                <button onClick={() => { setEditing(false); setHeightInput(String(heightCm)); }} className="text-xs text-zinc-400">✕</button>
              </div>
            ) : (
              <button onClick={() => setEditing(true)} className="text-xs text-zinc-500 hover:text-green-500 transition-colors font-medium">
                {heightCm} см ✏️
              </button>
            )}
          </div>
        </div>
        {latestBMI > 0 && (
          <div className="rounded-xl px-3 py-2 text-center shrink-0"
            style={{ background: cat.color + "20", border: `1px solid ${cat.color}40` }}>
            <div className="text-2xl font-bold" style={{ color: cat.color }}>{latestBMI.toFixed(1)}</div>
            <div className="text-xs font-medium" style={{ color: cat.color }}>{cat.labelShort}</div>
          </div>
        )}
      </div>

      <div className="px-2 pb-4">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 5, right: 16, left: -14, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" className="dark:[stroke:#27272a]" />
            <ReferenceArea y1={0}    y2={18.5} fill="#3b82f6" fillOpacity={0.06} />
            <ReferenceArea y1={18.5} y2={25}   fill="#22c55e" fillOpacity={0.08} />
            <ReferenceArea y1={25}   y2={30}   fill="#f59e0b" fillOpacity={0.08} />
            <ReferenceArea y1={30}   y2={35}   fill="#f97316" fillOpacity={0.08} />
            <ReferenceArea y1={35}   y2={60}   fill="#ef4444" fillOpacity={0.08} />
            {[18.5, 25, 30, 35].map((v) => (
              <ReferenceLine key={v} y={v} stroke="#52525b" strokeDasharray="4 3" strokeWidth={1} />
            ))}
            <XAxis dataKey="label" tick={{ fill: "#a1a1aa", fontSize: 11 }} tickLine={false} axisLine={false}
              interval={Math.max(0, Math.floor(data.length / 4) - 1)} />
            <YAxis domain={[18, 45]} tick={{ fill: "#a1a1aa", fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="bmi" stroke="#22c55e" strokeWidth={2.5}
              dot={{ fill: "#22c55e", r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: "#4ade80" }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="px-5 pb-4 flex flex-wrap gap-2">
        {BMI_CATEGORIES.map((c) => (
          <div key={c.label} className="flex items-center gap-1 text-xs" style={{ color: c.color }}>
            <div className="w-2 h-2 rounded-full" style={{ background: c.color }} />
            <span>{c.labelShort}</span>
            <span className="text-zinc-400">({c.min}{c.max < 999 ? `–${c.max}` : "+"})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

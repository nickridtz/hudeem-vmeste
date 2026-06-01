"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend, ResponsiveContainer } from "recharts";
import { WeightEntry } from "@/lib/storage";
import { formatDate, idealWeightForDate } from "@/lib/calculations";
import type { UserProfile } from "@/lib/auth";

interface Props { entries: WeightEntry[]; profile: UserProfile }

function buildData(entries: WeightEntry[], profile: UserProfile) {
  const { startDate, goalDate, startWeight, goalWeight } = profile;
  const dates = new Set<string>();
  const start = new Date(startDate), end = new Date(goalDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 7))
    dates.add(d.toISOString().split("T")[0]);
  dates.add(goalDate);
  entries.forEach((e) => dates.add(e.date));
  const map = new Map(entries.map((e) => [e.date, e.weight]));
  return Array.from(dates).sort().map((date) => ({
    label: formatDate(date),
    ideal: parseFloat(idealWeightForDate(date, startDate, goalDate, startWeight, goalWeight).toFixed(1)),
    actual: map.has(date) ? map.get(date) : undefined,
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-sm shadow-xl">
      <p className="text-zinc-500 mb-1.5 font-medium">{label}</p>
      {payload.map((p: any) => p.value !== undefined && (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.name === "actual" ? "Факт" : "Идеал"}: {p.value} кг
        </p>
      ))}
    </div>
  );
};

export default function WeightChart({ entries, profile }: Props) {
  const data = buildData(entries, profile);
  const yMin = Math.max(40, profile.goalWeight - 5);
  const yMax = Math.max(profile.startWeight + 5, profile.goalWeight + 5);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-card dark:shadow-none">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-4">📈 График веса</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -14, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" className="dark:[stroke:#27272a]" />
          <XAxis dataKey="label" tick={{ fill: "#a1a1aa", fontSize: 11 }} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(data.length / 6) - 1)} />
          <YAxis domain={[yMin, yMax]} tick={{ fill: "#a1a1aa", fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend formatter={(v) => <span className="text-xs text-zinc-500">{v === "actual" ? "Фактический" : "Идеальный"}</span>} />
          <ReferenceLine y={profile.goalWeight} stroke="#22c55e" strokeDasharray="6 3" strokeWidth={1.5}
            label={{ value: `Цель ${profile.goalWeight}кг`, position: "insideTopRight", fill: "#22c55e", fontSize: 11 }} />
          <Line type="monotone" dataKey="ideal" name="ideal" stroke="#6366f1" strokeWidth={1.5} strokeDasharray="5 4" dot={false} connectNulls />
          <Line type="monotone" dataKey="actual" name="actual" stroke="#22c55e" strokeWidth={2.5}
            dot={{ fill: "#22c55e", r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: "#4ade80" }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

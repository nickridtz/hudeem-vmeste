"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend, ResponsiveContainer } from "recharts";
import { WeightEntry } from "@/lib/storage";
import { formatDate, formatDateLong, idealWeightForDate, linearForecast } from "@/lib/calculations";
import type { UserProfile } from "@/lib/auth";

interface Props { entries: WeightEntry[]; profile: UserProfile }

function buildData(entries: WeightEntry[], profile: UserProfile, forecastEnd: string | null, forecastSlope: number, forecastBase: { x: number; w: number; t0: number } | null) {
  const { startDate, goalDate, startWeight, goalWeight } = profile;
  const dates = new Set<string>();
  const start = new Date(startDate), end = new Date(goalDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 7))
    dates.add(d.toISOString().split("T")[0]);
  dates.add(goalDate);
  entries.forEach((e) => dates.add(e.date));
  if (forecastEnd) dates.add(forecastEnd);

  const map = new Map(entries.map((e) => [e.date, e.weight]));
  const day = 1000 * 3600 * 24;

  return Array.from(dates).sort().map((date) => {
    // forecast value along regression line (only from base point onward)
    let forecast: number | undefined = undefined;
    if (forecastBase && forecastEnd) {
      const x = (new Date(date).getTime() - forecastBase.t0) / day;
      if (x >= forecastBase.x && date <= forecastEnd) {
        forecast = parseFloat((forecastBase.w + forecastSlope * (x - forecastBase.x)).toFixed(1));
      }
    }
    return {
      label: formatDate(date),
      ideal: parseFloat(idealWeightForDate(date, startDate, goalDate, startWeight, goalWeight).toFixed(1)),
      actual: map.has(date) ? map.get(date) : undefined,
      forecast,
    };
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-sm shadow-xl">
      <p className="text-zinc-500 mb-1.5 font-medium">{label}</p>
      {payload.map((p: any) => p.value !== undefined && (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.name === "actual" ? "Факт" : p.name === "forecast" ? "Прогноз" : "Идеал"}: {p.value} кг
        </p>
      ))}
    </div>
  );
};

export default function WeightChart({ entries, profile }: Props) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];

  const fc = linearForecast(entries, profile.goalWeight);
  let forecastEnd: string | null = null;
  let forecastBase: { x: number; w: number; t0: number } | null = null;
  if (fc && fc.goalDate && latest) {
    const t0 = new Date(sorted[0].date).getTime();
    const day = 1000 * 3600 * 24;
    forecastBase = { x: (new Date(latest.date).getTime() - t0) / day, w: latest.weight, t0 };
    forecastEnd = fc.goalDate;
  }

  const data = buildData(entries, profile, forecastEnd, fc?.slopePerDay ?? 0, forecastBase);
  const yMin = Math.max(40, profile.goalWeight - 5);
  const yMax = Math.max(profile.startWeight + 5, profile.goalWeight + 5);

  return (
    <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-sm border border-zinc-200/70 dark:border-zinc-800/70 rounded-3xl p-5 shadow-soft dark:shadow-none">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-zinc-900 dark:text-white">📈 График веса</h2>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -14, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" className="dark:[stroke:#27272a]" />
          <XAxis dataKey="label" tick={{ fill: "#a1a1aa", fontSize: 11 }} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(data.length / 6) - 1)} />
          <YAxis domain={[yMin, yMax]} tick={{ fill: "#a1a1aa", fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend formatter={(v) => <span className="text-xs text-zinc-500">{v === "actual" ? "Факт" : v === "forecast" ? "Прогноз" : "Идеал"}</span>} />
          <ReferenceLine y={profile.goalWeight} stroke="#22c55e" strokeDasharray="6 3" strokeWidth={1.5}
            label={{ value: `Цель ${profile.goalWeight}кг`, position: "insideTopRight", fill: "#22c55e", fontSize: 11 }} />
          <Line type="monotone" dataKey="ideal" name="ideal" stroke="#6366f1" strokeWidth={1.5} strokeDasharray="5 4" dot={false} connectNulls />
          <Line type="monotone" dataKey="forecast" name="forecast" stroke="#f59e0b" strokeWidth={2} strokeDasharray="2 4" dot={false} connectNulls />
          <Line type="monotone" dataKey="actual" name="actual" stroke="#22c55e" strokeWidth={2.5}
            dot={{ fill: "#22c55e", r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: "#4ade80" }} connectNulls />
        </LineChart>
      </ResponsiveContainer>

      {/* Forecast caption */}
      {fc && (
        <div className="mt-3 rounded-2xl px-4 py-3 text-sm font-medium bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
          {fc.trend === "down" && fc.goalDate ? (
            <span className="text-zinc-700 dark:text-zinc-200">
              🔮 При текущем темпе (<span className="text-green-500 font-bold">−{Math.abs(fc.perWeek).toFixed(2)} кг/нед</span>) цель будет достигнута <span className="text-amber-500 font-bold">{formatDateLong(fc.goalDate)}</span>
            </span>
          ) : fc.trend === "down" ? (
            <span className="text-green-500">🔮 Темп {fc.perWeek.toFixed(2)} кг/нед — отличная динамика!</span>
          ) : fc.trend === "flat" ? (
            <span className="text-amber-500">⚖️ Вес держится на месте — попробуй усилить темп</span>
          ) : (
            <span className="text-red-500">📈 Тренд идёт вверх (+{fc.perWeek.toFixed(2)} кг/нед) — не сдавайся, всё получится!</span>
          )}
        </div>
      )}
    </div>
  );
}

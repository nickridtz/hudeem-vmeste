"use client";

import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AuthGuard } from "@/components/AuthGuard";
import {
  loadMeasurements, saveMeasurement, deleteMeasurement,
  Measurement, MEASURE_FIELDS,
} from "@/lib/measurements";
import { formatDate, todayISO } from "@/lib/calculations";
import type { Session } from "@/lib/auth";

function ProgressInner({ session }: { session: Session }) {
  const uid = session.userId;
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter-2">📐 Замеры тела</h2>
        <p className="text-zinc-400 text-sm mt-1">Вес стоит, а сантиметры уходят — это тоже прогресс!</p>
      </div>
      <MeasurementsSection uid={uid} />
    </div>
  );
}

/* ═══════════════ ЗАМЕРЫ ═══════════════ */
function MeasurementsSection({ uid }: { uid: string }) {
  const [rows, setRows]     = useState<Measurement[]>([]);
  const [loading, setLoad]  = useState(true);
  const [date, setDate]     = useState(todayISO());
  const [vals, setVals]     = useState<Record<string, string>>({});
  const [metric, setMetric] = useState<typeof MEASURE_FIELDS[number]["key"]>("waist");
  const [saving, setSaving] = useState(false);

  useEffect(() => { (async () => { setRows(await loadMeasurements(uid)); setLoad(false); })(); }, [uid]);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const parsed: Record<string, number | null> = {};
    for (const f of MEASURE_FIELDS) {
      const v = vals[f.key];
      parsed[f.key] = v && !isNaN(parseFloat(v)) ? parseFloat(v) : null;
    }
    setRows(await saveMeasurement(uid, date, parsed));
    setVals({}); setSaving(false);
  }

  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const chartData = sorted
    .filter((r) => r[metric] != null)
    .map((r) => ({ label: formatDate(r.date), value: r[metric] as number }));

  const first = chartData[0]?.value;
  const last  = chartData[chartData.length - 1]?.value;
  const change = first != null && last != null ? last - first : null;

  return (
    <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-sm border border-zinc-200/70 dark:border-zinc-800/70 rounded-3xl p-5 shadow-soft dark:shadow-none space-y-5">
      <h3 className="text-base font-bold text-zinc-900 dark:text-white">📐 Замеры тела (см)</h3>

      {/* Форма */}
      <form onSubmit={save} className="space-y-3">
        <div className="space-y-1.5">
          <label className={lbl}>Дата</label>
          <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} className={inp} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {MEASURE_FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <label className={lbl}>{f.emoji} {f.label}</label>
              <input type="number" step="0.1" min="10" max="300" inputMode="decimal"
                value={vals[f.key] ?? ""} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}
                placeholder="—" className={inp} />
            </div>
          ))}
        </div>
        <button type="submit" disabled={saving}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 disabled:opacity-60 text-white font-bold rounded-xl py-2.5 text-sm transition-all shadow-glow-sm hover:shadow-glow active:scale-[0.98]">
          {saving ? "Сохраняю…" : "Сохранить замеры"}
        </button>
      </form>

      {/* График по метрике */}
      {!loading && chartData.length >= 2 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1 flex-wrap">
              {MEASURE_FIELDS.map((f) => (
                <button key={f.key} onClick={() => setMetric(f.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${metric === f.key ? "bg-green-500 text-white shadow-sm" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"}`}>
                  {f.emoji} {f.label}
                </button>
              ))}
            </div>
            {change != null && (
              <span className={`text-sm font-bold ${change <= 0 ? "text-green-500" : "text-red-500"}`}>
                {change <= 0 ? "−" : "+"}{Math.abs(change).toFixed(1)} см
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" className="dark:[stroke:#27272a]" />
              <XAxis dataKey="label" tick={{ fill: "#a1a1aa", fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(chartData.length / 5) - 1)} />
              <YAxis domain={["dataMin - 3", "dataMax + 3"]} tick={{ fill: "#a1a1aa", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e4e4e7", fontSize: 13 }} />
              <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2.5} dot={{ fill: "#22c55e", r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* История */}
      {!loading && sorted.length > 0 && (
        <div className="space-y-1.5 pt-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">История</p>
          {[...sorted].reverse().slice(0, 6).map((r) => (
            <div key={r.id} className="flex items-center justify-between text-sm bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-3 py-2">
              <span className="text-zinc-500 font-mono text-xs w-20">{formatDate(r.date)}</span>
              <span className="flex-1 text-zinc-700 dark:text-zinc-300 text-xs">
                {MEASURE_FIELDS.filter((f) => r[f.key] != null).map((f) => `${f.label} ${r[f.key]}`).join(" · ") || "—"}
              </span>
              <button onClick={async () => { if (confirm("Удалить замер?")) setRows(await deleteMeasurement(uid, r.id)); }}
                className="text-zinc-300 dark:text-zinc-600 hover:text-red-500 transition-colors ml-2">🗑️</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const lbl = "text-xs font-medium text-zinc-500 uppercase tracking-wide";
const inp = "w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-base sm:text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition-all";

export default function ProgressPage() {
  return <AuthGuard>{(s) => <ProgressInner session={s} />}</AuthGuard>;
}

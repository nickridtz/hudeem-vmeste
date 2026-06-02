"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { loadUsers, User } from "@/lib/auth";
import { loadEntries, WeightEntry } from "@/lib/storage";
import { formatDate, progressPercent } from "@/lib/calculations";
import type { Session } from "@/lib/auth";

type Filter = "alltime" | "week";

interface LeaderRow {
  user: User;
  startWeight: number;
  currentWeight: number;
  lost: number;
  lostPct: number;
  goalPct: number;
  lastDate: string;
  isNewcomer: boolean;
}

async function buildRows(users: User[], filter: Filter): Promise<LeaderRow[]> {
  const weekAgo    = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoISO = weekAgo.toISOString().split("T")[0];

  const rows: LeaderRow[] = [];

  for (const user of users) {
    const all = await loadEntries(user.id);
    if (all.length === 0) continue;
    const sorted = [...all].sort((a, b) => a.date.localeCompare(b.date));
    const latest = sorted[sorted.length - 1];

    let startEntry: WeightEntry;
    let isNewcomer = false;

    if (filter === "week") {
      const prev = sorted.filter((e) => e.date <= weekAgoISO);
      if (prev.length === 0) { isNewcomer = true; startEntry = sorted[0]; }
      else startEntry = prev[prev.length - 1];
    } else {
      startEntry = sorted[0];
    }

    const lost    = startEntry.weight - latest.weight;
    const lostPct = startEntry.weight > 0 ? (lost / startEntry.weight) * 100 : 0;
    const goalPct = progressPercent(latest.weight, user.profile.startWeight, user.profile.goalWeight);
    rows.push({ user, startWeight: startEntry.weight, currentWeight: latest.weight, lost, lostPct, goalPct, lastDate: latest.date, isNewcomer });
  }

  return rows.sort((a, b) => b.lost - a.lost);
}

const MEDALS = ["🥇", "🥈", "🥉"];

function BoardInner({ session }: { session: Session }) {
  const [filter, setFilter] = useState<Filter>("alltime");
  const [rows, setRows]     = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const users = await loadUsers();
      setRows(await buildRows(users, filter));
      setLoading(false);
    })();
  }, [filter]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter-2">🏆 Таблица лидеров</h2>
          <p className="text-zinc-400 text-sm mt-1">Кто сколько сбросил · {rows.length} участников</p>
        </div>
        <div className="flex items-center gap-1 bg-zinc-100/70 dark:bg-zinc-900/70 backdrop-blur-sm border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl p-1">
          {([["alltime", "За всё время"], ["week", "За неделю"]] as [Filter, string][]).map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${filter === val ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm ring-1 ring-zinc-200/60 dark:ring-zinc-700/60" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Top-3 podium */}
      {!loading && rows.length >= 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {rows.slice(0, 3).map((row, i) => (
            <div key={row.user.id}
              className={`card-hover relative overflow-hidden rounded-3xl p-5 border backdrop-blur-sm animate-slide-up opacity-0 ${
                i === 0 ? "bg-gradient-to-br from-yellow-400/25 to-amber-500/10 border-yellow-400/40 dark:border-yellow-500/30 sm:-translate-y-2 shadow-glow"
                : i === 1 ? "bg-gradient-to-br from-zinc-300/25 to-zinc-400/10 border-zinc-300/40 dark:border-zinc-600/40 shadow-soft"
                : "bg-gradient-to-br from-orange-400/15 to-orange-500/5 border-orange-400/30 dark:border-orange-700/30 shadow-soft"}`}
              style={{ animationDelay: `${i * 80}ms` }}>
              {/* Glow orb */}
              <div className={`absolute -top-8 -right-6 w-24 h-24 rounded-full blur-2xl opacity-50 ${i === 0 ? "bg-yellow-400" : i === 1 ? "bg-zinc-400" : "bg-orange-400"}`} />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-3xl drop-shadow-sm">{MEDALS[i]}</div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">#{i + 1}</span>
                </div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/60 dark:bg-zinc-800 flex items-center justify-center text-2xl shadow-sm ring-1 ring-white/40 dark:ring-zinc-700">{row.user.profile.avatar}</div>
                  <div>
                    <p className="font-bold text-zinc-900 dark:text-white text-sm">{row.user.profile.displayName}</p>
                    {row.isNewcomer && <span className="text-[10px] text-blue-500 font-medium">новый участник</span>}
                  </div>
                </div>
                <div className="text-4xl font-black text-green-500 tabular-nums tracking-tighter-2">{row.lost >= 0 ? "−" : "+"}{Math.abs(row.lost).toFixed(1)}<span className="text-lg font-bold ml-1">кг</span></div>
                <div className="text-xs text-zinc-400 mt-0.5 font-medium">{row.lostPct.toFixed(1)}% от стартового</div>
                <div className="mt-3 h-1.5 bg-zinc-200/70 dark:bg-zinc-700/70 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400" style={{ width: `${Math.min(100, row.goalPct)}%`, transition: "width 1s cubic-bezier(0.16,1,0.3,1)" }} />
                </div>
                <div className="text-[10px] text-zinc-400 mt-1 font-medium">{row.goalPct.toFixed(0)}% к цели</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full table */}
      <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-sm border border-zinc-200/70 dark:border-zinc-800/70 rounded-3xl overflow-hidden shadow-soft dark:shadow-none">
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <span className="text-sm font-bold text-zinc-900 dark:text-white">Все участники · {rows.length}</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-zinc-400 text-sm">Нет данных</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                  <th className="text-left px-5 py-3 font-medium">#</th>
                  <th className="text-left px-4 py-3 font-medium">Участник</th>
                  <th className="text-right px-4 py-3 font-medium">Старт</th>
                  <th className="text-right px-4 py-3 font-medium">Сейчас</th>
                  <th className="text-right px-4 py-3 font-medium">Сброшено</th>
                  <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">К цели</th>
                  <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Обновлено</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const isMe = row.user.id === session.userId;
                  return (
                    <tr key={row.user.id} className={`border-b border-zinc-50 dark:border-zinc-800/60 transition-colors ${isMe ? "bg-green-50/50 dark:bg-green-900/10" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"}`}>
                      <td className="px-5 py-3.5 text-zinc-400 text-xs">{i < 3 ? MEDALS[i] : `${i + 1}`}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm shrink-0">{row.user.profile.avatar}</div>
                          <div>
                            <span className="font-medium text-zinc-900 dark:text-white">{row.user.profile.displayName}</span>
                            {isMe && <span className="ml-1.5 text-[10px] text-green-500 font-medium">ты</span>}
                            {row.isNewcomer && <span className="ml-1.5 text-[10px] text-blue-400">новый</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right text-zinc-500 font-mono text-xs">{row.startWeight.toFixed(1)}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-zinc-900 dark:text-white">{row.currentWeight.toFixed(1)}</td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={`font-bold ${row.lost >= 0 ? "text-green-500" : "text-red-500"}`}>{row.lost >= 0 ? "−" : "+"}{Math.abs(row.lost).toFixed(1)} кг</span>
                        <span className="block text-[10px] text-zinc-400">{row.lostPct >= 0 ? "−" : "+"}{Math.abs(row.lostPct).toFixed(1)}%</span>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="h-1.5 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-green-500" style={{ width: `${Math.min(100, Math.max(0, row.goalPct))}%` }} />
                          </div>
                          <span className="text-xs text-zinc-400 w-9 text-right">{row.goalPct.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right text-zinc-400 text-xs font-mono hidden md:table-cell">{formatDate(row.lastDate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return <AuthGuard>{(s) => <BoardInner session={s} />}</AuthGuard>;
}

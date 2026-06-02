"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import WeightForm from "@/components/WeightForm";
import WeightChart from "@/components/WeightChart";
import BMIChart from "@/components/BMIChart";
import HistoryTable from "@/components/HistoryTable";
import { loadEntries, addEntry, updateEntry, deleteEntry, WeightEntry } from "@/lib/storage";
import { getUserById, refreshSession } from "@/lib/auth";
import {
  progressPercent, daysRemaining, requiredWeeklyLoss,
  getStatus, formatDate, idealWeightForDate,
  calcBMI, getBMICategory, todayISO,
} from "@/lib/calculations";
import { supabase } from "@/lib/supabase";
import type { Session, UserProfile } from "@/lib/auth";

const STATUS_CONFIG = {
  on_track:     { emoji: "🔥", text: "На пути к цели",   cls: "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20" },
  goal_reached: { emoji: "✅", text: "Цель достигнута!", cls: "bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/20" },
  behind:       { emoji: "⚠️", text: "Отстаёшь",        cls: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20" },
};

function DashboardInner({ session }: { session: Session }) {
  const [entries, setEntries]     = useState<WeightEntry[]>([]);
  const [editEntry, setEditEntry] = useState<WeightEntry | null>(null);
  const [showTip, setShowTip]     = useState(false);
  const [profile, setProfile]     = useState<UserProfile | null>(null);
  const [heightCm, setHeightCm]   = useState(170);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    (async () => {
      const user = await getUserById(session.userId);
      if (!user) return;
      setProfile(user.profile);
      setHeightCm(user.profile.heightCm);

      let e = await loadEntries(session.userId);
      if (e.length === 0) {
        e = await addEntry(session.userId, { date: user.profile.startDate, weight: user.profile.startWeight });
      }
      setEntries(e);
      setLoading(false);

      if (!sessionStorage.getItem(`tip_${session.userId}`)) {
        setShowTip(true);
        sessionStorage.setItem(`tip_${session.userId}`, "1");
      }
    })();
  }, [session.userId]);

  if (loading || !profile) return <PageSkeleton />;

  const sorted        = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const latest        = sorted[sorted.length - 1];
  const currentWeight = latest?.weight ?? profile.startWeight;
  const currentDate   = latest?.date   ?? todayISO();

  const progress  = progressPercent(currentWeight, profile.startWeight, profile.goalWeight);
  const rem       = daysRemaining(profile.goalDate);
  const weeklyReq = requiredWeeklyLoss(currentWeight, profile.goalWeight, profile.goalDate);
  const status    = getStatus(currentWeight, profile);
  const sc        = STATUS_CONFIG[status];
  const bmi       = calcBMI(currentWeight, heightCm);
  const bmiCat    = getBMICategory(bmi);
  const ideal     = idealWeightForDate(currentDate, profile.startDate, profile.goalDate, profile.startWeight, profile.goalWeight);
  const deviation = currentWeight - ideal;

  async function handleSave(date: string, weight: number) {
    if (editEntry) {
      setEntries(await updateEntry(session.userId, editEntry.id, weight, date));
      setEditEntry(null);
    } else {
      const newEntries = await addEntry(session.userId, { date, weight });
      setEntries(newEntries);
      // Автопост в чат
      const prev = sorted.length > 0 ? sorted[sorted.length - 1] : null;
      const diff = prev ? weight - prev.weight : null;
      const diffStr = diff !== null
        ? diff < -0.05 ? ` (−${Math.abs(diff).toFixed(1)} кг 🔥)` : diff > 0.05 ? ` (+${diff.toFixed(1)} кг)` : ""
        : "";
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.userId, displayName: session.displayName, avatar: session.avatar,
          text: `${session.avatar} ${session.displayName} отметил(а) вес: ${weight.toFixed(1)} кг${diffStr}`,
          isSystem: true,
        }),
      });
    }
  }

  async function handleHeightChange(h: number) {
    setHeightCm(h);
    await supabase.from("users").update({ height_cm: h }).eq("id", session.userId);
  }

  return (
    <div className="space-y-5">
      {showTip && (
        <div className="flex items-start gap-3 bg-blue-50/80 dark:bg-blue-500/10 backdrop-blur-sm border border-blue-200/70 dark:border-blue-500/20 rounded-2xl p-4 animate-scale-in">
          <span className="text-xl">🌅</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Взвешивайся утром, натощак</p>
            <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">Без еды и воды — самый точный результат</p>
          </div>
          <button onClick={() => setShowTip(false)} className="text-blue-400 hover:text-blue-600 transition-colors text-xl leading-none">×</button>
        </div>
      )}

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-500 via-emerald-500 to-emerald-600 p-6 sm:p-7 text-white shadow-glow animate-scale-in">
        {/* Decorative orbs */}
        <div className="absolute -top-16 -right-12 w-56 h-56 bg-white/15 rounded-full blur-2xl" />
        <div className="absolute -bottom-20 -left-10 w-52 h-52 bg-emerald-300/20 rounded-full blur-2xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_30%,rgba(255,255,255,0.18),transparent_55%)]" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-green-50/90 text-sm font-medium mb-2 flex items-center gap-1.5">
              Привет, {profile.displayName} <span className="text-lg">{profile.avatar}</span>
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-6xl font-black tracking-tighter-2 tabular-nums drop-shadow-sm">{currentWeight.toFixed(1)}</span>
              <span className="text-xl font-semibold text-green-50/80">кг</span>
            </div>
            <p className="text-green-50/70 text-xs mt-1.5">обновлено {formatDate(currentDate)}</p>
            <div className="mt-4 inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md ring-1 ring-white/25 rounded-full px-3.5 py-1.5 text-sm font-semibold shadow-sm">
              {sc.emoji} {sc.text}
            </div>
          </div>
          <div className="text-right shrink-0">
            {/* Circular progress */}
            <div className="relative w-20 h-20 ml-auto">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={`${Math.min(100, Math.max(0, progress))} 100`}
                  style={{ transition: "stroke-dasharray 1s cubic-bezier(0.16,1,0.3,1)" }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black tabular-nums">{progress.toFixed(0)}%</span>
              </div>
            </div>
            <div className="text-sm font-semibold mt-2.5">{profile.goalWeight} кг</div>
            <div className="text-green-50/70 text-xs">цель</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon="🎯" label="До цели"  value={`${Math.max(0, currentWeight - profile.goalWeight).toFixed(1)} кг`} sub="осталось" delay={0} />
        <StatCard icon="📅" label="Дней"     value={String(rem)} sub="до финала" delay={60} />
        <StatCard icon="📉" label="В неделю" value={weeklyReq > 0 ? `${weeklyReq.toFixed(2)} кг` : "—"} sub="нужно терять" delay={120} />
        <StatCard icon="🏋️" label="ИМТ"      value={bmi > 0 ? bmi.toFixed(1) : "—"} sub={bmiCat.labelShort} valueColor={bmiCat.color} delay={180} />
      </div>

      {/* Progress bar */}
      <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-sm border border-zinc-200/70 dark:border-zinc-800/70 rounded-3xl p-5 shadow-soft dark:shadow-none space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold text-zinc-900 dark:text-white">Прогресс к цели</span>
          <span className="text-sm font-black text-green-500 tabular-nums">{progress.toFixed(1)}%</span>
        </div>
        <div className="relative h-3.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full animate-progress relative overflow-hidden"
            style={{ "--p-width": `${progress}%`, width: `${progress}%`,
              background: "linear-gradient(90deg,#16a34a,#22c55e 60%,#4ade80)" } as React.CSSProperties}>
            <div className="absolute inset-0 shimmer" />
          </div>
        </div>
        <div className="flex justify-between text-xs text-zinc-400 font-medium">
          <span>{profile.startWeight} кг</span>
          {Math.abs(deviation) > 0.3
            ? deviation > 0
              ? <span className="text-red-500 font-semibold">+{deviation.toFixed(1)} кг от идеала</span>
              : <span className="text-green-500 font-semibold">−{Math.abs(deviation).toFixed(1)} кг опережаешь! 🚀</span>
            : <span className="text-green-500 font-semibold">Идеальный темп ✓</span>}
          <span>{profile.goalWeight} кг</span>
        </div>
      </div>

      <WeightChart entries={entries} profile={profile} />
      <BMIChart entries={entries} heightCm={heightCm} onHeightChange={handleHeightChange} profile={profile} />
      <WeightForm onSave={handleSave} editEntry={editEntry} onCancelEdit={() => setEditEntry(null)} profile={profile} />
      <HistoryTable entries={entries} onEdit={setEditEntry}
        onDelete={async (id) => { if (confirm("Удалить запись?")) setEntries(await deleteEntry(session.userId, id)); }} />
    </div>
  );
}

function StatCard({ icon, label, value, sub, valueColor, delay = 0 }: { icon: string; label: string; value: string; sub: string; valueColor?: string; delay?: number }) {
  return (
    <div className="card-hover bg-white/80 dark:bg-zinc-900/70 backdrop-blur-sm border border-zinc-200/70 dark:border-zinc-800/70 rounded-2xl p-4 shadow-card dark:shadow-none hover:shadow-soft animate-slide-up opacity-0"
      style={{ animationDelay: `${delay}ms` }}>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-semibold text-zinc-500">{label}</span>
        <span className="text-base">{icon}</span>
      </div>
      <p className="text-xl font-black text-zinc-900 dark:text-white tabular-nums tracking-tight" style={valueColor ? { color: valueColor } : {}}>
        {value}
      </p>
      <p className="text-xs text-zinc-400 mt-0.5 font-medium">{sub}</p>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-44 bg-zinc-200/70 dark:bg-zinc-800/70 rounded-3xl shimmer" />
      <div className="grid grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-zinc-200/70 dark:bg-zinc-800/70 rounded-2xl shimmer" />)}</div>
      <div className="h-16 bg-zinc-200/70 dark:bg-zinc-800/70 rounded-3xl shimmer" />
      <div className="h-72 bg-zinc-200/70 dark:bg-zinc-800/70 rounded-3xl shimmer" />
    </div>
  );
}

export default function DashboardPage() {
  return <AuthGuard>{(s) => <DashboardInner session={s} />}</AuthGuard>;
}

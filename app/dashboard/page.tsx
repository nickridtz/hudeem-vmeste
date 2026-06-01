"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import WeightForm from "@/components/WeightForm";
import WeightChart from "@/components/WeightChart";
import BMIChart from "@/components/BMIChart";
import HistoryTable from "@/components/HistoryTable";
import { loadEntries, addEntry, updateEntry, deleteEntry, WeightEntry } from "@/lib/storage";
import { getUserById } from "@/lib/auth";
import {
  progressPercent, daysRemaining, requiredWeeklyLoss,
  getStatus, formatDate, idealWeightForDate, calcBMI,
  getBMICategory, saveHeight, loadHeight, todayISO,
} from "@/lib/calculations";
import type { Session, UserProfile } from "@/lib/auth";

const STATUS_CONFIG = {
  on_track:     { emoji: "🔥", text: "На пути к цели",   cls: "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20" },
  goal_reached: { emoji: "✅", text: "Цель достигнута!", cls: "bg-green-50  dark:bg-green-500/10  text-green-600  dark:text-green-400  border-green-200  dark:border-green-500/20"  },
  behind:       { emoji: "⚠️", text: "Отстаёшь",        cls: "bg-red-50    dark:bg-red-500/10    text-red-600    dark:text-red-400    border-red-200    dark:border-red-500/20"    },
};

function DashboardInner({ session }: { session: Session }) {
  const [entries, setEntries]     = useState<WeightEntry[]>([]);
  const [editEntry, setEditEntry] = useState<WeightEntry | null>(null);
  const [showTip, setShowTip]     = useState(false);
  const [profile, setProfile]     = useState<UserProfile | null>(null);
  const [heightCm, setHeightCm]   = useState(170);

  useEffect(() => {
    const user = getUserById(session.userId);
    if (!user) return;
    setProfile(user.profile);
    const h = loadHeight(session.userId, user.profile.heightCm);
    setHeightCm(h);
    const e = loadEntries(session.userId);
    // Seed starting entry if empty
    if (e.length === 0) {
      const seeded = addEntry(session.userId, { date: user.profile.startDate, weight: user.profile.startWeight });
      setEntries(seeded);
    } else {
      setEntries(e);
    }
    if (!sessionStorage.getItem(`tip_${session.userId}`)) {
      setShowTip(true);
      sessionStorage.setItem(`tip_${session.userId}`, "1");
    }
  }, [session.userId]);

  if (!profile) return null;

  const sorted        = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const latest        = sorted[sorted.length - 1];
  const currentWeight = latest?.weight ?? profile.startWeight;
  const currentDate   = latest?.date   ?? todayISO();

  const progress    = progressPercent(currentWeight, profile.startWeight, profile.goalWeight);
  const rem         = daysRemaining(profile.goalDate);
  const weeklyReq   = requiredWeeklyLoss(currentWeight, profile.goalWeight, profile.goalDate);
  const status      = getStatus(currentWeight, profile);
  const sc          = STATUS_CONFIG[status];
  const bmi         = calcBMI(currentWeight, heightCm);
  const bmiCat      = getBMICategory(bmi);
  const ideal       = idealWeightForDate(currentDate, profile.startDate, profile.goalDate, profile.startWeight, profile.goalWeight);
  const deviation   = currentWeight - ideal;

  function handleSave(date: string, weight: number) {
    if (editEntry) {
      setEntries(updateEntry(session.userId, editEntry.id, weight, date));
      setEditEntry(null);
    } else {
      setEntries(addEntry(session.userId, { date, weight }));
    }
  }

  return (
    <div className="space-y-5">
      {showTip && (
        <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-4 animate-fade-in">
          <span className="text-xl">🌅</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Взвешивайся утром, натощак</p>
            <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">Без еды и воды — самый точный результат</p>
          </div>
          <button onClick={() => setShowTip(false)} className="text-blue-400 hover:text-blue-600 text-xl leading-none">×</button>
        </div>
      )}

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_50%,rgba(255,255,255,0.12),transparent_60%)]" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-green-100 text-sm font-medium mb-1">Привет, {profile.displayName} {profile.avatar}</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-5xl font-extrabold tracking-tight">{currentWeight.toFixed(1)}</span>
              <span className="text-xl font-medium text-green-100">кг</span>
            </div>
            <p className="text-green-100 text-xs mt-1">обновлено {formatDate(currentDate)}</p>
            <div className={`mt-3 inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-medium`}>
              {sc.emoji} {sc.text}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl font-bold">{progress.toFixed(0)}%</div>
            <div className="text-green-100 text-xs mt-0.5">выполнено</div>
            <div className="text-sm font-medium mt-2">{profile.goalWeight} кг</div>
            <div className="text-green-100 text-xs">цель</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon="🎯" label="До цели" value={`${Math.max(0, currentWeight - profile.goalWeight).toFixed(1)} кг`} sub="осталось" />
        <StatCard icon="📅" label="Дней" value={String(rem)} sub="до финала" />
        <StatCard icon="📉" label="В неделю" value={weeklyReq > 0 ? `${weeklyReq.toFixed(2)} кг` : "—"} sub="нужно терять" />
        <StatCard icon="🏋️" label="ИМТ" value={bmi > 0 ? bmi.toFixed(1) : "—"} sub={bmiCat.labelShort} valueColor={bmiCat.color} />
      </div>

      {/* Progress bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-card dark:shadow-none space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-zinc-900 dark:text-white">Прогресс</span>
          <span className="text-sm font-bold text-green-500">{progress.toFixed(1)}%</span>
        </div>
        <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full animate-progress"
            style={{ "--p-width": `${progress}%`, width: `${progress}%`,
              background: "linear-gradient(90deg,#16a34a,#22c55e 60%,#4ade80)" } as React.CSSProperties} />
        </div>
        <div className="flex justify-between text-xs text-zinc-400">
          <span>{profile.startWeight} кг</span>
          {Math.abs(deviation) > 0.3
            ? deviation > 0
              ? <span className="text-red-500">+{deviation.toFixed(1)} кг от идеала</span>
              : <span className="text-green-500">−{Math.abs(deviation).toFixed(1)} кг опережаешь! 🚀</span>
            : <span className="text-green-500">Идеальный темп ✓</span>}
          <span>{profile.goalWeight} кг</span>
        </div>
      </div>

      <WeightChart entries={entries} profile={profile} />
      <BMIChart entries={entries} heightCm={heightCm}
        onHeightChange={(h) => { saveHeight(session.userId, h); setHeightCm(h); }}
        profile={profile} />
      <WeightForm onSave={handleSave} editEntry={editEntry} onCancelEdit={() => setEditEntry(null)} profile={profile} />
      <HistoryTable entries={entries} onEdit={setEditEntry}
        onDelete={(id) => { if (confirm("Удалить запись?")) setEntries(deleteEntry(session.userId, id)); }} />
    </div>
  );
}

function StatCard({ icon, label, value, sub, valueColor }: { icon: string; label: string; value: string; sub: string; valueColor?: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-card dark:shadow-none">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-zinc-500">{label}</span>
        <span className="text-base">{icon}</span>
      </div>
      <p className="text-xl font-bold text-zinc-900 dark:text-white" style={valueColor ? { color: valueColor } : {}}>
        {value}
      </p>
      <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>
    </div>
  );
}

export default function DashboardPage() {
  return <AuthGuard>{(s) => <DashboardInner session={s} />}</AuthGuard>;
}

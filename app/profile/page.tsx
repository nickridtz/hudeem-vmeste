"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { getUserById, updateUserProfile, changePassword, refreshSession, hashPassword, UserProfile } from "@/lib/auth";
import type { Session } from "@/lib/auth";

const AVATARS = ["👤","😊","💪","🦊","🐻","🦁","🐯","🐺","⭐","🌟","💎","🔥","⚡","🌊","🏃","🎯","🦋","🐉","👑","🤝"];

function ProfileInner({ session }: { session: Session }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [curPw, setCurPw]     = useState("");
  const [newPw, setNewPw]     = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSaved, setPwSaved] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    getUserById(session.userId).then((u) => { if (u) setProfile({ ...u.profile }); });
  }, [session.userId]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault(); if (!profile) return; setSaving(true);
    await updateUserProfile(session.userId, profile);
    await refreshSession();
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault(); setPwError(""); setPwSaving(true);
    const user = await getUserById(session.userId);
    if (!user) { setPwSaving(false); return; }
    const curHash = await hashPassword(curPw, user.login);
    if (curHash !== user.passwordHash) { setPwError("Неверный текущий пароль"); setPwSaving(false); return; }
    if (newPw.length < 6) { setPwError("Минимум 6 символов"); setPwSaving(false); return; }
    await changePassword(session.userId, newPw);
    setCurPw(""); setNewPw(""); setPwSaving(false); setPwSaved(true);
    setTimeout(() => setPwSaved(false), 2500);
  }

  if (!profile) return (
    <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /></div>
  );

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white">👤 Мой профиль</h2>
        <p className="text-zinc-400 text-sm mt-1">Личные настройки и цели</p>
      </div>

      <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-card dark:shadow-none">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-200 dark:from-green-900/40 dark:to-emerald-900/30 flex items-center justify-center text-4xl shadow-sm">
          {profile.avatar}
        </div>
        <div>
          <p className="font-bold text-lg text-zinc-900 dark:text-white">{profile.displayName}</p>
          <p className="text-zinc-400 text-sm">@{session.login}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{session.role === "admin" ? "⚙️ Администратор" : "👤 Участник"}</p>
        </div>
      </div>

      <form onSubmit={handleSaveProfile}
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-card dark:shadow-none space-y-5">
        <h3 className="font-semibold text-zinc-900 dark:text-white text-base">Основная информация</h3>
        <div className="space-y-1.5">
          <label className={L}>Отображаемое имя</label>
          <input value={profile.displayName} onChange={(e) => setProfile({ ...profile, displayName: e.target.value })} required className={I} />
        </div>
        <div className="space-y-2">
          <label className={L}>Аватар</label>
          <div className="flex flex-wrap gap-1.5">
            {AVATARS.map((a) => (
              <button type="button" key={a} onClick={() => setProfile({ ...profile, avatar: a })}
                className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${profile.avatar === a ? "bg-green-100 dark:bg-green-900/40 ring-2 ring-green-500" : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"}`}>{a}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><label className={L}>Рост (см)</label><input type="number" value={profile.heightCm} onChange={(e) => setProfile({ ...profile, heightCm: +e.target.value })} min="100" max="250" className={I} /></div>
          <div className="space-y-1.5"><label className={L}>Стартовый вес</label><input type="number" value={profile.startWeight} onChange={(e) => setProfile({ ...profile, startWeight: +e.target.value })} step="0.1" className={I} /></div>
          <div className="space-y-1.5"><label className={L}>Целевой вес</label><input type="number" value={profile.goalWeight} onChange={(e) => setProfile({ ...profile, goalWeight: +e.target.value })} step="0.1" className={I} /></div>
          <div className="space-y-1.5"><label className={L}>Дата старта</label><input type="date" value={profile.startDate} onChange={(e) => setProfile({ ...profile, startDate: e.target.value })} className={I} /></div>
          <div className="space-y-1.5"><label className={L}>Дата цели</label><input type="date" value={profile.goalDate} onChange={(e) => setProfile({ ...profile, goalDate: e.target.value })} className={I} /></div>
        </div>
        <button type="submit" disabled={saving} className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-60 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors shadow-sm">
          {saved ? "✓ Сохранено!" : saving ? "Сохраняю…" : "Сохранить профиль"}
        </button>
      </form>

      <form onSubmit={handleChangePassword}
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-card dark:shadow-none space-y-4">
        <h3 className="font-semibold text-zinc-900 dark:text-white text-base">Сменить пароль</h3>
        <div className="space-y-1.5"><label className={L}>Текущий пароль</label><input type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} required className={I} autoComplete="current-password" /></div>
        <div className="space-y-1.5"><label className={L}>Новый пароль</label><input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={6} className={I} autoComplete="new-password" /></div>
        {pwError && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">{pwError}</p>}
        <button type="submit" disabled={pwSaving} className="w-full bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors">
          {pwSaved ? "✓ Пароль изменён!" : pwSaving ? "…" : "Изменить пароль"}
        </button>
      </form>
    </div>
  );
}

const L = "text-xs font-medium text-zinc-500 uppercase tracking-wide";
const I = "w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition-all";

export default function ProfilePage() {
  return <AuthGuard>{(s) => <ProfileInner session={s} />}</AuthGuard>;
}

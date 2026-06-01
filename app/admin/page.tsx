"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { loadUsers, createUser, deleteUser, updateUserProfile, changePassword, User, UserProfile } from "@/lib/auth";
import { loadEntries, deleteAllEntriesForUser } from "@/lib/storage";
import { formatDate } from "@/lib/calculations";
import type { Session } from "@/lib/auth";

const AVATARS = ["👤","😊","💪","🦊","🐻","🦁","🐯","🐺","⭐","🌟","💎","🔥","⚡","🌊","🏃","🎯","🦋","🐉","👑","🤝"];

const DEFAULT_PROFILE: UserProfile = {
  displayName: "", avatar: "👤", heightCm: 170,
  startWeight: 100, goalWeight: 80,
  startDate: "2026-06-01", goalDate: "2026-08-31",
};

function AdminInner({ session }: { session: Session }) {
  const [users, setUsers]         = useState<User[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser]   = useState<User | null>(null);
  const [resetPwUser, setResetPwUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [form, setForm]           = useState<UserProfile & { login: string; password: string }>({ ...DEFAULT_PROFILE, login: "", password: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving]       = useState(false);

  useEffect(() => { setUsers(loadUsers()); }, []);

  function refreshUsers() { setUsers(loadUsers()); }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(""); setSaving(true);
    try {
      const { login, password, ...profile } = form;
      await createUser(login.trim(), password, profile);
      refreshUsers(); setShowCreate(false);
      setForm({ ...DEFAULT_PROFILE, login: "", password: "" });
    } catch (err: any) { setFormError(err.message); }
    setSaving(false);
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setSaving(true);
    const { login, password, ...profile } = form;
    updateUserProfile(editUser.id, profile);
    refreshUsers(); setEditUser(null); setSaving(false);
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetPwUser || !newPassword) return;
    setSaving(true);
    await changePassword(resetPwUser.id, newPassword);
    setResetPwUser(null); setNewPassword(""); setSaving(false);
  }

  function handleDelete(user: User) {
    if (!confirm(`Удалить ${user.profile.displayName} (@${user.login}) и все его данные?`)) return;
    deleteAllEntriesForUser(user.id);
    deleteUser(user.id);
    refreshUsers();
  }

  function openEdit(user: User) {
    setForm({ ...user.profile, login: user.login, password: "" });
    setEditUser(user);
  }

  // Stats
  const totalLost = users.reduce((sum, u) => {
    const e = loadEntries(u.id);
    if (e.length < 2) return sum;
    const sorted = [...e].sort((a, b) => a.date.localeCompare(b.date));
    return sum + (sorted[0].weight - sorted[sorted.length - 1].weight);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white">⚙️ Панель администратора</h2>
          <p className="text-zinc-400 text-sm mt-1">Управление участниками</p>
        </div>
        <button onClick={() => { setShowCreate(true); setForm({ ...DEFAULT_PROFILE, login: "", password: "" }); setFormError(""); }}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white font-semibold rounded-xl px-4 py-2.5 text-sm shadow-sm transition-colors">
          ＋ Добавить участника
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SummaryCard icon="👥" label="Всего участников" value={String(users.length)} />
        <SummaryCard icon="📉" label="Суммарно сброшено" value={`${totalLost.toFixed(1)} кг`} />
        <SummaryCard icon="👑" label="Ваш логин" value={session.login} />
      </div>

      {/* Users table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-card dark:shadow-none">
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <span className="font-semibold text-zinc-900 dark:text-white text-sm">Участники</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                <th className="text-left px-5 py-3 font-medium">Участник</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Логин</th>
                <th className="text-right px-4 py-3 font-medium">Старт→Цель</th>
                <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Записей</th>
                <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Создан</th>
                <th className="text-right px-4 py-3 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const entries = loadEntries(user.id);
                const sorted  = [...entries].sort((a, b) => a.date.localeCompare(b.date));
                const latest  = sorted[sorted.length - 1];
                const isMe    = user.id === session.userId;
                return (
                  <tr key={user.id} className="border-b border-zinc-50 dark:border-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-base">
                          {user.profile.avatar}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-white">
                            {user.profile.displayName}
                            {isMe && <span className="ml-1.5 text-[10px] text-green-500">вы</span>}
                          </p>
                          <p className="text-[10px] text-zinc-400">{user.role === "admin" ? "Администратор" : "Участник"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-zinc-500 hidden sm:table-cell">{user.login}</td>
                    <td className="px-4 py-3.5 text-right text-xs text-zinc-500">
                      {user.profile.startWeight}→{user.profile.goalWeight} кг
                      {latest && <span className="block text-green-500 font-semibold">{latest.weight.toFixed(1)} кг сейчас</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right text-zinc-400 text-xs hidden md:table-cell">{entries.length}</td>
                    <td className="px-4 py-3.5 text-right text-zinc-400 text-xs font-mono hidden md:table-cell">
                      {formatDate(user.createdAt.split("T")[0])}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex gap-1.5 justify-end">
                        <button onClick={() => openEdit(user)}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 transition-colors">✏️</button>
                        <button onClick={() => { setResetPwUser(user); setNewPassword(""); }}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-zinc-500 hover:text-blue-500 transition-colors">🔑</button>
                        {!isMe && (
                          <button onClick={() => handleDelete(user)}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-red-100 dark:hover:bg-red-900/30 text-zinc-500 hover:text-red-500 transition-colors">🗑️</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit modal */}
      {(showCreate || editUser) && (
        <Modal title={editUser ? `Редактировать: ${editUser.profile.displayName}` : "Новый участник"}
          onClose={() => { setShowCreate(false); setEditUser(null); }}>
          <form onSubmit={editUser ? handleEditSave : handleCreate} className="space-y-4">
            {!editUser && (
              <>
                <Field label="Логин">
                  <input value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} required placeholder="nickname123" className={inputCls} />
                </Field>
                <Field label="Пароль">
                  <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required placeholder="мин. 6 символов" minLength={6} className={inputCls} />
                </Field>
              </>
            )}
            <Field label="Отображаемое имя">
              <input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required className={inputCls} />
            </Field>
            <Field label="Аватар">
              <div className="flex flex-wrap gap-1.5">
                {AVATARS.map((a) => (
                  <button type="button" key={a} onClick={() => setForm({ ...form, avatar: a })}
                    className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${form.avatar === a ? "bg-green-100 dark:bg-green-900/40 ring-2 ring-green-500" : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"}`}>
                    {a}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Рост (см)">
                <input type="number" value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: +e.target.value })} min="100" max="250" className={inputCls} />
              </Field>
              <Field label="Стартовый вес (кг)">
                <input type="number" value={form.startWeight} onChange={(e) => setForm({ ...form, startWeight: +e.target.value })} step="0.1" className={inputCls} />
              </Field>
              <Field label="Целевой вес (кг)">
                <input type="number" value={form.goalWeight} onChange={(e) => setForm({ ...form, goalWeight: +e.target.value })} step="0.1" className={inputCls} />
              </Field>
              <Field label="Дата старта">
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Дата цели" cls="col-span-2 sm:col-span-1">
                <input type="date" value={form.goalDate} onChange={(e) => setForm({ ...form, goalDate: e.target.value })} className={inputCls} />
              </Field>
            </div>
            {formError && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">{formError}</p>}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving}
                className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-60 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors">
                {saving ? "…" : editUser ? "Сохранить" : "Создать"}
              </button>
              <button type="button" onClick={() => { setShowCreate(false); setEditUser(null); }}
                className="px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 rounded-xl text-sm transition-colors">
                Отмена
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reset password modal */}
      {resetPwUser && (
        <Modal title={`Сменить пароль: ${resetPwUser.profile.displayName}`} onClose={() => setResetPwUser(null)}>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <Field label="Новый пароль">
              <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} placeholder="мин. 6 символов" className={inputCls} />
            </Field>
            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                className="flex-1 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors">
                {saving ? "…" : "Сохранить пароль"}
              </button>
              <button type="button" onClick={() => setResetPwUser(null)}
                className="px-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-500 text-sm transition-colors">Отмена</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

const inputCls = "w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition-all";

function Field({ label, children, cls = "" }: { label: string; children: React.ReactNode; cls?: string }) {
  return (
    <div className={`space-y-1.5 ${cls}`}>
      <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="font-semibold text-zinc-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 text-2xl leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-card dark:shadow-none">
      <div className="flex justify-between mb-1">
        <span className="text-xs text-zinc-500 font-medium">{label}</span>
        <span>{icon}</span>
      </div>
      <p className="text-xl font-bold text-zinc-900 dark:text-white">{value}</p>
    </div>
  );
}

export default function AdminPage() {
  return <AuthGuard adminOnly>{(s) => <AdminInner session={s} />}</AuthGuard>;
}

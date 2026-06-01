"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { login, initializeAdmin, getSession } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();
  const [loginVal, setLoginVal]   = useState("");
  const [password, setPassword]   = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [ready, setReady]         = useState(false);

  useEffect(() => {
    initializeAdmin().then(() => {
      if (getSession()) router.replace("/dashboard");
      else setReady(true);
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const session = await login(loginVal.trim(), password);
    setLoading(false);
    if (!session) { setError("Неверный логин или пароль"); return; }
    router.replace("/dashboard");
  }

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>

      <div className="w-full max-w-sm space-y-8 animate-fade-in">
        {/* Brand */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-28 h-28 rounded-3xl overflow-hidden shadow-xl ring-4 ring-white dark:ring-zinc-800">
            <Image src="/logo.png" alt="Худеем Вместе" width={112} height={112} className="object-cover w-full h-full" priority />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white">Худеем Вместе</h1>
            <p className="text-zinc-400 text-sm mt-1">Совместное похудение · Лето 2026</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-card dark:shadow-none space-y-4">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Вход в аккаунт</h2>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Логин</label>
            <input value={loginVal} onChange={(e) => setLoginVal(e.target.value)} required autoComplete="username"
              placeholder="Введи логин"
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-base sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition-all" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Пароль</label>
            <div className="relative">
              <input value={password} onChange={(e) => setPassword(e.target.value)} required
                type={showPass ? "text" : "password"} autoComplete="current-password"
                placeholder="Введи пароль"
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 pr-10 text-base sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition-all" />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 text-xs">
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-600 dark:text-red-300">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-60 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors shadow-sm flex items-center justify-center gap-2">
            {loading
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : "Войти →"}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-400">
          Нет аккаунта? Обратись к администратору
        </p>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSession, logout, Session } from "@/lib/auth";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/dashboard",   emoji: "📊", text: "Вес"      },
  { href: "/calories",    emoji: "🍎", text: "Питание"  },
  { href: "/progress",    emoji: "📷", text: "Прогресс" },
  { href: "/leaderboard", emoji: "🏆", text: "Лидеры"   },
  { href: "/chat",        emoji: "💬", text: "Чат"      },
];

export function NavBar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { setSession(getSession()); }, [pathname]);

  function handleLogout() { logout(); router.replace("/login"); }

  if (!session) return null;

  const adminNav = session.role === "admin"
    ? [{ href: "/admin", emoji: "⚙️", text: "Админ" }]
    : [];
  const allNav = [...NAV, ...adminNav];

  return (
    <>
      {/* ── Top header ── */}
      <header className="sticky top-0 z-50 glass border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-3 h-16">

            {/* Brand */}
            <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0 group">
              <div className="relative w-10 h-10 rounded-2xl overflow-hidden ring-1 ring-zinc-200/80 dark:ring-zinc-700/80 shrink-0 transition-transform group-hover:scale-105 group-active:scale-95">
                <Image src="/logo.png" alt="Худеем Вместе" width={40} height={40} className="object-cover w-full h-full" />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/20 rounded-2xl" />
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-extrabold text-zinc-900 dark:text-white leading-none tracking-tight">Худеем Вместе</div>
                <div className="text-[10px] text-zinc-400 mt-0.5 font-medium">Лето 2026</div>
              </div>
            </Link>

            {/* Desktop nav pills */}
            <nav className="hidden sm:flex items-center gap-0.5 bg-zinc-100/70 dark:bg-zinc-900/70 rounded-2xl p-1 mx-auto ring-1 ring-zinc-200/50 dark:ring-zinc-800/50">
              {allNav.map(({ href, emoji, text }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link key={href} href={href}
                    className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      active
                        ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm ring-1 ring-zinc-200/60 dark:ring-zinc-700/60"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                    }`}>
                    <span className={active ? "scale-110 transition-transform" : "transition-transform"}>{emoji}</span>
                    <span>{text}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              <ThemeToggle />

              {/* User menu */}
              <div className="relative">
                <button onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-100 to-emerald-200 dark:from-green-900/50 dark:to-emerald-900/40 flex items-center justify-center text-sm ring-1 ring-green-200/50 dark:ring-green-800/40">
                    {session.avatar}
                  </div>
                  <span className="hidden sm:block text-sm font-semibold text-zinc-700 dark:text-zinc-300 max-w-[100px] truncate">
                    {session.displayName}
                  </span>
                  <svg className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-48 glass border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl shadow-float z-20 overflow-hidden animate-scale-in origin-top-right">
                      <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{session.displayName}</p>
                        <p className="text-[11px] text-zinc-400">{session.role === "admin" ? "⚙️ Администратор" : "👤 Участник"}</p>
                      </div>
                      <Link href="/profile" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/70 transition-colors">
                        <span>👤</span> Профиль
                      </Link>
                      <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-2" />
                      <button onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <span>🚪</span> Выйти
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* ── Bottom nav — mobile only ── */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 glass border-t border-zinc-200/60 dark:border-zinc-800/60 safe-bottom">
        <div className="flex items-stretch h-[68px] px-1">
          {allNav.map(({ href, emoji, text }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link key={href} href={href}
                className="relative flex-1 flex flex-col items-center justify-center gap-1 transition-colors">
                <span className={`text-xl leading-none transition-all duration-200 ${active ? "scale-110 -translate-y-0.5" : "scale-100 opacity-60"}`}>{emoji}</span>
                <span className={`text-[10px] font-semibold transition-colors ${active ? "text-green-500" : "text-zinc-400"}`}>{text}</span>
                {active && <span className="absolute top-1 w-10 h-1 bg-green-500 rounded-full shadow-glow-sm" />}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

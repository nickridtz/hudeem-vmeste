"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSession, logout, Session } from "@/lib/auth";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/dashboard",   emoji: "📊", text: "Мой вес"  },
  { href: "/calories",    emoji: "🍎", text: "Калории"  },
  { href: "/leaderboard", emoji: "🏆", text: "Лидеры"   },
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
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-3 h-14">

            {/* Brand */}
            <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
              <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700 shrink-0">
                <Image src="/logo.png" alt="Худеем Вместе" width={36} height={36} className="object-cover w-full h-full" />
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-bold text-zinc-900 dark:text-white leading-none">Худеем Вместе</div>
                <div className="text-[10px] text-zinc-400">Лето 2026</div>
              </div>
            </Link>

            {/* Desktop nav pills — hidden on mobile */}
            <nav className="hidden sm:flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-900 rounded-xl p-1 mx-auto">
              {allNav.map(({ href, emoji, text }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link key={href} href={href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                    }`}>
                    <span>{emoji}</span>
                    <span>{text}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              <ThemeToggle />

              {/* User menu */}
              <div className="relative">
                <button onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-sm">
                    {session.avatar}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-zinc-700 dark:text-zinc-300 max-w-[100px] truncate">
                    {session.displayName}
                  </span>
                  <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-1.5 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg z-20 overflow-hidden">
                      <Link href="/profile" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
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
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 safe-bottom">
        <div className="flex items-stretch h-16">
          {allNav.map(({ href, emoji, text }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link key={href} href={href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active ? "text-green-500" : "text-zinc-400 dark:text-zinc-500"
                }`}>
                <span className="text-xl leading-none">{emoji}</span>
                <span className={`text-[10px] font-medium ${active ? "text-green-500" : "text-zinc-400"}`}>{text}</span>
                {active && <span className="absolute bottom-0 w-8 h-0.5 bg-green-500 rounded-t-full" />}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

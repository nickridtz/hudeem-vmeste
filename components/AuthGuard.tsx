"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, Session } from "@/lib/auth";

interface Props {
  children: (session: Session) => React.ReactNode;
  adminOnly?: boolean;
}

export function AuthGuard({ children, adminOnly = false }: Props) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | "loading">("loading");

  useEffect(() => {
    const s = getSession();
    if (!s) { router.replace("/login"); return; }
    if (adminOnly && s.role !== "admin") { router.replace("/dashboard"); return; }
    setSession(s);
  }, [router, adminOnly]);

  if (session === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!session) return null;
  return <>{children(session)}</>;
}

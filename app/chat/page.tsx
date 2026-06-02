"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import type { Session } from "@/lib/auth";

interface ChatMessage {
  id: string;
  display_name: string;
  avatar: string;
  text: string;
  is_system: boolean;
  created_at: string;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}
function formatDay(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Сегодня";
  if (d.toDateString() === yesterday.toDateString()) return "Вчера";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

function ChatInner({ session }: { session: Session }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText]         = useState("");
  const [sending, setSending]   = useState(false);
  const [sinceTs, setSinceTs]   = useState(0);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLInputElement>(null);
  const firstLoad               = useRef(true);

  const fetchMessages = useCallback(async (since: number) => {
    const res = await fetch(`/api/chat?after=${since}`);
    const { messages: newMsgs } = await res.json() as { messages: ChatMessage[] };
    if (!newMsgs.length) return;
    setMessages(prev => {
      const ids = new Set(prev.map(m => m.id));
      const merged = [...prev, ...newMsgs.filter(m => !ids.has(m.id))];
      return merged.slice(-200);
    });
    const lastTs = new Date(newMsgs[newMsgs.length - 1].created_at).getTime();
    setSinceTs(lastTs);
    if (firstLoad.current) {
      firstLoad.current = false;
      setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
    } else {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, []);

  useEffect(() => {
    fetchMessages(0);
    const id = setInterval(() => {
      setSinceTs(ts => { fetchMessages(ts); return ts; });
    }, 8000);
    return () => clearInterval(id);
  }, [fetchMessages]);

  async function send() {
    const msg = text.trim();
    if (!msg || sending) return;
    setSending(true);
    setText("");
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId:      session.userId,
        displayName: session.displayName,
        avatar:      session.avatar,
        text:        msg,
        isSystem:    false,
      }),
    });
    setSending(false);
    fetchMessages(sinceTs);
    inputRef.current?.focus();
  }

  // Group messages by day
  const grouped: { day: string; msgs: ChatMessage[] }[] = [];
  for (const m of messages) {
    const day = formatDay(m.created_at);
    const last = grouped[grouped.length - 1];
    if (last?.day === day) last.msgs.push(m);
    else grouped.push({ day, msgs: [m] });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] sm:h-[calc(100vh-10rem)] max-w-2xl mx-auto">
      <div className="mb-4 flex-shrink-0">
        <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter-2">💬 Общий чат</h2>
        <p className="text-zinc-400 text-sm mt-1">Общайся и следи за прогрессом команды</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-white/80 dark:bg-zinc-900/70 backdrop-blur-sm border border-zinc-200/70 dark:border-zinc-800/70 rounded-3xl shadow-soft dark:shadow-none p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-16 text-zinc-400 text-sm">
            <div className="text-4xl mb-3">💬</div>
            <p>Пока тихо. Напиши первым!</p>
          </div>
        )}
        {grouped.map(({ day, msgs }) => (
          <div key={day} className="space-y-2">
            {/* Day divider */}
            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
              <span className="text-[11px] text-zinc-400 font-medium">{day}</span>
              <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
            </div>

            {msgs.map((m) => {
              const isMe = m.display_name === session.displayName && !m.is_system;

              if (m.is_system) return (
                <div key={m.id} className="flex justify-center">
                  <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[11px] rounded-full px-3 py-1">
                    {m.text}
                  </span>
                </div>
              );

              return (
                <div key={m.id} className={`flex gap-2 items-end ${isMe ? "flex-row-reverse" : ""}`}>
                  {!isMe && (
                    <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-base shrink-0 mb-0.5">
                      {m.avatar}
                    </div>
                  )}
                  <div className={`max-w-[75%] space-y-0.5 ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                    {!isMe && (
                      <span className="text-[11px] text-zinc-400 px-1">{m.display_name}</span>
                    )}
                    <div className={`px-3.5 py-2 rounded-2xl text-sm shadow-sm ${
                      isMe
                        ? "bg-gradient-to-br from-green-500 to-emerald-500 text-white rounded-br-md"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-bl-md"
                    }`}>
                      {m.text}
                    </div>
                    <span className="text-[10px] text-zinc-400 px-1">{formatTime(m.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-3 flex gap-2 flex-shrink-0">
        <input
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Напиши сообщение…"
          maxLength={500}
          className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-base sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition-all"
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 disabled:opacity-50 text-white rounded-xl px-4 py-3 transition-all shadow-glow-sm hover:shadow-glow active:scale-95"
        >
          {sending
            ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
          }
        </button>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return <AuthGuard>{(s) => <ChatInner session={s} />}</AuthGuard>;
}

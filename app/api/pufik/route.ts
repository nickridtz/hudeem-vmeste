import { NextRequest, NextResponse } from "next/server";
import { PERSONA, callGroq, postAsPufik, buildLeaderboard, sql } from "@/lib/pufik";

// GET /api/pufik  → диагностика (без утечки ключа)
export async function GET() {
  const key = process.env.GROQ_API_KEY ?? "";
  const diag: Record<string, unknown> = {
    keyPresent: key.length > 0,
    keyLength: key.length,
    keyPrefix: key ? key.slice(0, 4) : null,
    model: "llama-3.3-70b-versatile",
  };
  if (!key) { diag.result = "GROQ_API_KEY не задан в окружении"; return NextResponse.json(diag); }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: "ping" }], max_tokens: 5 }),
    });
    diag.groqStatus = res.status;
    if (res.ok) diag.result = "OK — Groq отвечает ✅";
    else diag.result = await res.text();
  } catch (e) {
    diag.result = "Сетевая ошибка: " + (e instanceof Error ? e.message : String(e));
  }
  return NextResponse.json(diag);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const type = body.type as "weight" | "ask";

  try {
    /* ── Похвала при добавлении веса ── */
    if (type === "weight") {
      const { displayName, weight, diff } = body as { displayName: string; weight: number; diff: number | null };
      let situation = `${displayName} только что записал(а) свой вес: ${weight} кг.`;
      if (diff != null && diff < -0.05)      situation += ` Это на ${Math.abs(diff).toFixed(1)} кг меньше, чем в прошлый раз — прогресс!`;
      else if (diff != null && diff > 0.05)  situation += ` Это на ${diff.toFixed(1)} кг больше — нужно мягко подбодрить, без осуждения.`;
      else if (diff != null)                  situation += ` Вес держится на том же уровне.`;

      const board = await buildLeaderboard();
      const reply = await callGroq([
        { role: "system", content: `${PERSONA}\n\nТекущая таблица лидеров (по сброшенным кг):\n${board}` },
        { role: "user", content: `${situation}\nНапиши короткое (1-2 предложения) сообщение поддержки в общий чат для ${displayName}. Если уместно — упомяни его место в таблице лидеров.` },
      ]);
      if (reply) await postAsPufik(reply);
      return NextResponse.json({ ok: true });
    }

    /* ── Ответ на обращение в чате ── */
    if (type === "ask") {
      const { displayName, question } = body as { displayName: string; question: string };

      const recent = await sql(
        `SELECT display_name, text, is_system FROM chat_messages ORDER BY created_at DESC LIMIT 8`
      ) as { display_name: string; text: string; is_system: boolean }[];
      const history = recent.reverse().filter(m => !m.is_system)
        .map(m => `${m.display_name}: ${m.text}`).join("\n");

      const board = await buildLeaderboard();
      const reply = await callGroq([
        { role: "system", content: `${PERSONA}\n\nТекущая таблица лидеров:\n${board}\n\nНедавние сообщения в чате:\n${history}` },
        { role: "user", content: `${displayName} обращается к тебе: "${question}"\nОтветь как Пуфик (1-3 предложения). Если спрашивают про таблицу лидеров — отвечай по данным выше.` },
      ]);
      if (reply) await postAsPufik(reply);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false });
  } catch (e) {
    console.error("[pufik] POST exception:", e);
    return NextResponse.json({ ok: false });
  }
}

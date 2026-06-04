import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);
const GROQ_KEY = process.env.GROQ_API_KEY!;
const MODEL = "llama-3.3-70b-versatile";

const PERSONA = `Ты — Пуфик, добрый весёлый пёсик-талисман приложения для похудения «Худеем Вместе».
Характер: тёплый, заботливый, с лёгким юмором, искренне болеешь за каждого участника.
Стиль речи: по-русски, дружелюбно, можешь иногда вставить собачьи словечки (гав, тяв, виляю хвостом) и эмодзи (🐶🐾🦴❤️🔥), но в меру — 1-2 на сообщение.
ВАЖНО: отвечай ОЧЕНЬ КОРОТКО — 1-2 предложения, максимум 3. Без markdown, без списков. Обращайся к человеку по имени.`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callGroq(messages: any[]): Promise<string | null> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({ model: MODEL, messages, temperature: 0.85, max_tokens: 220 }),
    });
    if (!res.ok) {
      console.error("[pufik] Groq error:", res.status, await res.text());
      return null;
    }
    const json = await res.json();
    return json.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (e) {
    console.error("[pufik] callGroq exception:", e);
    return null;
  }
}

async function postAsPufik(text: string) {
  await sql(
    `INSERT INTO chat_messages (user_id, display_name, avatar, text, is_system)
     VALUES (NULL, 'Пуфик', '🐶', $1, false)`,
    [text]
  );
}

export async function POST(req: NextRequest) {
  if (!GROQ_KEY) {
    console.error("[pufik] GROQ_API_KEY not set");
    return NextResponse.json({ ok: false, error: "no key" });
  }

  const body = await req.json();
  const type = body.type as "weight" | "ask";

  try {
    /* ── Похвала при добавлении веса ── */
    if (type === "weight") {
      const { displayName, weight, diff } = body as { displayName: string; weight: number; diff: number | null };
      let situation = `${displayName} только что записал(а) свой вес: ${weight} кг.`;
      if (diff != null && diff < -0.05)      situation += ` Это на ${Math.abs(diff).toFixed(1)} кг меньше, чем в прошлый раз — прогресс!`;
      else if (diff != null && diff > 0.05)  situation += ` Это на ${diff.toFixed(1)} кг больше, чем в прошлый раз — нужно мягко подбодрить, без осуждения.`;
      else if (diff != null)                  situation += ` Вес держится на том же уровне.`;

      const reply = await callGroq([
        { role: "system", content: PERSONA },
        { role: "user", content: `${situation}\nНапиши короткое сообщение поддержки в общий чат для ${displayName}.` },
      ]);
      if (reply) await postAsPufik(reply);
      return NextResponse.json({ ok: true });
    }

    /* ── Ответ на обращение в чате ── */
    if (type === "ask") {
      const { displayName, question } = body as { displayName: string; question: string };

      // Контекст: последние 8 сообщений
      const recent = await sql(
        `SELECT display_name, text, is_system FROM chat_messages ORDER BY created_at DESC LIMIT 8`
      );
      const history = (recent as { display_name: string; text: string; is_system: boolean }[])
        .reverse()
        .filter(m => !m.is_system)
        .map(m => `${m.display_name}: ${m.text}`)
        .join("\n");

      const reply = await callGroq([
        { role: "system", content: PERSONA + `\n\nНедавние сообщения в чате:\n${history}` },
        { role: "user", content: `${displayName} обращается к тебе: "${question}"\nОтветь ему как Пуфик.` },
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

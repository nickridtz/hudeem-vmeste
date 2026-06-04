import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);
const GROQ_KEY = process.env.GROQ_API_KEY!;
const MODEL = "llama-3.3-70b-versatile";

export const PERSONA = `Ты — Пуфик, добрый весёлый пёсик-талисман приложения для похудения «Худеем Вместе».
Характер: тёплый, заботливый, с лёгким юмором, искренне болеешь за каждого участника.
Стиль речи: по-русски, дружелюбно, можешь иногда вставить собачьи словечки (гав, тяв, виляю хвостом) и эмодзи (🐶🐾🦴❤️🔥), но в меру — 1-2 на сообщение.
ВАЖНО: отвечай КОРОТКО. Без markdown, без длинных списков. Обращайся к людям по именам.`;

export { sql };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function callGroq(messages: any[], maxTokens = 220): Promise<string | null> {
  if (!GROQ_KEY) { console.error("[pufik] GROQ_API_KEY not set"); return null; }
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({ model: MODEL, messages, temperature: 0.85, max_tokens: maxTokens }),
    });
    if (!res.ok) { console.error("[pufik] Groq error:", res.status, await res.text()); return null; }
    const json = await res.json();
    return json.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (e) {
    console.error("[pufik] callGroq exception:", e);
    return null;
  }
}

export async function postAsPufik(text: string) {
  await sql(
    `INSERT INTO chat_messages (user_id, display_name, avatar, text, is_system)
     VALUES (NULL, 'Пуфик', '🐶', $1, false)`,
    [text]
  );
}

/** Сводка таблицы лидеров (за всё время, по сброшенным кг). */
export async function buildLeaderboard(): Promise<string> {
  try {
    const rows = await sql(`
      SELECT u.display_name, u.goal_weight,
             fe.weight AS first_weight, le.weight AS latest_weight
      FROM users u
      LEFT JOIN LATERAL (SELECT weight FROM weight_entries WHERE user_id = u.id ORDER BY date ASC  LIMIT 1) fe ON true
      LEFT JOIN LATERAL (SELECT weight FROM weight_entries WHERE user_id = u.id ORDER BY date DESC LIMIT 1) le ON true
    `) as { display_name: string; goal_weight: number; first_weight: number | null; latest_weight: number | null }[];

    const ranked = rows
      .filter(r => r.first_weight != null && r.latest_weight != null)
      .map(r => ({
        name:    r.display_name,
        current: Number(r.latest_weight),
        goal:    Number(r.goal_weight),
        lost:    Number(r.first_weight) - Number(r.latest_weight),
      }))
      .sort((a, b) => b.lost - a.lost);

    if (ranked.length === 0) return "Пока никто не записал вес — таблица лидеров пустая.";

    return ranked.map((r, i) => {
      const medal = ["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`;
      const lostStr = r.lost >= 0 ? `сбросил(а) ${r.lost.toFixed(1)} кг` : `набрал(а) ${Math.abs(r.lost).toFixed(1)} кг`;
      return `${medal} ${r.name}: ${lostStr} (сейчас ${r.current.toFixed(1)} кг, цель ${r.goal.toFixed(1)} кг)`;
    }).join("\n");
  } catch (e) {
    console.error("[pufik] buildLeaderboard error:", e);
    return "";
  }
}

function todayISO(): string {
  // Москва UTC+3
  const now = new Date(Date.now() + 3 * 3600 * 1000);
  return now.toISOString().split("T")[0];
}

/** Кто сегодня взвесился (имя → вес). */
export async function todayWeights(): Promise<{ name: string; weight: number }[]> {
  const day = todayISO();
  const rows = await sql(`
    SELECT u.display_name, w.weight
    FROM weight_entries w JOIN users u ON u.id = w.user_id
    WHERE w.date = $1 ORDER BY u.display_name
  `, [day]) as { display_name: string; weight: number }[];
  return rows.map(r => ({ name: r.display_name, weight: Number(r.weight) }));
}

/** Сколько воды сегодня выпил каждый (имя → стаканы). */
export async function todayWater(): Promise<{ name: string; glasses: number }[]> {
  const day = todayISO();
  const rows = await sql(`
    SELECT u.display_name, COALESCE(wt.glasses, 0) AS glasses
    FROM users u
    LEFT JOIN water_entries wt ON wt.user_id = u.id AND wt.date = $1
    ORDER BY u.display_name
  `, [day]) as { display_name: string; glasses: number }[];
  return rows.map(r => ({ name: r.display_name, glasses: Number(r.glasses) }));
}

/** Все участники (имена). */
export async function allMembers(): Promise<string[]> {
  const rows = await sql(`SELECT display_name FROM users WHERE role <> 'admin' OR role IS NULL`) as { display_name: string }[];
  const everyone = await sql(`SELECT display_name FROM users`) as { display_name: string }[];
  return (everyone.length ? everyone : rows).map(r => r.display_name);
}

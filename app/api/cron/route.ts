import { NextRequest, NextResponse } from "next/server";
import {
  PERSONA, callGroq, postAsPufik, buildLeaderboard,
  todayWeights, todayWater, allMembers,
} from "@/lib/pufik";

const CRON_SECRET = process.env.CRON_SECRET ?? "";

export async function GET(req: NextRequest) {
  const key  = req.nextUrl.searchParams.get("key");
  const task = req.nextUrl.searchParams.get("task");

  // Защита: без правильного ключа — отказ
  if (!CRON_SECRET || key !== CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    /* ── Утреннее напоминание (06:30) ── */
    if (task === "morning") {
      const board = await buildLeaderboard();
      const reply = await callGroq([
        { role: "system", content: `${PERSONA}\n\nТаблица лидеров:\n${board}` },
        { role: "user", content: `Сейчас раннее утро. Напиши бодрое утреннее сообщение в общий чат: поприветствуй всю стаю, напомни взвеситься натощак и попить воды. Коротко, с задором.` },
      ], 180);
      if (reply) await postAsPufik(reply);
      return NextResponse.json({ ok: true, task });
    }

    /* ── Ежедневный отчёт (22:00) ── */
    if (task === "daily") {
      const [weights, water, members] = await Promise.all([todayWeights(), todayWater(), allMembers()]);

      const weighedNames = new Set(weights.map(w => w.name));
      const notWeighed   = members.filter(m => !weighedNames.has(m));

      const weightStr = weights.length
        ? weights.map(w => `${w.name}: ${w.weight.toFixed(1)} кг`).join(", ")
        : "сегодня никто не взвешивался";
      const waterStr = water.length
        ? water.map(w => `${w.name}: ${w.glasses} стак. (${w.glasses * 250} мл)`).join(", ")
        : "нет данных";
      const missStr = notWeighed.length ? notWeighed.join(", ") : "все молодцы, взвесились!";

      const reply = await callGroq([
        { role: "system", content: PERSONA },
        { role: "user", content:
          `Вечер, время подвести итоги дня. Данные:\n` +
          `Взвешивания сегодня: ${weightStr}\n` +
          `Вода сегодня: ${waterStr}\n` +
          `Не взвесились: ${missStr}\n\n` +
          `Напиши тёплый вечерний отчёт в чат: отметь кто молодец по воде и взвешиванию, мягко подколи тех кто забыл, пожелай спокойной ночи. Можно чуть длиннее обычного (3-5 предложений), но без воды.` },
      ], 320);
      if (reply) await postAsPufik(reply);
      return NextResponse.json({ ok: true, task, weights, water });
    }

    /* ── Еженедельный отчёт (воскресенье) ── */
    if (task === "weekly") {
      const board = await buildLeaderboard();
      const reply = await callGroq([
        { role: "system", content: `${PERSONA}\n\nТаблица лидеров за всё время:\n${board}` },
        { role: "user", content:
          `Конец недели — время большого отчёта! Подведи итоги недели для всей команды по таблице лидеров выше: ` +
          `похвали лидера, поддержи отстающих, отметь общий прогресс стаи, замотивируй на новую неделю. ` +
          `Это праздничное сообщение, можно подлиннее (4-6 предложений) и поярче с эмодзи.` },
      ], 400);
      if (reply) await postAsPufik(reply);
      return NextResponse.json({ ok: true, task });
    }

    return NextResponse.json({ ok: false, error: "unknown task" }, { status: 400 });
  } catch (e) {
    console.error("[cron] error:", e);
    return NextResponse.json({ ok: false, error: "exception" }, { status: 500 });
  }
}

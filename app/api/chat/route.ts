import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const after = req.nextUrl.searchParams.get("after") ?? "0";
  try {
    const rows = await sql(`
      SELECT id, display_name, avatar, text, is_system, created_at
      FROM chat_messages
      WHERE created_at > to_timestamp($1::bigint / 1000.0)
      ORDER BY created_at ASC
      LIMIT 80
    `, [after]);
    return NextResponse.json({ messages: rows });
  } catch (e) {
    console.error("[chat GET]", e);
    return NextResponse.json({ messages: [] });
  }
}

export async function POST(req: NextRequest) {
  const { userId, displayName, avatar, text, isSystem } = await req.json();
  if (!text?.trim()) return NextResponse.json({ ok: false });
  try {
    await sql(`
      INSERT INTO chat_messages (user_id, display_name, avatar, text, is_system)
      VALUES ($1, $2, $3, $4, $5)
    `, [userId ?? null, displayName ?? "", avatar ?? "👤", text.trim(), isSystem ?? false]);

    // Keep only last 200 messages
    await sql(`
      DELETE FROM chat_messages
      WHERE id NOT IN (
        SELECT id FROM chat_messages ORDER BY created_at DESC LIMIT 200
      )
    `);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[chat POST]", e);
    return NextResponse.json({ ok: false });
  }
}

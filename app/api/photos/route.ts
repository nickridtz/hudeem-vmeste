import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { randomBytes } from "crypto";

const sql = neon(process.env.DATABASE_URL!);

// GET /api/photos?userId=...  → метаданные фото (без самих картинок)
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ photos: [] });
  try {
    const rows = await sql(
      `SELECT id, token, date, note, created_at
       FROM progress_photos WHERE user_id = $1 ORDER BY date DESC, created_at DESC`,
      [userId]
    );
    return NextResponse.json({ photos: rows });
  } catch (e) {
    console.error("[photos GET]", e);
    return NextResponse.json({ photos: [] });
  }
}

// POST /api/photos  { userId, date, note, dataUrl }  → загрузка
export async function POST(req: NextRequest) {
  const { userId, date, note, dataUrl } = await req.json();
  if (!userId || !dataUrl?.startsWith("data:image/")) {
    return NextResponse.json({ ok: false, error: "bad input" }, { status: 400 });
  }
  // Ограничение размера ~4 МБ в base64
  if (dataUrl.length > 5_500_000) {
    return NextResponse.json({ ok: false, error: "too large" }, { status: 413 });
  }
  try {
    const token = randomBytes(24).toString("hex");
    const rows = await sql(
      `INSERT INTO progress_photos (user_id, token, date, note, image_data)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, token, date, note, created_at`,
      [userId, token, date, note ?? "", dataUrl]
    );
    return NextResponse.json({ ok: true, photo: rows[0] });
  } catch (e) {
    console.error("[photos POST]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const date   = req.nextUrl.searchParams.get("date");
  if (!userId || !date) return NextResponse.json({ glasses: 0 });
  try {
    const rows = await sql(
      `SELECT glasses FROM water_entries WHERE user_id=$1 AND date=$2`,
      [userId, date]
    );
    return NextResponse.json({ glasses: rows[0]?.glasses ?? 0 });
  } catch {
    return NextResponse.json({ glasses: 0 });
  }
}

export async function POST(req: NextRequest) {
  const { userId, date, glasses } = await req.json();
  try {
    await sql(`
      INSERT INTO water_entries (user_id, date, glasses) VALUES ($1, $2, $3)
      ON CONFLICT (user_id, date) DO UPDATE SET glasses = $3
    `, [userId, date, Math.max(0, glasses)]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[water POST]", e);
    return NextResponse.json({ ok: false });
  }
}

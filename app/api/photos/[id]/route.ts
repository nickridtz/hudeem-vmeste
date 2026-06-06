import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// GET /api/photos/[id]?t=token  → отдаёт картинку только при совпадении токена
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const token = req.nextUrl.searchParams.get("t");
  if (!id || !token) return new NextResponse("Forbidden", { status: 403 });

  try {
    const rows = await sql(
      `SELECT image_data FROM progress_photos WHERE id = $1 AND token = $2`,
      [id, token]
    ) as { image_data: string }[];
    if (rows.length === 0) return new NextResponse("Not found", { status: 404 });

    const dataUrl = rows[0].image_data;
    const m = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!m) return new NextResponse("Bad data", { status: 500 });
    const mime = m[1];
    const buf = Buffer.from(m[2], "base64");

    return new NextResponse(buf, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    console.error("[photos GET id]", e);
    return new NextResponse("Error", { status: 500 });
  }
}

// DELETE /api/photos/[id]?t=token  → удаление только при совпадении токена
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const token = req.nextUrl.searchParams.get("t");
  if (!id || !token) return NextResponse.json({ ok: false }, { status: 403 });
  try {
    await sql(`DELETE FROM progress_photos WHERE id = $1 AND token = $2`, [id, token]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[photos DELETE]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

// Лёгкий эндпоинт для keep-alive: будит/держит Render-сервис, не трогает БД.
export async function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() });
}

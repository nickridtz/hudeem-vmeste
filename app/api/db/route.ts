/**
 * Server-side database proxy.
 * All DB operations go through here so DATABASE_URL stays server-only.
 */
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

type Condition = { col: string; op: string; val: unknown };

interface DbRequest {
  table: string;
  op: "select" | "insert" | "update" | "delete" | "upsert";
  selectCols?: string;
  data?: Record<string, unknown>;
  conditions?: Condition[];
  orderBy?: string;
  limit?: number;
  single?: boolean;
  upsertConflict?: string;
}

function q(s: string) { return `"${s}"`; }

function buildWhere(conditions: Condition[], offset = 0): [string, unknown[]] {
  if (!conditions.length) return ["", []];
  const params: unknown[] = [];
  const parts = conditions.map(({ col, op, val }) => {
    params.push(val);
    return `${q(col)} ${op} $${offset + params.length}`;
  });
  return [`WHERE ${parts.join(" AND ")}`, params];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function execute(req: DbRequest): Promise<{ data: any; error: any }> {
  const { table, op, selectCols = "*", data, conditions = [], orderBy, limit, single, upsertConflict } = req;

  try {
    if (op === "select") {
      const [where, wp] = buildWhere(conditions);
      let query = `SELECT ${selectCols} FROM ${q(table)} ${where}`;
      if (orderBy) query += ` ORDER BY ${q(orderBy)}`;
      if (limit)   query += ` LIMIT ${limit}`;
      const rows = await sql(query, wp);
      if (single) return rows.length === 0
        ? { data: null, error: { message: "No rows found", code: "PGRST116" } }
        : { data: rows[0], error: null };
      return { data: rows, error: null };
    }

    if (op === "insert" && data) {
      const keys = Object.keys(data);
      const vals = Object.values(data);
      const ph   = vals.map((_, i) => `$${i + 1}`).join(", ");
      const rows = await sql(
        `INSERT INTO ${q(table)} (${keys.map(q).join(", ")}) VALUES (${ph}) RETURNING *`,
        vals
      );
      if (single) return { data: rows[0] ?? null, error: null };
      return { data: rows, error: null };
    }

    if (op === "upsert" && data) {
      const keys = Object.keys(data);
      const vals = Object.values(data);
      const ph   = vals.map((_, i) => `$${i + 1}`).join(", ");
      const conflictCols = (upsertConflict ?? keys[0]).split(",").map(c => c.trim());
      const updateKeys   = keys.filter(k => !conflictCols.includes(k));
      const updateStr    = updateKeys.length
        ? `UPDATE SET ${updateKeys.map(k => `${q(k)} = EXCLUDED.${q(k)}`).join(", ")}`
        : "NOTHING";
      await sql(
        `INSERT INTO ${q(table)} (${keys.map(q).join(", ")}) VALUES (${ph})
         ON CONFLICT (${conflictCols.map(q).join(", ")}) DO ${updateStr}`,
        vals
      );
      return { data: null, error: null };
    }

    if (op === "update" && data) {
      const keys = Object.keys(data);
      const vals = Object.values(data);
      const sets = keys.map((k, i) => `${q(k)} = $${i + 1}`).join(", ");
      const [where, wp] = buildWhere(conditions, vals.length);
      await sql(`UPDATE ${q(table)} SET ${sets} ${where}`, [...vals, ...wp]);
      return { data: null, error: null };
    }

    if (op === "delete") {
      const [where, wp] = buildWhere(conditions);
      await sql(`DELETE FROM ${q(table)} ${where}`, wp);
      return { data: null, error: null };
    }

    return { data: null, error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[db] ${op} "${table}":`, msg);
    return { data: null, error: { message: msg, code: "DB_ERROR" } };
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json() as DbRequest;
  const result = await execute(body);
  return NextResponse.json(result);
}

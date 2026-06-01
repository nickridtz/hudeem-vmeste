/**
 * Neon-based drop-in replacement for the Supabase JS client.
 * Exposes the same `supabase.from(table).select/insert/update/delete/upsert` API
 * so every other file stays unchanged.
 */
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
type DbResult<T> = { data: T | null; error: { message: string; code: string } | null };

class QueryBuilder {
  private _table: string;
  private _op: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private _data?: Row;
  private _conditions: Array<{ col: string; op: string; val: unknown }> = [];
  private _orderBy?: string;
  private _limit?: number;
  private _selectCols = "*";
  private _upsertConflict?: string;
  private _single = false;

  constructor(table: string) { this._table = table; }

  select(cols = "*") { this._selectCols = cols; return this; }
  insert(data: Row)   { this._op = "insert"; this._data = data; return this; }
  update(data: Row)   { this._op = "update"; this._data = data; return this; }
  delete()            { this._op = "delete"; return this; }
  upsert(data: Row, opts?: { onConflict: string }) {
    this._op = "upsert"; this._data = data; this._upsertConflict = opts?.onConflict; return this;
  }
  eq(col: string, val: unknown)    { this._conditions.push({ col, op: "=",     val }); return this; }
  ilike(col: string, val: unknown) { this._conditions.push({ col, op: "ILIKE", val }); return this; }
  order(col: string) { this._orderBy = col; return this; }
  limit(n: number)   { this._limit = n;     return this; }
  single()           { this._single = true; return this; }

  private buildWhere(offset = 0): [string, unknown[]] {
    if (!this._conditions.length) return ["", []];
    const params: unknown[] = [];
    const parts = this._conditions.map(({ col, op, val }) => {
      params.push(val);
      return `"${col}" ${op} $${offset + params.length}`;
    });
    return [`WHERE ${parts.join(" AND ")}`, params];
  }

  private q(s: string) { return `"${s}"`; }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async execute(): Promise<DbResult<any>> {
    try {
      /* ── SELECT ── */
      if (this._op === "select") {
        const [where, wp] = this.buildWhere();
        let q = `SELECT ${this._selectCols} FROM "${this._table}" ${where}`;
        if (this._orderBy) q += ` ORDER BY "${this._orderBy}"`;
        if (this._limit)   q += ` LIMIT ${this._limit}`;
        const rows = await sql(q, wp) as Row[];
        if (this._single)
          return rows.length === 0
            ? { data: null, error: { message: "No rows found", code: "PGRST116" } }
            : { data: rows[0], error: null };
        return { data: rows, error: null };
      }

      /* ── INSERT ── */
      if (this._op === "insert") {
        const keys = Object.keys(this._data!);
        const vals = Object.values(this._data!);
        const ph   = vals.map((_, i) => `$${i + 1}`).join(", ");
        const rows = await sql(
          `INSERT INTO "${this._table}" (${keys.map(k => `"${k}"`).join(", ")}) VALUES (${ph}) RETURNING *`,
          vals
        ) as Row[];
        if (this._single) return { data: rows[0] ?? null, error: null };
        return { data: rows, error: null };
      }

      /* ── UPSERT ── */
      if (this._op === "upsert") {
        const keys = Object.keys(this._data!);
        const vals = Object.values(this._data!);
        const ph   = vals.map((_, i) => `$${i + 1}`).join(", ");
        const conflictCols = (this._upsertConflict ?? keys[0]).split(",").map(c => c.trim());
        const updateKeys   = keys.filter(k => !conflictCols.includes(k));
        const updateStr    = updateKeys.length
          ? `UPDATE SET ${updateKeys.map(k => `"${k}" = EXCLUDED."${k}"`).join(", ")}`
          : "NOTHING";
        await sql(
          `INSERT INTO "${this._table}" (${keys.map(k => `"${k}"`).join(", ")}) VALUES (${ph})
           ON CONFLICT (${conflictCols.map(k => `"${k}"`).join(", ")}) DO ${updateStr}`,
          vals
        );
        return { data: null, error: null };
      }

      /* ── UPDATE ── */
      if (this._op === "update") {
        const keys = Object.keys(this._data!);
        const vals = Object.values(this._data!);
        const sets = keys.map((k, i) => `"${k}" = $${i + 1}`).join(", ");
        const [where, wp] = this.buildWhere(vals.length);
        await sql(`UPDATE "${this._table}" SET ${sets} ${where}`, [...vals, ...wp]);
        return { data: null, error: null };
      }

      /* ── DELETE ── */
      if (this._op === "delete") {
        const [where, wp] = this.buildWhere();
        await sql(`DELETE FROM "${this._table}" ${where}`, wp);
        return { data: null, error: null };
      }

      return { data: null, error: null };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[db] ${this._op} "${this._table}":`, msg);
      return { data: null, error: { message: msg, code: "DB_ERROR" } };
    }
  }

  // Makes the builder thenable — `await supabase.from(...).select(...)` works directly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  then<T>(resolve: (val: DbResult<any>) => T, reject?: (e: unknown) => T) {
    return this.execute().then(resolve, reject);
  }
}

export const supabase = {
  from: (table: string) => new QueryBuilder(table),
};

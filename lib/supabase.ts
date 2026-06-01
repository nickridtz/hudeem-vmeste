/**
 * Client-side database wrapper.
 * Sends all queries to /api/db (server-side) so DATABASE_URL never leaks to the browser.
 */

type Row = Record<string, unknown>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbResult<T = any> = { data: T | null; error: { message: string; code: string } | null };

interface DbRequest {
  table: string;
  op: "select" | "insert" | "update" | "delete" | "upsert";
  selectCols?: string;
  data?: Row;
  conditions?: Array<{ col: string; op: string; val: unknown }>;
  orderBy?: string;
  limit?: number;
  single?: boolean;
  upsertConflict?: string;
}

async function callApi(req: DbRequest): Promise<DbResult> {
  const res = await fetch("/api/db", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return res.json();
}

class QueryBuilder {
  private _req: DbRequest;
  private _single = false;

  constructor(table: string) {
    this._req = { table, op: "select", selectCols: "*", conditions: [] };
  }

  select(cols = "*") {
    this._req.selectCols = cols;
    // only set op to "select" if no other op has been set
    if (this._req.op !== "insert" && this._req.op !== "update" && this._req.op !== "upsert")
      this._req.op = "select";
    return this;
  }
  insert(data: Row)   { this._req.op = "insert"; this._req.data = data; return this; }
  update(data: Row)   { this._req.op = "update"; this._req.data = data; return this; }
  delete()            { this._req.op = "delete"; return this; }
  upsert(data: Row, opts?: { onConflict: string }) {
    this._req.op = "upsert"; this._req.data = data;
    this._req.upsertConflict = opts?.onConflict;
    return this;
  }
  eq(col: string, val: unknown) {
    this._req.conditions!.push({ col, op: "=", val }); return this;
  }
  ilike(col: string, val: unknown) {
    this._req.conditions!.push({ col, op: "ILIKE", val }); return this;
  }
  order(col: string)  { this._req.orderBy = col;  return this; }
  limit(n: number)    { this._req.limit = n;       return this; }
  single()            { this._single = true;       return this; }

  async execute(): Promise<DbResult> {
    return callApi({ ...this._req, single: this._single });
  }

  then<T>(resolve: (val: DbResult) => T, reject?: (e: unknown) => T) {
    return this.execute().then(resolve, reject);
  }
}

export const supabase = {
  from: (table: string) => new QueryBuilder(table),
};

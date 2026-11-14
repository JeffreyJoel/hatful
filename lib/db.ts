import "server-only";
import { Pool, types, type PoolClient } from "pg";
import { attachDatabasePool } from "@vercel/functions";

// Return dates as the strings the pages expect: `date` as YYYY-MM-DD (a Date would
// shift a day across timezones) and `timestamptz` as ISO 8601.
types.setTypeParser(types.builtins.DATE, (v) => v);
types.setTypeParser(types.builtins.TIMESTAMPTZ, (v) =>
  new Date(v.replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00")).toISOString(),
);

// pg treats sslmode=require (Neon's default URL) as verify-full today but will weaken it
// to libpq's meaning in v9; asking for verify-full keeps certificate checks either way.
function connectionString(url = process.env.DATABASE_URL) {
  if (!url) return url;
  const u = new URL(url);
  if (u.searchParams.get("sslmode") === "require") u.searchParams.set("sslmode", "verify-full");
  return u.toString();
}

const pool = new Pool({ connectionString: connectionString() });
// Lets Vercel Fluid compute close idle clients before a function instance suspends.
attachDatabasePool(pool);

export type Db = Pick<PoolClient, "query">;

// The only way the app reaches Postgres. DATABASE_URL's owner role bypasses RLS, so
// every transaction drops to `authenticated` (or `anon`) and sets the user that
// auth.uid() reads; both reset at commit, so pooled connections never carry them over.
export async function asUser<T>(userId: string | null, run: (db: Db) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`set local role ${userId ? "authenticated" : "anon"}`);
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      userId ? JSON.stringify({ sub: userId }) : "",
    ]);
    const result = await run(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

// Postgres error helpers for messages raised by the SQL functions.
export function pgMessage(error: unknown) {
  return error instanceof Error ? error.message : "";
}
export function pgCode(error: unknown) {
  return (error as { code?: string } | null)?.code;
}

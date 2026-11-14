import "server-only";
import { connection } from "next/server";
import { headers } from "next/headers";
import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import { PostgresDialect } from "kysely";
import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { connectionString } from "@/lib/db";
import { sendSignInCode as emailSignInCode } from "@/lib/email/send-sign-in-code";
import { noteSendFailure, withSendOutcome } from "./send-outcome";

const CODE_TTL_SECONDS = 300;

function createAuth() {
  // The one exception to "every query goes through asUser()": Better Auth reads and
  // writes app_auth as the owner role. authenticated and anon have no access to it.
  const pool = new Pool({ connectionString: connectionString() });
  attachDatabasePool(pool);

  return betterAuth({
    // schemaName, not search_path: Neon's pooled connection refuses that startup option.
    database: { dialect: new PostgresDialect({ pool }), type: "postgres", schemaName: "app_auth" },
    baseURL: process.env.NEXT_PUBLIC_SITE_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    // groups.owner_id, members.user_id and auth.uid() are all uuid.
    advanced: { database: { generateId: "uuid" } },
    emailAndPassword: { enabled: false },
    // In the database: memory limits don't hold across serverless instances.
    rateLimit: { enabled: true, storage: "database" },
    session: { cookieCache: { enabled: true, maxAge: 300 } },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: CODE_TTL_SECONDS,
        // Per IP. The default of 3 a minute locks out a group joining from one office.
        rateLimit: { window: 60, max: 10 },
        // Awaited so the function isn't frozen mid-send after responding; a refused
        // send is noted for sendSignInCode below, as Better Auth swallows it.
        sendVerificationOTP: ({ email, otp }) =>
          noteSendFailure(() => emailSignInCode(email, otp, CODE_TTL_SECONDS)),
      }),
      nextCookies(),
    ],
  });
}

// Built on first use, so a build without the auth env vars can still import this.
let instance: ReturnType<typeof createAuth> | null = null;
const getAuth = () => (instance ??= createAuth());

export const auth = {
  handler: (request: Request) => getAuth().handler(request),
  get api() {
    return getAuth().api;
  },
};

// The session at request time. connection() keeps the lookup out of prefetch
// prerenders, where it would be cut off.
export async function getSession() {
  await connection();
  return auth.api.getSession({ headers: await headers() });
}

// The signed-in user's id, or null. Every data call passes this to asUser().
export async function currentUserId(): Promise<string | null> {
  return (await getSession())?.user?.id ?? null;
}

// Goes through the HTTP handler, not auth.api, because only the handler applies the
// per-IP rate limit; the caller's forwarding headers carry the IP.
export async function sendSignInCode(body: {
  email: string;
  type: "sign-in";
}): Promise<{ error: { status?: number; message?: string } | null }> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL!;
    const forwarded = new Headers(await headers());
    forwarded.set("content-type", "application/json");
    forwarded.set("origin", new URL(base).origin);
    forwarded.delete("content-length");
    forwarded.delete("cookie");
    const { result: response, sendError } = await withSendOutcome(() =>
      auth.handler(
        new Request(new URL("/api/auth/email-otp/send-verification-otp", base), {
          method: "POST",
          headers: forwarded,
          body: JSON.stringify(body),
        }),
      ),
    );
    if (sendError) throw sendError;
    if (response.ok) return { error: null };
    const data = (await response.json().catch(() => null)) as { message?: string } | null;
    return { error: { status: response.status, message: data?.message } };
  } catch (error) {
    return { error: { message: error instanceof Error ? error.message : String(error) } };
  }
}

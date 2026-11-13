import "server-only";
import { connection } from "next/server";
import { createNeonAuth } from "@neon/auth/next/server";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
});

// The session at request time. connection() keeps the lookup out of prefetch
// prerenders, where its fetch would be cut off.
export async function getSession() {
  await connection();
  const { data } = await auth.getSession();
  return data;
}

// The signed-in user's id, or null. Every data call passes this to asUser().
export async function currentUserId(): Promise<string | null> {
  return (await getSession())?.user?.id ?? null;
}


// @neon/auth 0.8.2 proxies email-otp/send-verification-otp on the server but types
// `emailOtp` as unknown; same shape as Better Auth's client call.
type SendCode = (body: { email: string; type: "sign-in" }) => Promise<{
  error: { status?: number; message?: string } | null;
}>;
export const sendSignInCode: SendCode = (body) =>
  (auth as unknown as { emailOtp: { sendVerificationOtp: SendCode } }).emailOtp.sendVerificationOtp(body);

import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Magic link landing: sign in, join the group named in the link, then go to it.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const pkceCode = params.get("code");
  const join = params.get("join");
  const name = params.get("name")?.trim();

  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));
  const back = join ? `/join/${encodeURIComponent(join)}` : "/";

  const supabase = await createClient();
  const { error } = tokenHash && type
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    : pkceCode
      ? await supabase.auth.exchangeCodeForSession(pkceCode)
      : { error: new Error("missing token") };

  if (error) return to(`${back}?error=link`);
  if (!join || !name) return to("/");

  const { data: groupId, error: joinError } = await supabase.rpc("join_group", {
    p_code: join,
    p_name: name,
  });
  // A closed invite still lands on its page, which explains why.
  if (joinError) return to(back);

  return to(`/g/${groupId}`);
}

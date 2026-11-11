import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createGroupAs, parseNewGroup } from "@/lib/create-group";

// Magic link landing: sign in, then finish what the link was for (join or create a group).
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const pkceCode = params.get("code");
  const join = params.get("join");
  const name = params.get("name")?.trim();
  const creating = params.get("create") === "1";

  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));
  const back = join ? `/join/${encodeURIComponent(join)}` : creating ? "/new" : "/";

  const supabase = await createClient();
  const { data, error } = tokenHash && type
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    : pkceCode
      ? await supabase.auth.exchangeCodeForSession(pkceCode)
      : { data: { user: null }, error: new Error("missing token") };

  if (error || !data.user) return to(`${back}?error=link`);

  if (creating) {
    const group = parseNewGroup((key) => params.get(key));
    if (typeof group === "string") return to("/new");
    try {
      return to(`/g/${await createGroupAs(supabase, data.user.id, group)}`);
    } catch {
      return to("/new?error=create");
    }
  }

  if (!join || !name) return to("/");

  const { data: groupId, error: joinError } = await supabase.rpc("join_group", {
    p_code: join,
    p_name: name,
  });
  // A closed invite still lands on its page, which explains why.
  if (joinError) return to(back);

  return to(`/g/${groupId}`);
}

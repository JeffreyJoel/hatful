"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createGroupAs, newGroupParams, parseNewGroup } from "@/lib/create-group";

export type FormState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string };

const NAME_MAX = 40;
const EMAIL = /^\S+@\S+\.\S+$/;

// Emails a sign-in link that lands on /auth/confirm with `params` attached.
async function sendLink(email: string, params: URLSearchParams): Promise<FormState> {
  if (!EMAIL.test(email)) return { status: "error", message: "That email doesn't look right." };

  const confirm = new URL("/auth/confirm", process.env.NEXT_PUBLIC_SITE_URL);
  // %20 not "+": the email template HTML-escapes "+", and a mangled link drops the token.
  confirm.search = params.toString().replace(/\+/g, "%20");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: confirm.toString(), shouldCreateUser: true },
  });
  if (!error) return { status: "sent", email };
  return {
    status: "error",
    message:
      error.status === 429
        ? "Too many links sent. Wait a minute and try again."
        : "We couldn't send your link. Try again in a moment.",
  };
}

async function signedInUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims.sub ?? null };
}

// Signed in: join straight away. Signed out: email a link that joins on arrival.
export async function requestMagicLink(_prev: FormState, form: FormData): Promise<FormState> {
  const code = String(form.get("code") ?? "");
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();

  if (!name) return { status: "error", message: "Add your name so the group knows who you are." };
  if (name.length > NAME_MAX) {
    return { status: "error", message: `Keep your name under ${NAME_MAX} characters.` };
  }

  const { supabase, userId } = await signedInUserId();
  if (userId) {
    const { data: groupId, error } = await supabase.rpc("join_group", { p_code: code, p_name: name });
    if (error) return { status: "error", message: error.message };
    redirect(`/g/${groupId}`);
  }

  return sendLink(email, new URLSearchParams({ join: code, name }));
}

// Signed in: create now. Signed out: the magic link carries the fields and creates on arrival.
export async function createGroup(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseNewGroup((key) => form.get(key) as string | null);
  if (typeof parsed === "string") return { status: "error", message: parsed };

  const { supabase, userId } = await signedInUserId();
  if (userId) {
    let groupId: string;
    try {
      groupId = await createGroupAs(supabase, userId, parsed);
    } catch {
      return { status: "error", message: "We couldn't create the group. Try again." };
    }
    redirect(`/g/${groupId}`);
  }

  const params = newGroupParams(parsed);
  params.set("create", "1");
  return sendLink(String(form.get("email") ?? "").trim(), params);
}

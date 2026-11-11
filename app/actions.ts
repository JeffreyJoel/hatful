"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type JoinState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string };

const NAME_MAX = 40;

// Signed in: join straight away. Signed out: email a link that joins on arrival.
export async function requestMagicLink(_prev: JoinState, form: FormData): Promise<JoinState> {
  const code = String(form.get("code") ?? "");
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();

  if (!name) return { status: "error", message: "Add your name so the group knows who you are." };
  if (name.length > NAME_MAX) {
    return { status: "error", message: `Keep your name under ${NAME_MAX} characters.` };
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (claims?.claims) {
    const { data: groupId, error } = await supabase.rpc("join_group", { p_code: code, p_name: name });
    if (error) return { status: "error", message: error.message };
    redirect(`/g/${groupId}`);
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return { status: "error", message: "That email doesn't look right." };
  }

  const confirm = new URL("/auth/confirm", process.env.NEXT_PUBLIC_SITE_URL);
  confirm.searchParams.set("join", code);
  confirm.searchParams.set("name", name);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: confirm.toString(), shouldCreateUser: true },
  });

  if (error) {
    return {
      status: "error",
      message:
        error.status === 429
          ? "Too many links sent. Wait a minute and try again."
          : "We couldn't send your link. Try again in a moment.",
    };
  }
  return { status: "sent", email };
}

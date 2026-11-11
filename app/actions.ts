"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createGroupAs, newGroupParams, parseNewGroup } from "@/lib/create-group";
import { parseMoney } from "@/lib/format";

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

export type Result = { ok: true } | { ok: false; message: string };

const FAILED: Result = { ok: false, message: "We couldn't save that. Try again." };

// The caller's own member row in a group, or null when they are not in it.
async function myMember(groupId: string) {
  const { supabase, userId } = await signedInUserId();
  if (!userId) return null;
  const { data } = await supabase
    .from("members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();
  return data ? { supabase, memberId: data.id as string } : null;
}

// The organiser's one-time draw. draw_names does every check itself.
export async function drawNames(groupId: string): Promise<Result> {
  const { supabase } = await signedInUserId();
  const { error } = await supabase.rpc("draw_names", { g: groupId });
  if (!error) return { ok: true };
  if (/house rules/i.test(error.message)) {
    return { ok: false, message: "These house rules make a draw impossible. Remove one and try again." };
  }
  if (/at least 3/i.test(error.message)) return { ok: false, message: error.message };
  return { ok: false, message: "We couldn't draw names. Refresh the page and try again." };
}

// Called only when the hold completes (rule 4). Returns just the name to show.
export async function revealMatch(
  groupId: string,
): Promise<{ ok: true; name: string } | { ok: false; message: string }> {
  const { supabase } = await signedInUserId();
  const { data, error } = await supabase
    .rpc("reveal_my_match", { g: groupId })
    .maybeSingle<{ receiver_name: string }>();
  if (error || !data) {
    return { ok: false, message: "We couldn't unwrap your match. Try again in a moment." };
  }
  return { ok: true, name: data.receiver_name };
}

// House rules store each pair once, smaller id first.
function pair(groupId: string, a: string, b: string) {
  const [member_a, member_b] = a.toLowerCase() < b.toLowerCase() ? [a, b] : [b, a];
  return { group_id: groupId, member_a, member_b };
}

export async function addRule(groupId: string, a: string, b: string): Promise<Result> {
  if (a === b) return { ok: false, message: "Pick two different people." };
  const { supabase } = await signedInUserId();
  const { error } = await supabase.from("exclusions").insert(pair(groupId, a, b));
  if (!error) return { ok: true };
  return error.code === "23505" ? { ok: false, message: "That rule is already on the list." } : FAILED;
}

export async function removeRule(groupId: string, a: string, b: string): Promise<Result> {
  const { supabase } = await signedInUserId();
  const { error } = await supabase.from("exclusions").delete().match(pair(groupId, a, b));
  return error ? FAILED : { ok: true };
}

export async function addWish(
  groupId: string,
  wish: { title: string; url: string; price: string; note: string },
): Promise<Result> {
  const title = wish.title.trim();
  const note = wish.note.trim();
  const price = parseMoney(wish.price);
  let url: string | null = wish.url.trim() || null;

  if (!title) return { ok: false, message: "Say what you'd like." };
  if (title.length > 80) return { ok: false, message: "Keep the wish under 80 characters." };
  if (note.length > 200) return { ok: false, message: "Keep the note under 200 characters." };
  if (price === "bad") return { ok: false, message: "Write the price as a number, like 30." };
  if (url) {
    try {
      const parsed = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
      if (!parsed.hostname.includes(".")) throw new Error();
      url = parsed.toString();
    } catch {
      return { ok: false, message: "That link doesn't look right." };
    }
  }

  const mine = await myMember(groupId);
  if (!mine) return FAILED;
  const { error } = await mine.supabase
    .from("wishes")
    .insert({ member_id: mine.memberId, title, url, price_cents: price, note: note || null });
  return error ? FAILED : { ok: true };
}

export async function removeWish(wishId: string): Promise<Result> {
  const { supabase } = await signedInUserId();
  const { error } = await supabase.from("wishes").delete().eq("id", wishId);
  return error ? FAILED : { ok: true };
}

// The note a member's Santa sees above their wishlist.
export async function saveNote(groupId: string, note: string): Promise<Result> {
  const text = note.trim();
  if (text.length > 200) return { ok: false, message: "Keep your note under 200 characters." };
  const mine = await myMember(groupId);
  if (!mine) return FAILED;
  const { error } = await mine.supabase
    .from("members")
    .update({ note: text || null })
    .eq("id", mine.memberId);
  return error ? FAILED : { ok: true };
}

// "I'm getting this". Claims are their own table so the wish's owner never sees them.
export async function toggleClaim(groupId: string, wishId: string, claimed: boolean): Promise<Result> {
  const mine = await myMember(groupId);
  if (!mine) return FAILED;
  const { error } = claimed
    ? await mine.supabase.from("wish_claims").upsert({ wish_id: wishId, giver_id: mine.memberId })
    : await mine.supabase.from("wish_claims").delete().eq("wish_id", wishId);
  return error ? FAILED : { ok: true };
}

export async function setGiftBought(groupId: string, bought: boolean): Promise<Result> {
  const { supabase } = await signedInUserId();
  const { error } = await supabase.rpc("set_gift_bought", { g: groupId, p_bought: bought });
  return error ? FAILED : { ok: true };
}

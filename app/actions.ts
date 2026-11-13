"use server";

import { redirect } from "next/navigation";
import { asUser, pgCode, pgMessage, type Db } from "@/lib/db";
import { currentUserId, sendSignInCode } from "@/lib/auth/server";
import { createGroupAs, parseNewGroup } from "@/lib/create-group";
import { parseMoney } from "@/lib/format";

export type FormState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string };

const NAME_MAX = 40;
const EMAIL = /^\S+@\S+\.\S+$/;

// Emails a 6-digit sign-in code. The form then signs in with it (lib/auth/client.ts)
// and resubmits itself, which lands in the signed-in branch of the action.
async function sendCode(email: string): Promise<FormState> {
  if (!EMAIL.test(email)) return { status: "error", message: "That email doesn't look right." };

  const { error } = await sendSignInCode({ email, type: "sign-in" });
  if (!error) return { status: "sent", email };
  console.error("Sign-in code request failed", { status: error.status, message: error.message });
  return {
    status: "error",
    message:
      error.status === 429
        ? "Too many codes sent. Wait a minute and try again."
        : "We couldn't send your code. Try again in a moment.",
  };
}

// Signed in: join straight away. Signed out: email a sign-in code.
export async function requestJoin(_prev: FormState, form: FormData): Promise<FormState> {
  const code = String(form.get("code") ?? "");
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();

  if (!name) return { status: "error", message: "Add your name so the group knows who you are." };
  if (name.length > NAME_MAX) {
    return { status: "error", message: `Keep your name under ${NAME_MAX} characters.` };
  }

  const userId = await currentUserId();
  if (userId) {
    let groupId: string;
    try {
      groupId = await asUser(userId, async (db) => {
        const { rows } = await db.query<{ g: string }>("select join_group($1, $2) as g", [code, name]);
        return rows[0].g;
      });
    } catch (error) {
      return { status: "error", message: pgMessage(error) || "We couldn't add you. Try again." };
    }
    redirect(`/g/${groupId}`);
  }

  return sendCode(email);
}

// Signed in: create now. Signed out: email a sign-in code.
export async function createGroup(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseNewGroup((key) => form.get(key) as string | null);
  if (typeof parsed === "string") return { status: "error", message: parsed };

  const userId = await currentUserId();
  if (userId) {
    let groupId: string;
    try {
      groupId = await asUser(userId, (db) => createGroupAs(db, userId, parsed));
    } catch {
      return { status: "error", message: "We couldn't create the group. Try again." };
    }
    redirect(`/g/${groupId}`);
  }

  return sendCode(String(form.get("email") ?? "").trim());
}

export type Result = { ok: true } | { ok: false; message: string };

const FAILED: Result = { ok: false, message: "We couldn't save that. Try again." };

// Runs `run` as the signed-in user, or returns FAILED when nobody is signed in.
async function signedIn(run: (db: Db, userId: string) => Promise<Result>): Promise<Result> {
  const userId = await currentUserId();
  if (!userId) return FAILED;
  return asUser(userId, (db) => run(db, userId)).catch(() => FAILED);
}

// The caller's own member id in a group, or null when they are not in it.
async function myMemberId(db: Db, groupId: string, userId: string) {
  const { rows } = await db.query<{ id: string }>(
    "select id from members where group_id = $1 and user_id = $2",
    [groupId, userId],
  );
  return rows[0]?.id ?? null;
}

// The organiser's one-time draw. draw_names does every check itself.
export async function drawNames(groupId: string): Promise<Result> {
  const userId = await currentUserId();
  try {
    await asUser(userId, (db) => db.query("select draw_names($1)", [groupId]));
    return { ok: true };
  } catch (error) {
    const message = pgMessage(error);
    if (/house rules/i.test(message)) {
      return { ok: false, message: "These house rules make a draw impossible. Remove one and try again." };
    }
    if (/at least 3/i.test(message)) return { ok: false, message };
    return { ok: false, message: "We couldn't draw names. Refresh the page and try again." };
  }
}

// Called only when the hold completes (rule 4). Returns just the name to show.
export async function revealMatch(
  groupId: string,
): Promise<{ ok: true; name: string } | { ok: false; message: string }> {
  const failed = { ok: false, message: "We couldn't unwrap your match. Try again in a moment." } as const;
  const userId = await currentUserId();
  if (!userId) return failed;
  try {
    const { rows } = await asUser(userId, (db) =>
      db.query<{ receiver_name: string }>("select receiver_name from reveal_my_match($1)", [groupId]),
    );
    return rows[0] ? { ok: true, name: rows[0].receiver_name } : failed;
  } catch {
    return failed;
  }
}

// House rules store each pair once, smaller id first.
function pair(groupId: string, a: string, b: string) {
  return a.toLowerCase() < b.toLowerCase() ? [groupId, a, b] : [groupId, b, a];
}

export async function addRule(groupId: string, a: string, b: string): Promise<Result> {
  if (a === b) return { ok: false, message: "Pick two different people." };
  const userId = await currentUserId();
  if (!userId) return FAILED;
  try {
    await asUser(userId, (db) =>
      db.query("insert into exclusions (group_id, member_a, member_b) values ($1, $2, $3)", pair(groupId, a, b)),
    );
    return { ok: true };
  } catch (error) {
    return pgCode(error) === "23505" ? { ok: false, message: "That rule is already on the list." } : FAILED;
  }
}

export async function removeRule(groupId: string, a: string, b: string): Promise<Result> {
  return signedIn(async (db) => {
    await db.query(
      "delete from exclusions where group_id = $1 and member_a = $2 and member_b = $3",
      pair(groupId, a, b),
    );
    return { ok: true };
  });
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

  return signedIn(async (db, userId) => {
    const memberId = await myMemberId(db, groupId, userId);
    if (!memberId) return FAILED;
    await db.query(
      "insert into wishes (member_id, title, url, price_cents, note) values ($1, $2, $3, $4, $5)",
      [memberId, title, url, price, note || null],
    );
    return { ok: true };
  });
}

export async function removeWish(wishId: string): Promise<Result> {
  return signedIn(async (db) => {
    await db.query("delete from wishes where id = $1", [wishId]);
    return { ok: true };
  });
}

// The note a member's Santa sees above their wishlist.
export async function saveNote(groupId: string, note: string): Promise<Result> {
  const text = note.trim();
  if (text.length > 200) return { ok: false, message: "Keep your note under 200 characters." };
  return signedIn(async (db, userId) => {
    const memberId = await myMemberId(db, groupId, userId);
    if (!memberId) return FAILED;
    await db.query("update members set note = $1 where id = $2", [text || null, memberId]);
    return { ok: true };
  });
}

// "I'm getting this". Claims are their own table so the wish's owner never sees them.
export async function toggleClaim(groupId: string, wishId: string, claimed: boolean): Promise<Result> {
  return signedIn(async (db, userId) => {
    const memberId = await myMemberId(db, groupId, userId);
    if (!memberId) return FAILED;
    if (claimed) {
      await db.query(
        `insert into wish_claims (wish_id, giver_id) values ($1, $2)
         on conflict (wish_id) do update set giver_id = excluded.giver_id`,
        [wishId, memberId],
      );
    } else {
      await db.query("delete from wish_claims where wish_id = $1", [wishId]);
    }
    return { ok: true };
  });
}

export async function setGiftBought(groupId: string, bought: boolean): Promise<Result> {
  return signedIn(async (db) => {
    await db.query("select set_gift_bought($1, $2)", [groupId, bought]);
    return { ok: true };
  });
}

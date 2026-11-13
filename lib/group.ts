import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { asUser } from "@/lib/db";
import { currentUserId } from "@/lib/auth/server";

type Group = {
  id: string;
  name: string;
  owner_id: string;
  join_code: string;
  budget_cents: number | null;
  currency: string;
  swap_date: string | null;
  status: "open" | "drawn";
  drawn_at: string | null;
};
type Me = { id: string; display_name: string; note: string | null; unwrapped_at: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The group and the caller's own member row. Not a member (or no such group) is a 404,
// so a group's existence never leaks. cache() shares one lookup per request.
export const getGroup = cache(async (id: string) => {
  if (!UUID.test(id)) notFound();

  const userId = await currentUserId();
  if (!userId) notFound();

  // RLS hides groups the caller isn't in, so a missing row covers both cases.
  const { group, me } = await asUser(userId, async (db) => {
    const [g, m] = await Promise.all([
      db.query<Group>(
        `select id, name, owner_id, join_code, budget_cents, currency, swap_date, status, drawn_at
           from groups where id = $1`,
        [id],
      ),
      db.query<Me>(
        "select id, display_name, note, unwrapped_at from members where group_id = $1 and user_id = $2",
        [id, userId],
      ),
    ]);
    return { group: g.rows[0], me: m.rows[0] };
  });

  if (!group || !me) notFound();
  return { group, me, isOwner: group.owner_id === userId };
});

import "server-only";
import { asUser } from "@/lib/db";

export type MyGroup = {
  id: string;
  name: string;
  status: "open" | "drawn";
  is_owner: boolean;
  unwrapped: boolean;
  member_count: number;
  display_name: string;
};

// Every group the user is in, newest first. RLS already limits groups and members to
// the caller's own; the user_id filter just picks their member row.
export function getMyGroups(userId: string) {
  return asUser(userId, async (db) => {
    const { rows } = await db.query<MyGroup>(
      `select g.id, g.name, g.status,
              g.owner_id = m.user_id          as is_owner,
              m.unwrapped_at is not null      as unwrapped,
              m.display_name,
              (select count(*) from members x where x.group_id = g.id)::int as member_count
         from members m
         join groups g on g.id = m.group_id
        where m.user_id = $1
        order by g.created_at desc`,
      [userId],
    );
    return rows;
  });
}

// Where a group's row should take them: the lobby until the draw, then the
// hold-to-unwrap screen, then their match.
export function groupHref(g: MyGroup) {
  if (g.status === "open") return `/g/${g.id}`;
  return g.unwrapped ? `/g/${g.id}/match` : `/g/${g.id}/draw`;
}

// Only paths back into the app, so ?next= can't send anyone to another site.
const NEXT = /^\/(g|join)\/[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*$/;
export function safeNext(next: string | string[] | undefined) {
  return typeof next === "string" && NEXT.test(next) ? next : null;
}

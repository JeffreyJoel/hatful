import "server-only";
import { createRealtime, pgParam, rawSql } from "@neon/realtime/server";
import { asUser } from "@/lib/db";

const realtime = createRealtime({ secret: process.env.NEON_REALTIME_SECRET!, db: "neondb" });

// bigint arrives as a string on the live side; select it as text on both.
export type LobbyPulse = { group_id: string; version: string };

const pulseQuery = (groupId: string) =>
  rawSql<LobbyPulse>(
    "SELECT group_id, version::text AS version FROM lobby_pulse WHERE group_id = $1",
    [pgParam.text("uuid", groupId)],
  );

// The lobby's subscription, for members only. lobby_pulse can't carry RLS, so the
// membership check happens here, again on every renewal.
export async function sealLobby(userId: string, groupId: string) {
  const isMember = await asUser(userId, async (db) => {
    const { rows } = await db.query("select is_member($1) as ok", [groupId]);
    return rows[0]?.ok === true;
  });
  if (!isMember) return null;
  return realtime.seal({ query: pulseQuery(groupId) });
}

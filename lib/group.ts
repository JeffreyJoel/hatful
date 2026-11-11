import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The group and the caller's own member row. Not a member (or no such group) is a 404,
// so a group's existence never leaks. cache() shares one lookup per request.
export const getGroup = cache(async (id: string) => {
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) notFound();

  const [{ data: group }, { data: me }] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, owner_id, join_code, budget_cents, currency, swap_date, status, drawn_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("members")
      .select("id, display_name, note, unwrapped_at")
      .eq("group_id", id)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (!group || !me) notFound();
  return { group, me, isOwner: group.owner_id === userId };
});

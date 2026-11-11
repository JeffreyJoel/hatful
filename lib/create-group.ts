import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseMoney } from "@/lib/format";

export type NewGroup = {
  groupName: string;
  name: string;
  budgetCents: number | null;
  swapDate: string | null;
};

// No 0/o, 1/l/i: codes get read aloud and typed from a phone.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function joinCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

// Validates the form fields; returns the group or a message for the person.
export function parseNewGroup(get: (key: string) => string | null): NewGroup | string {
  const groupName = (get("group") ?? "").trim();
  const name = (get("name") ?? "").trim();
  const budget = parseMoney(get("budget") ?? "");
  const swapDate = (get("date") ?? "").trim() || null;

  if (!groupName) return "Give the group a name.";
  if (groupName.length > 60) return "Keep the group name under 60 characters.";
  if (!name) return "Add your name so the group knows who's organising.";
  if (name.length > 40) return "Keep your name under 40 characters.";
  if (budget === "bad") return "Write the limit as a number, like 30.";
  if (swapDate && !/^\d{4}-\d{2}-\d{2}$/.test(swapDate)) return "That date doesn't look right.";

  return { groupName, name, budgetCents: budget, swapDate };
}

// The same fields as URL params, for the magic link to carry them through sign-in.
export function newGroupParams(g: NewGroup) {
  const p = new URLSearchParams({ group: g.groupName, name: g.name });
  if (g.budgetCents != null) p.set("budget", (g.budgetCents / 100).toString());
  if (g.swapDate) p.set("date", g.swapDate);
  return p;
}

// Creates the group as the signed-in user and puts them in it as the organiser.
export async function createGroupAs(supabase: SupabaseClient, ownerId: string, g: NewGroup) {
  const code = joinCode();
  const { data: group, error } = await supabase
    .from("groups")
    .insert({
      name: g.groupName,
      owner_id: ownerId,
      join_code: code,
      budget_cents: g.budgetCents,
      swap_date: g.swapDate,
    })
    .select("id")
    .single();
  if (error) throw error;

  const { error: joinError } = await supabase.rpc("join_group", { p_code: code, p_name: g.name });
  if (joinError) throw joinError;
  return group.id as string;
}

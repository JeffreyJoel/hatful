import "server-only";
import type { Db } from "@/lib/db";
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

// Creates the group as the signed-in user and puts them in it as the organiser.
// Run inside asUser(ownerId, ...) so RLS checks owner_id and join_group sees the caller.
export async function createGroupAs(db: Db, ownerId: string, g: NewGroup) {
  const code = joinCode();
  const { rows } = await db.query<{ id: string }>(
    `insert into groups (name, owner_id, join_code, budget_cents, swap_date)
     values ($1, $2, $3, $4, $5) returning id`,
    [g.groupName, ownerId, code, g.budgetCents, g.swapDate],
  );
  await db.query("select join_group($1, $2)", [code, g.name]);
  return rows[0].id;
}

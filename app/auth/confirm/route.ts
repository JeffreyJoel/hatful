import { NextResponse, type NextRequest } from "next/server";
import { asUser } from "@/lib/db";
import { currentUserId } from "@/lib/auth/server";
import { createGroupAs, parseNewGroup } from "@/lib/create-group";

// Magic link landing. Neon Auth has already verified the link and the proxy has set
// the session; finish what the link was for (join or create a group).
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const join = params.get("join");
  const name = params.get("name")?.trim();
  const creating = params.get("create") === "1";

  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));
  const back = join ? `/join/${encodeURIComponent(join)}` : creating ? "/new" : "/";

  const userId = await currentUserId();
  if (!userId) return to(`${back}?error=link`);

  if (creating) {
    const group = parseNewGroup((key) => params.get(key));
    if (typeof group === "string") return to("/new");
    try {
      return to(`/g/${await asUser(userId, (db) => createGroupAs(db, userId, group))}`);
    } catch {
      return to("/new?error=create");
    }
  }

  if (!join || !name) return to("/");

  try {
    const groupId = await asUser(userId, async (db) => {
      const { rows } = await db.query<{ g: string }>("select join_group($1, $2) as g", [join, name]);
      return rows[0].g;
    });
    return to(`/g/${groupId}`);
  } catch {
    // A closed invite still lands on its page, which explains why.
    return to(back);
  }
}

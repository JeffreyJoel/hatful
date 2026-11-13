import { currentUserId } from "@/lib/auth/server";
import { sealLobby } from "@/lib/realtime";

// Renews the lobby's sealed query. The body names the user the page was loaded for;
// a different session (signed out, or another account) gets 401 and the page reloads.
export async function POST(request: Request, { params }: RouteContext<"/api/lobby/[id]/live">) {
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { userId?: unknown } | null;
  const userId = await currentUserId();
  if (!userId || body?.userId !== userId) return new Response(null, { status: 401 });

  const sealed = await sealLobby(userId, id).catch(() => null);
  if (!sealed) return new Response(null, { status: 403 });
  return Response.json(sealed);
}

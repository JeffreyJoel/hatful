import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";

// Next 16's name for middleware. Refreshes the session and sends signed-out visitors
// to sign in; only /g/* is private.
const authMiddleware = auth.middleware({
  loginUrl: "/sign-in",
  publicRoutes: ["/", "/new", "/join", "/sign-in", "/api/webhooks"],
});

// Neon's redirect drops the page they asked for; add it as ?next= so signing in
// takes them back there. /sign-in only accepts /g/ and /join/ paths.
export default async function proxy(request: NextRequest) {
  const response = await authMiddleware(request);
  const location = response.headers.get("location");
  if (!location || !request.nextUrl.pathname.startsWith("/g/")) return response;

  const target = new URL(location, request.url);
  if (target.origin !== request.nextUrl.origin || target.pathname !== "/sign-in") return response;

  target.searchParams.set("next", request.nextUrl.pathname);
  const redirect = NextResponse.redirect(target, response.status);
  for (const cookie of response.headers.getSetCookie()) redirect.headers.append("set-cookie", cookie);
  return redirect;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};

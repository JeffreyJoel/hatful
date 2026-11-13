import { auth } from "@/lib/auth/server";

// Next 16's name for middleware. Refreshes the session and sends signed-out visitors
// to the landing page; only /g/* is private.
export default auth.middleware({
  loginUrl: "/",
  publicRoutes: ["/", "/new", "/join", "/api/webhooks"],
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};

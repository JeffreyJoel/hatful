import { auth } from "@/lib/auth/server";

// Next 16's name for middleware. Refreshes the session, finishes the magic-link
// hand-off, and sends signed-out visitors to the landing page; only /g/* is private.
export default auth.middleware({
  loginUrl: "/",
  publicRoutes: ["/", "/new", "/join", "/auth/confirm"],
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};

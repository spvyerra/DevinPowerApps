/**
 * Route guard: every page except sign-in needs a session, `/apps/<slug>` needs access to that app, and `/admin` needs an admin.
 * One proxy keeps the rules out of every app page, so apps Devin generates are guarded without extra code.
 * Owner: spvyerra.
 */
import { NextResponse } from "next/server";
import { auth, canOpenApp, isAdmin } from "@/auth";

export default auth((request) => {
  const { pathname, search } = request.nextUrl;
  const email = request.auth?.user?.email;
  if (!email) {
    const signIn = new URL("/signin", request.url);
    signIn.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(signIn);
  }
  const appSlug = pathname.match(/^\/apps\/([^/]+)/)?.[1];
  if (appSlug && !canOpenApp(email, appSlug)) {
    return NextResponse.redirect(new URL(`/no-access?app=${encodeURIComponent(appSlug)}`, request.url));
  }
  if (pathname.startsWith("/admin") && !isAdmin(email)) {
    return NextResponse.redirect(new URL("/", request.url));
  }
});

export const config = {
  matcher: ["/((?!api/auth|signin|_next/static|_next/image|favicon.ico).*)"],
};

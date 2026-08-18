import { NextRequest, NextResponse } from "next/server";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { verifySessionToken } from "@/lib/server/session";

const DEMO_COOKIE = "pos_session";
const PUBLIC_PATHS = [
  "/login",
  "/welcome",
  "/display",
  "/api/auth/login",
  "/api/health",
  "/store",
  "/api/store",
  "/sitemap.xml",
  "/robots.txt",
  "/api/payments/webhook",
  "/api/whatsapp/webhook",
];

/**
 * Optimistic auth guard. Demo cookie must be HMAC-valid when Supabase is off.
 * Once Supabase is configured the demo cookie is ignored.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  // Supabase may chunk cookies as `sb-<ref>-auth-token.0`, `.1`, …
  const hasSupabaseSession = req.cookies
    .getAll()
    .some(
      (c) =>
        c.name.startsWith("sb-") &&
        (c.name.includes("-auth-token") || c.name.includes("auth-token")),
    );
  const demoRaw = req.cookies.get(DEMO_COOKIE)?.value;
  const hasDemoSession = !isSupabaseEnabled && verifySessionToken(demoRaw);

  if (!hasSupabaseSession && !hasDemoSession) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, data: null, error: "Unauthorized" },
        { status: 401 },
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (pathname.startsWith("/hq")) {
      url.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};

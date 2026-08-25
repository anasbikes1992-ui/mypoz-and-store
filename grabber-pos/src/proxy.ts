import { NextRequest, NextResponse } from "next/server";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { verifySessionToken } from "@/lib/server/session";
import { inspectRequest } from "@/lib/server/waf";
import { apiRateLimitAsync, clientIpFromHeaders } from "@/lib/server/rate-limit";
import {
  resolveStoreSlugAlias,
  rewriteStorePath,
} from "@/lib/store-slug-aliases";

const DEMO_COOKIE = "pos_session";
const SID_COOKIE = "mypoz_sid";
const PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/update-password",
  "/welcome",
  "/privacy-policy",
  "/terms-of-service",
  "/data-deletion",
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

function isPublicPath(req: NextRequest): boolean {
  const { pathname } = req.nextUrl;
  if (pathname === "/api/observability/events" && req.method === "POST") {
    return true;
  }
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function withStorefrontContext(req: NextRequest) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-mypoz-host", req.headers.get("host") ?? "");
  // Page (/store/:slug) and API (/api/store/:slug) both need the tenant slug —
  // storefront_documents(host, null) is null on the shared vercel.app host.
  const match = req.nextUrl.pathname.match(
    /^\/(?:api\/)?store\/([^/]+)/,
  );
  if (match?.[1]) {
    requestHeaders.set("x-mypoz-slug", decodeURIComponent(match[1]));
  }
  const res = NextResponse.next({
    request: { headers: requestHeaders },
  });
  if (!req.cookies.get(SID_COOKIE)?.value) {
    res.cookies.set(SID_COOKIE, crypto.randomUUID(), {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });
  }
  return res;
}

function blocked(status: number, reason: string, retryAfterSec?: number) {
  const res = NextResponse.json(
    { success: false, data: null, error: reason },
    { status },
  );
  res.headers.set("x-mypoz-waf", reason);
  if (retryAfterSec) res.headers.set("Retry-After", String(retryAfterSec));
  return res;
}

/**
 * Front door for POS, store, and HQ: WAF, adaptive IP ban, then auth.
 * Also stamps storefront host/slug so anonymous shoppers load that tenant.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // When matching broadly, explicitly skip Next static assets.
  if (
    pathname.startsWith("/_next/static") ||
    pathname.startsWith("/_next/image") ||
    pathname === "favicon.ico" ||
    pathname.endsWith(".png")
  ) {
    return NextResponse.next();
  }

  // 308 alias → canonical storefront slug (path-preserving).
  const storeMatch = pathname.match(/^\/store\/([^/]+)(.*)$/);
  if (storeMatch) {
    const canonical = resolveStoreSlugAlias(storeMatch[1]!);
    if (canonical) {
      const url = req.nextUrl.clone();
      url.pathname = rewriteStorePath(pathname, canonical);
      return NextResponse.redirect(url, 308);
    }
  }

  const waf = inspectRequest(req);
  if (!waf.ok) return blocked(waf.status, waf.reason);

  // Health stays unlimited; WhatsApp has its own signature gate.
  // Payments webhooks stay rate-limited (shared Upstash when configured).
  if (pathname !== "/api/health" && pathname !== "/api/whatsapp/webhook") {
    const decision = await apiRateLimitAsync(
      clientIpFromHeaders(req.headers),
      pathname,
    );
    if (decision.limited) {
      return blocked(
        429,
        decision.banned ? "ip_temporarily_banned" : "rate_limited",
        decision.retryAfterSec,
      );
    }
  }

  if (isPublicPath(req)) {
    return withStorefrontContext(req);
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
  return withStorefrontContext(req);
}

export const config = {
  // Also match dotfiles like `/.env` which Next may otherwise treat as
  // filesystem assets (causing fail-open probes).
  matcher: ["/:path*"],
};

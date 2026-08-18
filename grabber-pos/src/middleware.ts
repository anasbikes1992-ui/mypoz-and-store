import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Stamp the public storefront slug/host onto request headers so server
 * reads of commerce/website/settings can load that tenant's published
 * documents without a signed-in session.
 */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-mypoz-host", request.headers.get("host") ?? "");
  const match = request.nextUrl.pathname.match(/^\/store\/([^/]+)/);
  if (match?.[1]) {
    requestHeaders.set("x-mypoz-slug", decodeURIComponent(match[1]));
  }
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/store/:path*"],
};

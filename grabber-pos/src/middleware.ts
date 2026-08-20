import { NextRequest, NextResponse } from "next/server";
import {
  resolveStoreSlugAlias,
  rewriteStorePath,
} from "@/lib/store-slug-aliases";

/**
 * 308 alias → canonical storefront slug (path-preserving).
 * Covers /store/[slug] and nested routes (cart, products, account, …).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const match = pathname.match(/^\/store\/([^/]+)(.*)$/);
  if (!match) return NextResponse.next();

  const slug = match[1]!;
  const canonical = resolveStoreSlugAlias(slug);
  if (!canonical) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = rewriteStorePath(pathname, canonical);
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ["/store/:path*"],
};

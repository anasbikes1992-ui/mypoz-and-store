import type { NextRequest } from "next/server";

const BLOCKED_PATH = [
  /\.env/i,
  /\.git/i,
  /wp-admin/i,
  /wp-login/i,
  /xmlrpc\.php/i,
  /phpmyadmin/i,
  /vendor\/phpunit/i,
  /\.(php|asp|aspx|jsp)$/i,
  /\/etc\/passwd/i,
  /\.\.\//,
  /%00/,
  /<script/i,
  /union\s+select/i,
  /sleep\s*\(/i,
  /benchmark\s*\(/i,
];

const BLOCKED_UA = [/sqlmap/i, /nikto/i, /dirbuster/i, /masscan/i];

export type WafResult =
  | { ok: true }
  | { ok: false; status: number; reason: string };

export function inspectUrl(pathWithQuery: string): WafResult {
  const decoded = safeDecode(pathWithQuery).replace(/\+/g, " ");
  for (const re of BLOCKED_PATH) {
    if (re.test(decoded) || re.test(pathWithQuery)) {
      return { ok: false, status: 403, reason: "blocked_pattern" };
    }
  }
  if (pathWithQuery.length > 2048) {
    return { ok: false, status: 414, reason: "uri_too_long" };
  }
  return { ok: true };
}

export function inspectUserAgent(ua: string | null): WafResult {
  if (!ua) return { ok: true };
  for (const re of BLOCKED_UA) {
    if (re.test(ua)) return { ok: false, status: 403, reason: "blocked_ua" };
  }
  return { ok: true };
}

export function inspectRequest(req: NextRequest): WafResult {
  const path = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  const urlHit = inspectUrl(path);
  if (!urlHit.ok) return urlHit;
  return inspectUserAgent(req.headers.get("user-agent"));
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

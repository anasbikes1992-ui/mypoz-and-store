/**
 * Per-isolate adaptive limiter. Vercel instances do not share memory, so this
 * is the application layer. Edge DDoS still needs Cloudflare in front (see
 * docs/DDOS_AND_WAF.md).
 */
export type LimitDecision =
  | { limited: false }
  | { limited: true; retryAfterSec: number; banned: boolean };

type Bucket = { count: number; resetAt: number; strikes: number };
type Ban = { until: number };

const buckets = new Map<string, Bucket>();
const bans = new Map<string, Ban>();

const WINDOW_MS = 10_000;
const STRIKE_WINDOW_HITS = 80;
const BAN_AFTER_STRIKES = 3;
const BAN_MS = 15 * 60_000;

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "unknown";
}

export function rateLimit(
  key: string,
  max = STRIKE_WINDOW_HITS,
  windowMs = WINDOW_MS,
): LimitDecision {
  const now = Date.now();
  const ban = bans.get(key);
  if (ban && now < ban.until) {
    return {
      limited: true,
      retryAfterSec: Math.ceil((ban.until - now) / 1000),
      banned: true,
    };
  }
  if (ban && now >= ban.until) bans.delete(key);

  let bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 1, resetAt: now + windowMs, strikes: bucket?.strikes ?? 0 };
    buckets.set(key, bucket);
    return { limited: false };
  }
  bucket.count += 1;
  if (bucket.count <= max) return { limited: false };

  bucket.strikes += 1;
  if (bucket.strikes >= BAN_AFTER_STRIKES) {
    bans.set(key, { until: now + BAN_MS });
    bucket.strikes = 0;
    return { limited: true, retryAfterSec: Math.ceil(BAN_MS / 1000), banned: true };
  }
  return {
    limited: true,
    retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
    banned: false,
  };
}

export function loginRateLimit(ip: string): LimitDecision {
  return rateLimit(`login:${ip}`, 8, 60_000);
}

export function apiRateLimit(ip: string, path: string): LimitDecision {
  if (path.startsWith("/api/auth/login")) return loginRateLimit(ip);
  if (path.startsWith("/api/store") || path.startsWith("/api/observability")) {
    return rateLimit(`store:${ip}`, 40, 10_000);
  }
  if (path.startsWith("/api/")) return rateLimit(`api:${ip}`, 80, 10_000);
  return rateLimit(`page:${ip}`, 120, 10_000);
}

/** Test helper */
export function resetRateLimitState() {
  buckets.clear();
  bans.clear();
}

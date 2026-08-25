/**
 * Adaptive rate limiter.
 * Prefer shared Upstash Redis on Vercel (multi-instance). Falls back to
 * in-memory Maps only when UPSTASH_* is unset (dev / single isolate).
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

function upstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
}

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "unknown";
}

async function upstashRateLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<LimitDecision | null> {
  const base = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!base || !token) return null;

  const redisKey = `rl:${key}`;
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  try {
    const res = await fetch(`${base}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, windowSec],
      ]),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: unknown }[];
    const count = Number(json?.[0]?.result ?? 0);
    if (count <= max) return { limited: false };
    return {
      limited: true,
      retryAfterSec: windowSec,
      banned: count > max * BAN_AFTER_STRIKES,
    };
  } catch {
    return null;
  }
}

function memoryRateLimit(
  key: string,
  max: number,
  windowMs: number,
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

/** Sync API kept for existing call sites; uses memory path. */
export function rateLimit(
  key: string,
  max = STRIKE_WINDOW_HITS,
  windowMs = WINDOW_MS,
): LimitDecision {
  return memoryRateLimit(key, max, windowMs);
}

/** Prefer shared Redis when configured (production multi-instance). */
export async function rateLimitAsync(
  key: string,
  max = STRIKE_WINDOW_HITS,
  windowMs = WINDOW_MS,
): Promise<LimitDecision> {
  if (upstashConfigured()) {
    const remote = await upstashRateLimit(key, max, windowMs);
    if (remote) return remote;
  }
  return memoryRateLimit(key, max, windowMs);
}

export function loginRateLimit(ip: string): LimitDecision {
  return rateLimit(`login:${ip}`, 8, 60_000);
}

export async function loginRateLimitAsync(ip: string): Promise<LimitDecision> {
  return rateLimitAsync(`login:${ip}`, 8, 60_000);
}

export function apiRateLimit(ip: string, path: string): LimitDecision {
  if (path.startsWith("/api/auth/login")) return loginRateLimit(ip);
  if (path.startsWith("/api/store") || path.startsWith("/api/observability")) {
    return rateLimit(`store:${ip}`, 40, 10_000);
  }
  if (path.startsWith("/api/payments") || path.startsWith("/api/pos/pay")) {
    return rateLimit(`pay:${ip}`, 30, 10_000);
  }
  if (path.startsWith("/api/")) return rateLimit(`api:${ip}`, 80, 10_000);
  return rateLimit(`page:${ip}`, 120, 10_000);
}

export async function apiRateLimitAsync(
  ip: string,
  path: string,
): Promise<LimitDecision> {
  if (path.startsWith("/api/auth/login")) return loginRateLimitAsync(ip);
  if (path.startsWith("/api/store") || path.startsWith("/api/observability")) {
    return rateLimitAsync(`store:${ip}`, 40, 10_000);
  }
  if (path.startsWith("/api/payments") || path.startsWith("/api/pos/pay")) {
    return rateLimitAsync(`pay:${ip}`, 30, 10_000);
  }
  if (path.startsWith("/api/")) return rateLimitAsync(`api:${ip}`, 80, 10_000);
  return rateLimitAsync(`page:${ip}`, 120, 10_000);
}

export function rateLimitBackend(): "upstash" | "memory" {
  return upstashConfigured() ? "upstash" : "memory";
}

/** Test helper */
export function resetRateLimitState() {
  buckets.clear();
  bans.clear();
}

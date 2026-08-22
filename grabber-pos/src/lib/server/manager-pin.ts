import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const PREFIX = "scrypt";
const KEYLEN = 32;

/** Hash a manager PIN for durable storage (never store plaintext). */
export function hashManagerPin(pin: string): string {
  const normalized = String(pin ?? "");
  if (normalized.length < 4 || normalized.length > 32) {
    throw new Error("PIN must be 4–32 characters");
  }
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(normalized, salt, KEYLEN).toString("base64url");
  return `${PREFIX}$${salt}$${hash}`;
}

export function isHashedManagerPin(value: string | undefined | null): boolean {
  if (!value) return false;
  const parts = value.split("$");
  return parts.length === 3 && parts[0] === PREFIX;
}

/**
 * Constant-time verify. Supports legacy plaintext values until they are re-hashed on save.
 */
export function verifyManagerPinValue(
  pin: string,
  stored: string | undefined | null,
): boolean {
  const candidate = String(pin ?? "");
  const expected = String(stored ?? "");
  if (!candidate || !expected) return false;

  if (isHashedManagerPin(expected)) {
    const [, salt, hash] = expected.split("$");
    if (!salt || !hash) return false;
    try {
      const got = scryptSync(candidate, salt, KEYLEN);
      const want = Buffer.from(hash, "base64url");
      if (got.length !== want.length) return false;
      return timingSafeEqual(got, want);
    } catch {
      return false;
    }
  }

  // Legacy plaintext — still compare in constant time when lengths match.
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

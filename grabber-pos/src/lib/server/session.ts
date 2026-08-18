import "server-only";
import { createHmac } from "crypto";

export const SESSION_COOKIE = "pos_session";
export const SESSION_HOURS = 12;

function secret(): string {
  const s = process.env.POS_SESSION_SECRET?.trim();
  if (!s) {
    throw new Error(
      "POS_SESSION_SECRET is required. Set a 32+ char hex secret in .env.local (no default).",
    );
  }
  return s;
}

export function isDefaultSessionSecret(): boolean {
  const s = process.env.POS_SESSION_SECRET?.trim();
  return !s || s === "dev-only-secret";
}

export function sessionToken(user: string): string {
  return user + "." + createHmac("sha256", secret()).update(user).digest("hex");
}

/** Check that a demo cookie was minted with our secret. */
export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token || !token.includes(".")) return false;
  const [user, sig] = token.split(".", 2);
  if (!user || !sig) return false;
  try {
    const expected = createHmac("sha256", secret()).update(user).digest("hex");
    return sig === expected;
  } catch {
    return false;
  }
}

import "server-only";
import { createHash, randomUUID, timingSafeEqual } from "crypto";
import { recordStore } from "./persistence/record-store";

/**
 * Demo / local customer accounts for storefront login when Supabase Auth
 * is not configured. Passwords are salted SHA-256 — fine for eval, not
 * a replacement for Supabase Auth in production.
 */
export interface StoreCustomer {
  id: string;
  slug: string;
  email: string;
  name: string;
  mobile: string;
  passwordHash: string;
  createdAt: string;
}

const store = recordStore<StoreCustomer>({
  collection: "storefront-customers",
  file: "storefront-customers.json",
});

const DEMO_COOKIE = "grabber_store_customer";

export function demoCustomerCookieName(slug: string): string {
  return `${DEMO_COOKIE}_${slug.replace(/[^a-z0-9_-]/gi, "")}`;
}

export function hashPassword(password: string, salt = "grabber-store"): string {
  return createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export async function findCustomerByEmail(
  slug: string,
  email: string,
): Promise<StoreCustomer | null> {
  const needle = email.trim().toLowerCase();
  const all = await store.list();
  return (
    all.find((c) => c.slug === slug && c.email.toLowerCase() === needle) ?? null
  );
}

export async function registerCustomer(input: {
  slug: string;
  email: string;
  name: string;
  mobile?: string;
  password: string;
}): Promise<StoreCustomer> {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) throw new Error("A valid email is required");
  if (input.password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }
  const existing = await findCustomerByEmail(input.slug, email);
  if (existing) throw new Error("An account with this email already exists");

  const customer: StoreCustomer = {
    id: randomUUID(),
    slug: input.slug,
    email,
    name: input.name.trim().slice(0, 120) || email.split("@")[0],
    mobile: (input.mobile ?? "").trim().slice(0, 40),
    passwordHash: hashPassword(input.password),
    createdAt: new Date().toISOString(),
  };
  return store.put(customer);
}

export async function authenticateCustomer(input: {
  slug: string;
  email: string;
  password: string;
}): Promise<StoreCustomer | null> {
  const customer = await findCustomerByEmail(input.slug, input.email);
  if (!customer) return null;
  if (!safeEqual(customer.passwordHash, hashPassword(input.password))) {
    return null;
  }
  return customer;
}

export async function getCustomerById(
  id: string,
): Promise<StoreCustomer | null> {
  return store.get(id);
}

/** Public-safe customer payload for cookies / API responses. */
export function publicCustomer(c: StoreCustomer) {
  return {
    id: c.id,
    email: c.email,
    name: c.name,
    mobile: c.mobile,
  };
}

export type PublicStoreCustomer = ReturnType<typeof publicCustomer>;

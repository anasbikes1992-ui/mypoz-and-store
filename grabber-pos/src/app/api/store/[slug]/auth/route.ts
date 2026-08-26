import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";
import {
  authenticateCustomer,
  registerCustomer,
  publicCustomer,
  demoCustomerCookieName,
  findCustomerByEmail,
  type PublicStoreCustomer,
} from "@/lib/server/storefront-customers-store";
import { getStorefrontInfo } from "@/lib/server/storefront-repo";

const registerSchema = z.object({
  action: z.literal("register"),
  email: z.string().email().max(160),
  password: z.string().min(6).max(120),
  name: z.string().trim().min(1).max(120),
  mobile: z.string().max(40).optional(),
});

const loginSchema = z.object({
  action: z.literal("login"),
  email: z.string().email().max(160),
  password: z.string().min(1).max(120),
});

const magicSchema = z.object({
  action: z.literal("magic"),
  email: z.string().email().max(160),
});

const bodySchema = z.discriminatedUnion("action", [
  registerSchema,
  loginSchema,
  magicSchema,
]);

function cookieOpts(maxAge = 60 * 60 * 24 * 30) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
    secure: process.env.NODE_ENV === "production",
  };
}

function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json({ success: true, data, error: null }, init);
}

function fail(error: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error }, { status });
}

async function linkPosCustomer(customer: {
  name: string;
  email?: string | null;
  mobile?: string | null;
}) {
  try {
    const { upsertPosCustomer } = await import("@/lib/server/pos-customer-link");
    await upsertPosCustomer(customer);
  } catch {
    // Best-effort — never block storefront auth.
  }
}

function setDemoSession(
  res: NextResponse,
  slug: string,
  customer: PublicStoreCustomer,
) {
  res.cookies.set(
    demoCustomerCookieName(slug),
    JSON.stringify(customer),
    cookieOpts(),
  );
}

async function requireStorefront(req: NextRequest, slug: string) {
  const host = req.headers.get("host");
  const info = await getStorefrontInfo({ host, slug });
  if (!info) {
    return NextResponse.json(
      { success: false, data: null, error: "Storefront unavailable" },
      { status: 404 },
    );
  }
  return null;
}

/** Current customer session (demo cookie or Supabase user). */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const missing = await requireStorefront(req, slug);
  if (missing) return missing;
  const raw = req.cookies.get(demoCustomerCookieName(slug))?.value;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as PublicStoreCustomer;
      if (parsed?.id && parsed?.email) {
        return ok({ customer: parsed, mode: "demo" });
      }
    } catch {
      // fall through
    }
  }

  if (isSupabaseEnabled) {
    const auth = req.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    if (token) {
      try {
        const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data } = await sb.auth.getUser();
        if (data.user?.email) {
          return ok({
            customer: {
              id: data.user.id,
              email: data.user.email,
              name:
                (data.user.user_metadata?.name as string) ||
                data.user.email.split("@")[0],
              mobile: (data.user.user_metadata?.mobile as string) || "",
            },
            mode: "supabase",
          });
        }
      } catch {
        // ignore
      }
    }
  }

  return ok({ customer: null, mode: isSupabaseEnabled ? "supabase" : "demo" });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const missing = await requireStorefront(req, slug);
  if (missing) return missing;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON");
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid request");
  }

  const data = parsed.data;

  if (data.action === "magic") {
    if (!isSupabaseEnabled) {
      // Demo fallback: if the email exists, start a session; otherwise ask to register.
      const existing = await findCustomerByEmail(slug, data.email);
      if (!existing) {
        return fail(
          "Magic link needs Supabase Auth, or register with email/password first in demo mode.",
          422,
        );
      }
      const res = ok({
        customer: publicCustomer(existing),
        mode: "demo",
        message: "Signed in (demo magic — Supabase not configured).",
      });
      setDemoSession(res, slug, publicCustomer(existing));
      return res;
    }

    try {
      const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const origin =
        req.headers.get("origin") ||
        `${req.nextUrl.protocol}//${req.nextUrl.host}`;
      const { error } = await sb.auth.signInWithOtp({
        email: data.email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${origin}/store/${slug}/account`,
        },
      });
      if (error) return fail(error.message, 422);
      return ok({
        customer: null,
        mode: "supabase",
        message: "Check your email for a magic link.",
      });
    } catch (err) {
      return fail(
        err instanceof Error ? err.message : "Could not send magic link",
        500,
      );
    }
  }

  // Prefer Supabase Auth when configured — fail closed (no demo JSON fallback).
  if (isSupabaseEnabled && data.action === "register") {
    try {
      const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: authData, error } = await sb.auth.signUp({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        options: {
          data: { name: data.name, mobile: data.mobile ?? "" },
        },
      });
      if (error) return fail(error.message, 422);
      if (!authData.user) return fail("Registration failed", 422);
      const customer = {
        id: authData.user.id,
        email: authData.user.email ?? data.email,
        name: data.name,
        mobile: data.mobile ?? "",
      };
      const res = ok({
        customer,
        mode: "supabase",
        session: authData.session,
      });
      setDemoSession(res, slug, customer);
      await linkPosCustomer(customer);
      return res;
    } catch (err) {
      return fail(err instanceof Error ? err.message : "Registration failed", 500);
    }
  }

  if (isSupabaseEnabled && data.action === "login") {
    try {
      const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: authData, error } = await sb.auth.signInWithPassword({
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });
      if (error || !authData.user) {
        return fail(error?.message ?? "Invalid email or password", 401);
      }
      const customer = {
        id: authData.user.id,
        email: authData.user.email ?? data.email,
        name:
          (authData.user.user_metadata?.name as string) ||
          data.email.split("@")[0],
        mobile: (authData.user.user_metadata?.mobile as string) || "",
      };
      const res = ok({
        customer,
        mode: "supabase",
        session: authData.session,
      });
      setDemoSession(res, slug, customer);
      await linkPosCustomer(customer);
      return res;
    } catch (err) {
      return fail(err instanceof Error ? err.message : "Login failed", 500);
    }
  }

  // Demo JSON path — only when Supabase is not configured.
  try {
    if (data.action === "register") {
      const customer = await registerCustomer({
        slug,
        email: data.email,
        name: data.name,
        mobile: data.mobile,
        password: data.password,
      });
      const pub = publicCustomer(customer);
      const res = ok({ customer: pub, mode: "demo" });
      setDemoSession(res, slug, pub);
      await linkPosCustomer(pub);
      return res;
    }

    const customer = await authenticateCustomer({
      slug,
      email: data.email,
      password: data.password,
    });
    if (!customer) return fail("Invalid email or password", 401);
    const pub = publicCustomer(customer);
    const res = ok({ customer: pub, mode: "demo" });
    setDemoSession(res, slug, pub);
    await linkPosCustomer(pub);
    return res;
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Auth failed", 422);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const missing = await requireStorefront(req, slug);
  if (missing) return missing;
  const res = ok({ customer: null });
  res.cookies.set(demoCustomerCookieName(slug), "", {
    ...cookieOpts(0),
    maxAge: 0,
  });
  return res;
}

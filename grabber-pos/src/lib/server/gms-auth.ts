import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { createServerSupabase } from "@/lib/supabase/server";
import { SESSION_COOKIE, sessionToken } from "@/lib/server/session";

export type GmsIdentity = {
  kind: "demo" | "supabase";
  /** Username (demo) or email (Supabase). */
  id: string;
  role: "gms_admin";
};

function parseList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Demo usernames allowed into `/hq`. Defaults to POS_USER / `admin`. */
function demoAllowlist(): string[] {
  const configured = parseList(process.env.GMS_ADMIN_USERS);
  if (configured.length) return configured;
  return [(process.env.POS_USER ?? "admin").trim().toLowerCase()];
}

/** Supabase emails allowed into `/hq` (plus server-controlled app_metadata.role = gms_admin). */
function emailAllowlist(): string[] {
  return parseList(process.env.GMS_ADMIN_EMAILS);
}

function hasGmsMetadata(meta: Record<string, unknown> | undefined): boolean {
  if (!meta) return false;
  const role = String(meta.role ?? "").toLowerCase();
  if (role === "gms_admin") return true;
  return meta.gms_admin === true || meta.gms_admin === "true";
}

/**
 * Resolve whether the current request is a Grabber Mobility Solutions operator.
 * Does not mint sessions — callers must already be logged in via proxy/auth.
 */
export async function getGmsAdmin(): Promise<GmsIdentity | null> {
  if (isSupabaseEnabled) {
    try {
      const db = await createServerSupabase();
      const {
        data: { user },
      } = await db.auth.getUser();
      if (!user?.email) return null;

      const email = user.email.toLowerCase();
      const metaOk = hasGmsMetadata(user.app_metadata as Record<string, unknown>);
      const allow = emailAllowlist();
      const emailOk = allow.length === 0 ? false : allow.includes(email);

      // Allow if server-controlled app_metadata role is set, OR email is on the allowlist.
      // Empty allowlist alone is not enough (avoids opening HQ to every tenant owner).
      if (!metaOk && !emailOk) return null;

      return { kind: "supabase", id: email, role: "gms_admin" };
    } catch {
      return null;
    }
  }

  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const user = raw.split(".")[0] ?? "";
  if (!user || raw !== sessionToken(user)) return null;
  if (!demoAllowlist().includes(user.toLowerCase())) return null;
  return { kind: "demo", id: user, role: "gms_admin" };
}

export async function requireGmsAdmin(): Promise<
  { ok: true; identity: GmsIdentity } | { ok: false; response: NextResponse }
> {
  const identity = await getGmsAdmin();
  if (!identity) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          data: null,
          error: "GMS HQ access requires a gms_admin identity",
        },
        { status: 403 },
      ),
    };
  }
  return { ok: true, identity };
}

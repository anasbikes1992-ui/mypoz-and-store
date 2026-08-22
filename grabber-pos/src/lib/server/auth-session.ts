import "server-only";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseEnabled, requireSupabase } from "@/lib/supabase/config";
import type { UserRole } from "@/lib/supabase/database.types";

export type TenantSession = {
  userId: string;
  email: string | null;
  orgId: string;
  role: UserRole;
};

/**
 * Require a real Supabase session + profiles row (not cookie-presence alone).
 * Use on APIs that must not rely on proxy.ts optimistic auth.
 */
export async function requireTenantSession(): Promise<
  { ok: true; session: TenantSession } | { ok: false; response: NextResponse }
> {
  if (!isSupabaseEnabled) {
    if (requireSupabase) {
      return {
        ok: false,
        response: NextResponse.json(
          { success: false, data: null, error: "Unauthorized" },
          { status: 401 },
        ),
      };
    }
    // Demo/local: no profiles — treat as owner for local JSON store.
    return {
      ok: true,
      session: {
        userId: "demo",
        email: null,
        orgId: "demo",
        role: "owner",
      },
    };
  }

  try {
    const db = await createServerSupabase();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) {
      return {
        ok: false,
        response: NextResponse.json(
          { success: false, data: null, error: "Unauthorized" },
          { status: 401 },
        ),
      };
    }

    const { data: profile, error } = await db
      .from("profiles")
      .select("org_id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (error || !profile?.org_id) {
      return {
        ok: false,
        response: NextResponse.json(
          { success: false, data: null, error: "Unauthorized" },
          { status: 401 },
        ),
      };
    }

    const role = String(profile.role ?? "cashier") as UserRole;
    if (role !== "owner" && role !== "manager" && role !== "cashier") {
      return {
        ok: false,
        response: NextResponse.json(
          { success: false, data: null, error: "Unauthorized" },
          { status: 401 },
        ),
      };
    }

    return {
      ok: true,
      session: {
        userId: user.id,
        email: user.email ?? null,
        orgId: String(profile.org_id),
        role,
      },
    };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, data: null, error: "Unauthorized" },
        { status: 401 },
      ),
    };
  }
}

export function requireRoles(
  session: TenantSession,
  allowed: UserRole[],
): NextResponse | null {
  if (!allowed.includes(session.role)) {
    return NextResponse.json(
      { success: false, data: null, error: "Forbidden" },
      { status: 403 },
    );
  }
  return null;
}

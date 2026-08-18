import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import {
  SESSION_COOKIE,
  SESSION_HOURS,
  sessionToken,
} from "@/lib/server/session";

/**
 * Demo credential check for local/offline use only.
 * Configure via env: POS_USER, POS_PASSWORD, POS_SESSION_SECRET.
 *
 * Disabled the moment Supabase is configured — otherwise the built-in
 * credentials would be a standing backdoor past Supabase Auth in production.
 */

export async function POST(req: NextRequest) {
  if (isSupabaseEnabled) {
    return NextResponse.json(
      {
        success: false,
        error: "Password login is disabled. Sign in with your account.",
      },
      { status: 403 },
    );
  }

  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 },
    );
  }

  const expectedUser = process.env.POS_USER ?? "admin";
  const expectedPass = process.env.POS_PASSWORD ?? "admin123";
  const user = String(body.username ?? "");
  const pass = String(body.password ?? "");

  const userOk =
    user.length === expectedUser.length &&
    timingSafeEqual(Buffer.from(user), Buffer.from(expectedUser));
  const passOk =
    pass.length === expectedPass.length &&
    timingSafeEqual(Buffer.from(pass), Buffer.from(expectedPass));

  if (!userOk || !passOk) {
    return NextResponse.json(
      { success: false, error: "Invalid username or password" },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ success: true, error: null });
  res.cookies.set(SESSION_COOKIE, sessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: SESSION_HOURS * 3600,
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true, error: null });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}

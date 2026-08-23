import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendBrandedPasswordReset } from "@/lib/server/password-reset";

const bodySchema = z.object({
  email: z.string().email(),
});

const WINDOW_MS = 15 * 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Enter a valid email address" },
      { status: 400 },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (rateLimited(`${ip}:${email}`)) {
    return NextResponse.json(
      {
        success: false,
        error: "Too many reset attempts. Wait a few minutes and try again.",
      },
      { status: 429 },
    );
  }

  try {
    await sendBrandedPasswordReset(email);
    return NextResponse.json({
      success: true,
      data: {
        message:
          "If an account exists for that email, a reset link is on its way.",
      },
      error: null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not send reset email";
    if (/rate limit/i.test(msg)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Email rate limit reached. Ask your administrator to reset your password from HQ, or try again later.",
        },
        { status: 429 },
      );
    }
    console.error("[forgot-password]", msg);
    return NextResponse.json(
      { success: false, error: "Could not send reset email. Try again shortly." },
      { status: 500 },
    );
  }
}

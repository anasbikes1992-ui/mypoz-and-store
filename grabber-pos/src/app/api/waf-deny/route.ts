import { NextResponse } from "next/server";

/**
 * Fail-closed WAF hard deny.
 * Some Next.js requests to dotfiles can be served before middleware runs.
 * This endpoint is the safe rewrite target for `/.env` probes.
 */
export async function GET() {
  return NextResponse.json(
    { success: false, data: null, error: "blocked_dotfile" },
    { status: 403 },
  );
}


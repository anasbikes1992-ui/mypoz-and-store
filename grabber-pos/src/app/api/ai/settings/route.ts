import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  publicAiSettings,
  readAiSettings,
  writeAiSettings,
} from "@/lib/server/ai-keys";
import { requireRoles, requireTenantSession } from "@/lib/server/auth-session";

export async function GET() {
  const auth = await requireTenantSession();
  if (!auth.ok) return auth.response;
  const forbidden = requireRoles(auth.session, ["owner", "manager"]);
  if (forbidden) return forbidden;

  const settings = await readAiSettings();
  return NextResponse.json({
    success: true,
    data: publicAiSettings(settings),
    error: null,
  });
}

const patch = z.object({
  openaiApiKey: z.string().max(200).optional(),
});

export async function PUT(req: NextRequest) {
  const auth = await requireTenantSession();
  if (!auth.ok) return auth.response;
  const forbidden = requireRoles(auth.session, ["owner", "manager"]);
  if (forbidden) return forbidden;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON" },
      { status: 400 },
    );
  }
  const parsed = patch.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid settings" },
      { status: 400 },
    );
  }
  const settings = await writeAiSettings(parsed.data);
  return NextResponse.json({
    success: true,
    data: publicAiSettings(settings),
    error: null,
  });
}

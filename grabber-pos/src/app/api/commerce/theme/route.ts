import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { COMMERCE_THEME_IDS } from "@/lib/commerce/schema";
import { applyStoreTheme } from "@/lib/server/commerce-store";

const bodySchema = z.object({
  themeId: z.enum(COMMERCE_THEME_IDS),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON body" },
      { status: 400 },
    );
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: "Unknown theme" },
      { status: 400 },
    );
  }
  try {
    const draft = await applyStoreTheme(parsed.data.themeId);
    return NextResponse.json({ success: true, data: draft, error: null });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Could not apply theme",
      },
      { status: 400 },
    );
  }
}

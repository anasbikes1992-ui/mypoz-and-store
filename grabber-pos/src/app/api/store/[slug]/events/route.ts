import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { trackCommerceEvent } from "@/lib/server/commerce-analytics-store";

const eventSchema = z.object({
  type: z.enum([
    "page_view",
    "product_view",
    "add_to_cart",
    "checkout_started",
    "purchase",
  ]),
  path: z.string().max(200).default("/"),
  productId: z.string().max(80).optional(),
  value: z.number().min(0).max(10_000_000).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid event" }, { status: 400 });
  }
  await trackCommerceEvent({ slug, ...parsed.data });
  return NextResponse.json({ success: true });
}

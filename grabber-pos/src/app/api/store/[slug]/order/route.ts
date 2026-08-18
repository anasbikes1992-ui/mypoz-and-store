import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { placeStorefrontOrder } from "@/lib/server/storefront-repo";
import { PAYMENT_MODES, FULFILMENT_MODES } from "@/lib/website";
import {
  demoCustomerCookieName,
  type PublicStoreCustomer,
} from "@/lib/server/storefront-customers-store";

const orderSchema = z.object({
  customerName: z.string().trim().min(2, "Name is required").max(120),
  customerMobile: z.string().trim().min(7, "A contact number is required").max(40),
  customerEmail: z
    .string()
    .max(160)
    .optional()
    .transform((v) => (v && v.includes("@") ? v : undefined)),
  address: z.string().trim().max(500).default(""),
  pickupNote: z.string().trim().max(300).optional(),
  paymentMethod: z.enum(PAYMENT_MODES),
  paymentReference: z.string().trim().max(120).optional(),
  fulfilment: z.enum(FULFILMENT_MODES),
  deliveryZoneId: z.string().trim().max(64).optional(),
  clientUuid: z.string().trim().min(8).max(64),
  discountCode: z.string().trim().max(40).optional(),
  lines: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        quantity: z.number().int().positive().max(999),
        variantId: z.string().trim().max(80).optional(),
      }),
    )
    .min(1, "Your cart is empty")
    .max(100, "Too many items in one order"),
});

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function fail(error: string, status: number) {
  return NextResponse.json({ success: false, data: null, error }, { status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  if (rateLimited(clientIp(req))) {
    return fail("Too many orders from this connection. Please try again shortly.", 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request", 400);
  }

  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid order", 400);
  }

  const data = parsed.data;
  const needsAddress = data.fulfilment !== "pickup";
  if (needsAddress && data.address.trim().length < 5) {
    return fail("Delivery address is required", 400);
  }
  if (
    data.paymentMethod === "bank_transfer" &&
    !(data.paymentReference && data.paymentReference.trim().length >= 2)
  ) {
    return fail("Enter your bank transfer reference", 400);
  }

  let customer: PublicStoreCustomer | null = null;
  const raw = req.cookies.get(demoCustomerCookieName(slug))?.value;
  if (raw) {
    try {
      customer = JSON.parse(raw) as PublicStoreCustomer;
    } catch {
      customer = null;
    }
  }

  try {
    const order = await placeStorefrontOrder(
      { host: req.headers.get("host"), slug },
      {
        ...data,
        customerEmail: data.customerEmail || customer?.email || null,
        customerId: customer?.id || null,
        address: data.address,
        pickupNote: data.pickupNote,
        paymentReference: data.paymentReference,
        discountCode: data.discountCode,
      },
    );
    return NextResponse.json({ success: true, data: order, error: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Order could not be placed";
    return fail(cleanMessage(message), 422);
  }
}

function cleanMessage(message: string): string {
  if (message.includes("invalid input syntax for type uuid") || message.includes("Invalid UUID")) {
    return "Selected product is currently unavailable for online order. Please try another product.";
  }
  const known = /^(PRODUCT|STOCK|ORDER|STOREFRONT|QTY|CASH|SALE|BRANCH|AUTH):\s*/;
  if (!known.test(message)) return message.length < 80 ? message : "Order could not be placed. Please try again.";
  const text = message.replace(known, "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

import { NextRequest, NextResponse } from "next/server";
import { listStorefrontOrdersByCustomer } from "@/lib/server/storefront-orders-store";
import {
  demoCustomerCookieName,
  type PublicStoreCustomer,
} from "@/lib/server/storefront-customers-store";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  let customer: PublicStoreCustomer | null = null;
  const raw = req.cookies.get(demoCustomerCookieName(slug))?.value;
  if (raw) {
    try {
      customer = JSON.parse(raw) as PublicStoreCustomer;
    } catch {
      customer = null;
    }
  }

  const email = req.nextUrl.searchParams.get("email");
  const mobile = req.nextUrl.searchParams.get("mobile");

  if (!customer && !email && !mobile) {
    return NextResponse.json(
      { success: false, data: null, error: "Sign in to view order history" },
      { status: 401 },
    );
  }

  const orders = await listStorefrontOrdersByCustomer({
    slug,
    customerId: customer?.id,
    customerEmail: customer?.email || email,
    customerMobile: customer?.mobile || mobile,
  });

  return NextResponse.json({ success: true, data: orders, error: null });
}

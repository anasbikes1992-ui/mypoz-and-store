import { NextRequest, NextResponse } from "next/server";
import { listStorefrontOrdersByCustomer } from "@/lib/server/storefront-orders-store";
import {
  demoCustomerCookieName,
  type PublicStoreCustomer,
} from "@/lib/server/storefront-customers-store";
import { getStorefrontInfo } from "@/lib/server/storefront-repo";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const host = req.headers.get("host");
  if (!(await getStorefrontInfo({ host, slug }))) {
    return NextResponse.json(
      { success: false, data: null, error: "Storefront unavailable" },
      { status: 404 },
    );
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

  // Require signed-in customer cookie — do not allow open email/mobile query IDOR.
  if (!customer?.id && !customer?.email) {
    return NextResponse.json(
      { success: false, data: null, error: "Sign in to view order history" },
      { status: 401 },
    );
  }

  const orders = await listStorefrontOrdersByCustomer({
    slug,
    customerId: customer?.id,
    customerEmail: customer?.email,
    customerMobile: customer?.mobile,
  });

  return NextResponse.json({ success: true, data: orders, error: null });
}

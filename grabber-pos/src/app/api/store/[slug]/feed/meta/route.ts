import { NextRequest, NextResponse } from "next/server";
import { getStorefrontCatalog, getStorefrontInfo } from "@/lib/server/storefront-repo";
import { storeBaseUrl } from "@/lib/server/storefront-url";
import { readSettings } from "@/lib/server/settings-store";

/** Meta / Facebook catalog product feed (CSV) — online_visible catalog only. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const host = req.headers.get("host");
  const info = await getStorefrontInfo({ host, slug });
  if (!info) {
    return new NextResponse("Storefront unavailable", { status: 404 });
  }

  const settings = await readSettings();
  const catalog = await getStorefrontCatalog({ host, slug }, { size: 500 });
  const currency = settings.currency || "LKR";
  const base = await storeBaseUrl(slug);
  const origin = base.replace(/\/store\/[^/]+$/, "") || base;

  const header =
    "id,title,description,availability,condition,price,link,brand,image_link";
  const rows = catalog.items.map((p) => {
    const availability = p.stock > 0 ? "in stock" : "out of stock";
    const image = p.imageUrl
      ? p.imageUrl.startsWith("http")
        ? p.imageUrl
        : `${origin}${p.imageUrl}`
      : "";
    const link = `${base}`;
    return [
      p.id,
      csv(p.name),
      csv(p.description || `${p.name} - Available at ${info.businessName}`),
      availability,
      "new",
      `${p.price} ${currency}`,
      link,
      csv(p.brand || info.businessName),
      image,
    ].join(",");
  });

  return new NextResponse([header, ...rows].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
      "Content-Disposition": 'inline; filename="meta-product-feed.csv"',
    },
  });
}

function csv(value: string): string {
  const s = String(value ?? "").replace(/"/g, '""');
  return `"${s}"`;
}

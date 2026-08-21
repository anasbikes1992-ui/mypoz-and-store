import { NextRequest, NextResponse } from "next/server";
import {
  getStorefrontCatalogExport,
  getStorefrontInfo,
} from "@/lib/server/storefront-repo";
import { readWebsite } from "@/lib/server/website-store";
import { storeBaseUrl } from "@/lib/server/storefront-url";
import { whatsAppLink } from "@/lib/storefront";

/**
 * WhatsApp / Meta-ready catalog export (CSV or JSON).
 * Pages the full online POS catalog (not capped at 100).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const host = req.headers.get("host");
  const format = (req.nextUrl.searchParams.get("format") || "csv").toLowerCase();
  const info = await getStorefrontInfo({ host, slug });
  if (!info) {
    return NextResponse.json(
      { success: false, data: null, error: "Storefront unavailable" },
      { status: 404 },
    );
  }

  const website = await readWebsite();
  const catalog = await getStorefrontCatalogExport({ host, slug });
  const base = await storeBaseUrl(slug);

  const items = catalog.items.map((p) => ({
    id: p.id,
    title: p.name,
    description: p.description || `${p.name} — available at ${info.businessName}`,
    price: p.price,
    currency: "LKR",
    availability: p.stock > 0 ? "in stock" : "out of stock",
    image_url: p.imageUrl
      ? p.imageUrl.startsWith("http")
        ? p.imageUrl
        : `${base.replace(/\/store\/[^/]+$/, "")}${p.imageUrl}`
      : "",
    link: `${base}?q=${encodeURIComponent(p.name)}`,
    brand: p.brand || info.businessName,
    category: p.category || "",
  }));

  if (format === "json") {
    const catalogUrl = `${base.replace(/\/$/, "")}`;
    const template = website.whatsappCatalogTemplate.replace(
      /\{\{catalogUrl\}\}/g,
      catalogUrl,
    );
    const wa = whatsAppLink(website.whatsappNumber || info.whatsappNumber, template);
    return NextResponse.json({
      success: true,
      data: {
        businessName: info.businessName,
        catalogUrl,
        whatsappCatalogLink: wa,
        total: catalog.total,
        items,
      },
      error: null,
    });
  }

  const header =
    "id,title,description,availability,condition,price,link,brand,image_link,product_type";
  const rows = items.map((p) =>
    [
      p.id,
      csv(p.title),
      csv(p.description),
      p.availability,
      "new",
      `${p.price} ${p.currency}`,
      p.link,
      csv(p.brand),
      p.image_url,
      csv(p.category),
    ].join(","),
  );

  return new NextResponse([header, ...rows].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "s-maxage=600, stale-while-revalidate",
      "Content-Disposition": `attachment; filename="${slug}-whatsapp-catalog.csv"`,
    },
  });
}

function csv(value: string): string {
  const s = String(value ?? "").replace(/"/g, '""');
  return `"${s}"`;
}

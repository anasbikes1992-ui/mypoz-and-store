import { NextRequest, NextResponse } from "next/server";
import { getStorefrontCatalog, getStorefrontInfo } from "@/lib/server/storefront-repo";
import { storeBaseUrl } from "@/lib/server/storefront-url";
import { readSettings } from "@/lib/server/settings-store";

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
  const base = await storeBaseUrl(slug);
  const origin = base.replace(/\/store\/[^/]+$/, "") || base;
  const currency = settings.currency || "LKR";

  const xmlItems = catalog.items
    .map((p) => {
      const image = p.imageUrl
        ? p.imageUrl.startsWith("http")
          ? p.imageUrl
          : `${origin}${p.imageUrl}`
        : "";
      return `
    <item>
      <g:id>${escapeXml(p.id)}</g:id>
      <title><![CDATA[${p.name}]]></title>
      <description><![CDATA[${p.description || `${p.name} - Available at ${info.businessName}`}]]></description>
      <link>${escapeXml(base)}</link>
      ${image ? `<g:image_link>${escapeXml(image)}</g:image_link>` : ""}
      <g:price>${p.price} ${currency}</g:price>
      <g:availability>${p.stock > 0 ? "in_stock" : "out_of_stock"}</g:availability>
      <g:condition>new</g:condition>
      <g:brand><![CDATA[${p.brand || info.businessName}]]></g:brand>
    </item>`;
    })
    .join("");

  const rssXml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title><![CDATA[${info.businessName} Product Feed]]></title>
    <link>${escapeXml(base)}</link>
    <description><![CDATA[Automated Google Shopping product feed for ${info.businessName}]]></description>
    ${xmlItems}
  </channel>
</rss>`;

  return new NextResponse(rssXml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}

function escapeXml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

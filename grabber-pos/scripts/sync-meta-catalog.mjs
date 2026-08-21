/**
 * Push Anaz POS/storefront catalog into Meta Commerce catalog via items_batch.
 *
 *   WHATSAPP_TOKEN=… WHATSAPP_APP_SECRET=… node scripts/sync-meta-catalog.mjs
 *   node scripts/sync-meta-catalog.mjs [catalogId] [feedJsonUrl]
 *
 * Default catalog: Anaz Store MyPoz (1397856035621959)
 */
import { createHmac } from "node:crypto";

const token = process.env.WHATSAPP_TOKEN || "";
const secret = process.env.WHATSAPP_APP_SECRET || "";
const catalogId =
  process.argv[2] || process.env.META_PRODUCT_CATALOG_ID || "1397856035621959";
const feedUrl =
  process.argv[3] ||
  process.env.META_FEED_URL ||
  "https://mypoz-and-store-ui.vercel.app/api/store/anaz-store/catalog?format=json";

if (!token || !secret) {
  console.error("Need WHATSAPP_TOKEN and WHATSAPP_APP_SECRET in env");
  process.exit(1);
}

function proof() {
  return createHmac("sha256", secret).update(token).digest("hex");
}

async function graph(method, path, body) {
  const sep = path.includes("?") ? "&" : "?";
  const url = `https://graph.facebook.com/v21.0/${path}${sep}access_token=${encodeURIComponent(token)}&appsecret_proof=${proof()}`;
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`${method} ${path}: ${JSON.stringify(json)}`);
  }
  return json;
}

function toBatchItem(p) {
  const price = Number(p.price) || 0;
  const currency = p.currency || "LKR";
  const availability =
    p.availability === "in stock" || p.availability === "in_stock"
      ? "in stock"
      : "out of stock";
  const data = {
    id: String(p.id),
    title: String(p.title || p.name || "Product").slice(0, 200),
    description: String(p.description || p.title || "").slice(0, 9999),
    availability,
    condition: "new",
    price: `${price.toFixed(2)} ${currency}`,
    link: p.link || "https://mypoz-and-store-ui.vercel.app/store/anaz-store",
    brand: p.brand || "Anaz Store",
  };
  const image = p.image_url || p.image_link;
  if (image) data.image_link = image;
  return { method: "UPDATE", data };
}

const feed = await fetch(feedUrl).then((r) => r.json());
const items = feed?.data?.items || feed?.items || [];
const withImage = items.filter((p) => p.image_url || p.image_link).length;
console.log(
  "feed_items",
  items.length,
  "total_field",
  feed?.data?.total,
  "with_image",
  withImage,
  "missing_image",
  items.length - withImage,
);

if (!items.length) {
  console.error("No items in feed — deploy catalog export fix first");
  process.exit(1);
}

if (withImage < items.length * 0.5) {
  console.warn(
    "Warning: many items lack image_link — Meta may hide them from the WhatsApp catalog until images are set.",
  );
}

const BATCH = 500;
const handles = [];
for (let i = 0; i < items.length; i += BATCH) {
  const slice = items.slice(i, i + BATCH).map(toBatchItem);
  const result = await graph("POST", `${catalogId}/items_batch`, {
    item_type: "PRODUCT_ITEM",
    allow_upsert: true,
    requests: slice,
  });
  const batchHandles = result.handles || (result.handle ? [result.handle] : []);
  handles.push(...batchHandles);
  console.log(
    "batch",
    i / BATCH + 1,
    "size",
    slice.length,
    "handles",
    batchHandles.join(",") || "(none)",
  );
}

const meta = await graph(
  "GET",
  `${catalogId}?fields=id,name,product_count`,
);
console.log(
  JSON.stringify(
    {
      catalogId,
      catalogName: meta.name,
      product_count: meta.product_count,
      uploaded: items.length,
      handles,
      note: "Connect this catalog to WhatsApp in Meta WhatsApp Manager if SMB blocks API link.",
    },
    null,
    2,
  ),
);

/**
 * Write ASCII-safe commerce app_documents SQL for Anaz Store.
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const ORG_ID = "304adc33-7279-4547-a73d-a2240333e814";
const HERO =
  "https://shoppingstation.lk/wp-content/uploads/2024/02/11420-1.jpg";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function id(prefix) {
  return `${prefix}_${randomBytes(3).toString("hex")}`;
}

function section(type, settings) {
  return { id: id("sec"), type, enabled: true, settings };
}

function page(type, title, slug, sections = []) {
  return {
    id: id("pg"),
    type,
    title,
    slug,
    visible: true,
    seoTitle: "",
    seoDescription: "",
    sections,
    blocks: [],
  };
}

const store = {
  name: "Anaz Store",
  slug: "anaz-store",
  description:
    "Exclusive kitchen items and home products in Sri Lanka - authentic imported brands, live stock from the counter.",
  status: "published",
  themeId: "market",
  locale: "en",
  currency: "LKR",
  announcement:
    "Free delivery over Rs 2,000 | Colombo courier & islandwide | Pickup available",
  seoTitle: "Anaz Store | Exclusive kitchen & home products",
  seoDescription:
    "Shop authentic imported kitchen and household products. Live stock from Anaz Store on MyPoz.",
  contactEmail: "anazazeez1992@gmail.com",
  contactPhone: "",
  address: "Sri Lanka",
  navigation: [
    { id: "n_home", label: "Home", href: "", children: [] },
    { id: "n_shop", label: "Shop", href: "products", children: [] },
    { id: "n_about", label: "About", href: "pages/about", children: [] },
    { id: "n_contact", label: "Contact", href: "pages/contact", children: [] },
  ],
  footerLinks: [
    { id: "f_ship", label: "Shipping", href: "pages/shipping", children: [] },
    { id: "f_ret", label: "Returns", href: "pages/returns", children: [] },
    { id: "f_priv", label: "Privacy", href: "pages/privacy", children: [] },
  ],
  social: {
    facebook: "https://shoppingstation.lk",
    instagram: "",
    twitter: "",
    tiktok: "",
    whatsapp: "",
  },
  tokens: {
    primary: "#c81e1e",
    secondary: "#111827",
    headingFont: "",
    bodyFont: "",
    radius: "soft",
    cardStyle: "dense",
    imageRatio: "1:1",
    logoUrl: "",
    faviconUrl: "",
  },
  pages: [
    page("home", "Home", "home", [
      section("hero", {
        heading: "Exclusive Kitchen items, Home products in Sri Lanka",
        subheading:
          "No. 1 authentic imported product reseller - same prices as the store.",
        ctaLabel: "Shop now",
        ctaHref: "products",
        secondaryCtaLabel: "View all",
        secondaryCtaHref: "products",
        alignment: "left",
        height: "tall",
        overlay: 45,
        image: HERO,
      }),
      section("categories", { title: "Shop by category" }),
      section("featured_collection", {
        title: "Featured picks",
        productCount: 8,
        collection: "all",
      }),
      section("trust", {
        items: [
          { title: "Cash on delivery", body: "Pay when you receive" },
          { title: "Islandwide delivery", body: "Free over Rs 2,000" },
          { title: "Live stock", body: "Same ledger as the POS" },
          { title: "Store pickup", body: "Collect with your order number" },
        ],
      }),
      section("image_text", {
        heading: "Why shop with Anaz Store",
        description:
          "Exclusive kitchen and home products. Every price and quantity comes from the same MyPoz catalogue used at the counter - no second inventory.",
        ctaLabel: "Browse products",
        ctaHref: "products",
        imagePosition: "right",
        image: HERO,
      }),
    ]),
    page("products", "Products", "products"),
    page("collections", "Collections", "collections"),
    page("product", "Product", "product"),
    page("about", "About", "about", [
      section("rich_text", {
        heading: "About Anaz Store",
        content:
          "Exclusive kitchen items and home products in Sri Lanka. Authentic imported brands - the same catalogue you buy in-store, now online.",
      }),
    ]),
    page("contact", "Contact", "contact", [
      section("rich_text", {
        heading: "Contact us",
        content:
          "Place an order online or message us. Orders land on the same Anaz Store counter.",
      }),
    ]),
    page("shipping", "Shipping", "shipping", [
      section("rich_text", {
        heading: "Delivery",
        content:
          "Free delivery on orders over Rs 2,000. Colombo courier and islandwide delivery available. Store pickup is free.",
      }),
    ]),
    page("returns", "Returns", "returns", [
      section("rich_text", {
        heading: "Returns",
        content:
          "Contact us within 7 days for unused items in original condition.",
      }),
    ]),
    page("privacy", "Privacy", "privacy", [
      section("rich_text", {
        heading: "Privacy",
        content:
          "We use your details only to fulfil orders and support your account.",
      }),
    ]),
  ],
};

const now = new Date().toISOString();
const commerce = {
  draft: store,
  published: store,
  publishedAt: now,
  updatedAt: now,
};

const lit = JSON.stringify(commerce).replace(/'/g, "''");
const sql = `insert into app_documents (org_id, key, data) values ('${ORG_ID}'::uuid, 'commerce', '${lit}'::jsonb) on conflict (org_id, key) do update set data = excluded.data;`;
writeFileSync(join(root, "data/anaz-doc-commerce.sql"), sql, "utf8");
console.log("wrote", sql.length);

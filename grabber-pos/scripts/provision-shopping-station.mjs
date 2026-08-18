#!/usr/bin/env node
/**
 * Provision Shopping Station as a new MyPoz tenant (own org, owner login,
 * catalogue from WooCommerce CSV, downloaded images, published store).
 *
 * Does NOT grant HQ admin. Does NOT attach to the first existing org.
 * Uses the database URL/password in .env.local (same path as apply-sql.mjs).
 *
 *   node --env-file=.env.local scripts/provision-shopping-station.mjs
 */
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import XLSX from "xlsx";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const EMAIL = "stationshopping11@gmail.com";
const ORG_NAME = "Shopping Station";
const SLUG = "shopping-station";
const CSV = process.env.SHOPPING_STATION_CSV || "C:\\Users\\pc\\Downloads\\Products data.csv";
const SITE = "https://shoppingstation.lk";
const CRED_FILE = join(root, "data", "shopping-station-owner.json");
const IMAGE_DIR = join(root, "data", "shopping-station-images");
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "vtawrxmkahpgwgydibox";

const FEATURED_HINTS = [
  "nutella",
  "peanut butter",
  "country time",
  "lemonade",
  "ketchup",
  "martinelli",
  "sparkling cider",
  "skinny gourmet",
  "torani",
  "da bomb",
  "dapple",
  "downy wrinkle",
  "chunk chicken",
  "oreo",
  "snuggle",
  "the ordinary",
  "kirkland signature supreme",
  "wonderful in-shell",
];

function nid(prefix) {
  return `${prefix}_${randomBytes(4).toString("hex")}`;
}

function slugify(value, fallback = "item") {
  const s = String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return s || fallback;
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);
}

function num(value) {
  const n = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function cell(row, ...names) {
  for (const name of names) {
    if (row[name] != null && String(row[name]).trim() !== "") {
      return String(row[name]).trim();
    }
  }
  const keys = Object.keys(row);
  for (const name of names) {
    const needle = name.toLowerCase();
    const hit = keys.find((k) => k.toLowerCase() === needle || k.toLowerCase().includes(needle));
    if (hit && row[hit] != null && String(row[hit]).trim() !== "") {
      return String(row[hit]).trim();
    }
  }
  return "";
}

function categoryOf(raw) {
  const first = String(raw || "")
    .split(",")[0]
    .split(">")[0]
    .trim();
  return first.slice(0, 80) || "General";
}

function imageList(raw) {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s));
}

async function ensurePassword() {
  const generated = `${randomBytes(9).toString("base64url")}Ss1!`;
  try {
    const existing = await import("node:fs/promises").then((fs) =>
      fs.readFile(CRED_FILE, "utf8"),
    );
    const parsed = JSON.parse(existing);
    if (parsed.password && parsed.email === EMAIL) return String(parsed.password);
  } catch {
    // first run
  }
  return generated;
}

async function pool(items, limit, worker) {
  const ret = new Array(items.length);
  let i = 0;
  async function next() {
    const idx = i++;
    if (idx >= items.length) return;
    ret[idx] = await worker(items[idx], idx);
    return next();
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => next()));
  return ret;
}

async function downloadBytes(url, timeoutMs = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        referer: `${SITE}/`,
      },
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 80 || buf.length > 5 * 1024 * 1024) return null;
    const type = (res.headers.get("content-type") || "").split(";")[0].trim();
    return { buf, type: type || guessType(url) };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function guessType(url) {
  const u = url.toLowerCase();
  if (u.includes(".png")) return "image/png";
  if (u.includes(".webp")) return "image/webp";
  if (u.includes(".gif")) return "image/gif";
  return "image/jpeg";
}

function extOf(type) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "jpg";
}

async function scrapeSiteAssets() {
  const html = await fetch(SITE, {
    headers: { "user-agent": "Mozilla/5.0 MyPozStoreProvision" },
  }).then((r) => r.text());

  const urls = [
    ...html.matchAll(/https?:\/\/shoppingstation\.lk\/wp-content\/uploads\/[^"'\\\s>]+\.(?:jpg|jpeg|png|webp)/gi),
  ].map((m) => m[0].replace(/\\+/g, ""));
  const unique = [...new Set(urls)];

  const logo =
    unique.find((u) => /logo|brand|shopping.?station/i.test(u)) ||
    unique.find((u) => /header/i.test(u)) ||
    "";

  const banners = unique.filter((u) =>
    /banner|slider|slide|hero|woodmart|promo|offer|flash|rev-slide|main-slider/i.test(u),
  );

  let media = [];
  try {
    const json = await fetch(`${SITE}/wp-json/wp/v2/media?per_page=40&media_type=image`).then((r) =>
      r.json(),
    );
    if (Array.isArray(json)) {
      media = json
        .map((m) => m?.source_url || m?.guid?.rendered || "")
        .filter((u) => /^https?:\/\//i.test(u));
    }
  } catch {
    // optional
  }

  const ranked = [...banners, ...media, ...unique.filter((u) => /-\d{3,4}x\d{3,4}/.test(u))];
  const picked = [];
  for (const u of ranked) {
    if (picked.includes(u)) continue;
    if (logo && u === logo) continue;
    picked.push(u);
    if (picked.length >= 6) break;
  }
  if (picked.length < 3) {
    for (const u of unique) {
      if (picked.includes(u) || u === logo) continue;
      picked.push(u);
      if (picked.length >= 6) break;
    }
  }
  return { logo, banners: picked };
}

function buildStoreConfig({ logoUrl, bannerUrls }) {
  const hero = bannerUrls[0] || "";
  const promo = bannerUrls[1] || hero;
  const aboutImg = bannerUrls[2] || hero;
  const nav = [
    { id: "n_home", label: "Home", href: "", children: [] },
    { id: "n_shop", label: "Shop", href: "products", children: [] },
    { id: "n_groc", label: "Grocery", href: "products", children: [] },
    { id: "n_kit", label: "Kitchen", href: "products", children: [] },
    { id: "n_house", label: "Households", href: "products", children: [] },
    { id: "n_care", label: "Personal Care", href: "products", children: [] },
    { id: "n_about", label: "About", href: "pages/about", children: [] },
    { id: "n_contact", label: "Contact", href: "pages/contact", children: [] },
  ];
  const section = (type, settings) => ({
    id: nid("sec"),
    type,
    enabled: true,
    settings,
  });
  const page = (type, title, slug, sections = []) => ({
    id: nid("pg"),
    type,
    title,
    slug,
    visible: true,
    seoTitle: "",
    seoDescription: "",
    sections,
    blocks: [],
  });

  return {
    name: ORG_NAME,
    slug: SLUG,
    description:
      "Exclusive kitchen items, home products in Sri Lanka. No. 1 authentic imported product reseller.",
    status: "published",
    themeId: "market",
    tokens: {
      primary: "#c81e1e",
      secondary: "#111827",
      headingFont: "",
      bodyFont: "",
      radius: "soft",
      cardStyle: "classic",
      imageRatio: "4:5",
      logoUrl: logoUrl || "",
      faviconUrl: logoUrl || "",
    },
    currency: "LKR",
    locale: "en",
    timezone: "Asia/Colombo",
    contactEmail: EMAIL,
    contactPhone: "",
    address: "Sri Lanka",
    announcement: "Free delivery on orders over Rs 2,000 · Islandwide imported kitchen, home & grocery",
    seoTitle: "Shopping Station — Imported Kitchen, Home & Grocery in Sri Lanka",
    seoDescription:
      "Shop exclusive imported kitchen items, home products, grocery and personal care at Shopping Station. Live stock from the POS. Pickup or islandwide delivery.",
    social: {
      facebook: SITE,
      instagram: "",
      twitter: "",
      tiktok: "",
      whatsapp: "",
    },
    navigation: nav,
    footerLinks: [
      { id: "f_ship", label: "Shipping", href: "pages/shipping", children: [] },
      { id: "f_ret", label: "Returns", href: "pages/returns", children: [] },
      { id: "f_pri", label: "Privacy", href: "pages/privacy", children: [] },
      { id: "f_ter", label: "Terms", href: "pages/terms", children: [] },
    ],
    collections: [
      {
        id: "c_feat",
        title: "Featured",
        slug: "featured",
        description: "Staff picks from Shopping Station",
        sourceCategory: "all",
        featured: true,
        collectionType: "automated",
        rules: [{ field: "featured", op: "eq", value: "true" }],
      },
      {
        id: "c_sale",
        title: "Under LKR 5,000",
        slug: "under-5000",
        description: "",
        sourceCategory: "all",
        featured: false,
        collectionType: "automated",
        rules: [{ field: "price", op: "lt", value: "5000" }],
      },
    ],
    delivery: {
      pickup: true,
      localDelivery: true,
      islandwide: true,
      freeThreshold: 2000,
      zones: [
        { id: "z_cmb", name: "Colombo", fee: 350 },
        { id: "z_out", name: "Outside Colombo", fee: 600 },
      ],
    },
    cod: {
      enabled: true,
      minOrder: 0,
      maxOrder: 100000,
      fee: 0,
      requireConfirmation: false,
    },
    customDomain: "shoppingstation.lk",
    domainVerifiedAt: "",
    subdomain: SLUG,
    pages: [
      page("home", "Home", "home", [
        section("announcement", {
          message: "Free delivery on orders over Rs 2,000 · Premium quality imported products",
          link: "/products",
          dismissible: false,
        }),
        section("hero", {
          heading: "Exclusive kitchen, home & grocery",
          subheading:
            "No. 1 authentic imported product reseller in Sri Lanka. Same live stock as the counter.",
          ctaLabel: "Shop now",
          ctaHref: "products",
          secondaryCtaLabel: "View the catalogue",
          secondaryCtaHref: "products",
          alignment: "left",
          height: "tall",
          overlay: 42,
          image: hero,
        }),
        section("categories", { title: "Shop by category" }),
        section("featured_collection", {
          title: "Featured products",
          productCount: 12,
          collection: "featured",
        }),
        section("promo_banner", {
          heading: "Free delivery on orders over Rs 2,000",
          ctaLabel: "Browse the store",
          ctaHref: "products",
          image: promo,
        }),
        section("product_grid", {
          title: "New arrivals",
          productCount: 16,
          collection: "all",
        }),
        section("trust", {
          items: [
            { title: "Imported & authentic", body: "Kitchen, home and grocery from trusted brands" },
            { title: "Free delivery Rs 2,000+", body: "Islandwide courier on qualifying orders" },
            { title: "Cash on delivery", body: "Pay when you receive" },
            { title: "Live POS stock", body: "What you see online is what the shop has" },
          ],
        }),
        section("image_text", {
          heading: "Shopping Station",
          description:
            "Exclusive kitchen items, home products in Sri Lanka. We resell authentic imported brands — the same catalogue you buy in-store, now on MyPoz.",
          ctaLabel: "Shop the catalogue",
          ctaHref: "products",
          image: aboutImg,
          imagePosition: "right",
        }),
      ]),
      page("products", "Products", "products"),
      page("collections", "Collections", "collections"),
      page("product", "Product", "product"),
      page("about", "About", "about", [
        section("rich_text", {
          heading: "About Shopping Station",
          content:
            "Exclusive kitchen items, home products in Sri Lanka. No. 1 authentic imported product reseller. Every price and quantity is the same ledger as our POS.",
        }),
      ]),
      page("contact", "Contact", "contact", [
        section("rich_text", {
          heading: "Contact us",
          content: `Email ${EMAIL}. Online orders land on the same Shopping Station counter.`,
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
          content: "Contact us within 7 days for unused items in original condition.",
        }),
      ]),
      page("privacy", "Privacy", "privacy", [
        section("rich_text", {
          heading: "Privacy",
          content: "We use your details only to fulfil orders and support your account.",
        }),
      ]),
      page("terms", "Terms", "terms", [
        section("rich_text", {
          heading: "Terms",
          content: "Orders are confirmed when stock is reserved in MyPoz. Prices are revalidated at checkout.",
        }),
      ]),
      page("faq", "FAQ", "faq", [
        section("rich_text", {
          heading: "FAQ",
          content:
            "Cash on delivery? Yes. Pickup? Yes. Is stock live? Yes — the same inventory as the POS.",
        }),
      ]),
    ],
  };
}

function parseCatalog() {
  const wb = XLSX.readFile(CSV);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
  const usedSku = new Set();
  const out = [];

  for (const row of rows) {
    const type = String(cell(row, "Type")).toLowerCase();
    if (type !== "simple" && type !== "variation") continue;
    const published = String(cell(row, "Published"));
    if (published === "0" || published === "-1") continue;

    const name = cell(row, "Name");
    if (!name) continue;
    const regular = num(cell(row, "Regular price"));
    const sale = num(cell(row, "Sale price"));
    const price = sale > 0 ? sale : regular;
    if (price <= 0) continue;

    let sku = cell(row, "SKU") || `wc-${cell(row, "ID")}`;
    sku = sku.slice(0, 64);
    if (usedSku.has(sku.toLowerCase())) sku = `${sku}-${cell(row, "ID")}`.slice(0, 64);
    usedSku.add(sku.toLowerCase());

    const slug = `ss-${sku.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`.replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || `ss-${cell(row, "ID")}`;

    const stockRaw = cell(row, "Stock");
    const inStock = String(cell(row, "In stock?")).trim();
    let qty = num(stockRaw);
    if (qty <= 0 && (inStock === "1" || inStock.toLowerCase() === "yes")) qty = 20;

    const featuredFlag = String(cell(row, "Is featured?")).trim();
    const featured =
      featuredFlag === "1" || FEATURED_HINTS.some((h) => name.toLowerCase().includes(h));

    const images = imageList(cell(row, "Images"));
    const tags = cell(row, "Tags")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 12);
    const gtin = cell(row, "GTIN, UPC, EAN, or ISBN", "GTIN");
    const barcode = gtin || sku;

    out.push({
      sku,
      slug,
      name: name.slice(0, 200),
      brand: cell(row, "Brands", "Brand").slice(0, 80) || null,
      category: categoryOf(cell(row, "Categories")),
      description: stripHtml(cell(row, "Description") || cell(row, "Short description")),
      sale_price: price,
      compare_at_price: sale > 0 && regular > sale ? regular : null,
      featured,
      image_src: images[0] || "",
      quantity: qty,
      barcode: barcode.slice(0, 64),
      tags,
      weight_grams: Math.round(num(cell(row, "Weight (oz)")) * 28.3495) || null,
    });
  }
  return out;
}

async function connectSql() {
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) {
    throw new Error("Missing SUPABASE_DB_PASSWORD");
  }
  const hosts = [
    { host: `db.${PROJECT_REF}.supabase.co`, port: 5432, user: "postgres" },
    {
      host: "aws-1-ap-southeast-1.pooler.supabase.com",
      port: 6543,
      user: `postgres.${PROJECT_REF}`,
    },
  ];
  let lastErr = "";
  for (const h of hosts) {
    const sql = postgres({
      host: h.host,
      port: h.port,
      database: "postgres",
      username: h.user,
      password,
      ssl: "require",
      max: 1,
      connect_timeout: 12,
    });
    try {
      await sql`select 1`;
      return sql;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      await sql.end({ timeout: 2 }).catch(() => undefined);
    }
  }
  throw new Error(lastErr || "Could not connect to Postgres");
}

async function ensureOwner(sql, password) {
  const existing = await sql`
    select id from auth.users where lower(email) = ${EMAIL} limit 1
  `;
  let userId;
  if (existing[0]) {
    userId = existing[0].id;
    await sql`
      update auth.users
         set encrypted_password = extensions.crypt(${password}, extensions.gen_salt('bf')),
             email_confirmed_at = coalesce(email_confirmed_at, now()),
             raw_app_meta_data = (
               coalesce(raw_app_meta_data, '{}'::jsonb) - 'role'
             ) || '{"provider":"email","providers":["email"]}'::jsonb,
             updated_at = now()
       where id = ${userId}
    `;
  } else {
    const created = await sql`
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change,
        raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user, is_anonymous
      ) values (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated', 'authenticated', ${EMAIL},
        extensions.crypt(${password}, extensions.gen_salt('bf')),
        now(), now(), now(),
        '', '', '', '',
        '{"provider":"email","providers":["email"]}'::jsonb,
        ${sql.json({ full_name: ORG_NAME })},
        false, false, false
      )
      returning id
    `;
    userId = created[0].id;
  }
  await sql`
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(),
      ${userId},
      ${sql.json({ sub: String(userId), email: EMAIL })},
      'email',
      ${String(userId)},
      now(), now(), now()
    )
    on conflict (provider, provider_id) do nothing
  `;
  return userId;
}

async function main() {
  console.log("→ Shopping Station provision");
  await mkdir(join(root, "data"), { recursive: true });
  await mkdir(IMAGE_DIR, { recursive: true });

  const password = await ensurePassword();
  const catalog = parseCatalog();
  console.log(`  CSV products to import: ${catalog.length}`);

  const sql = await connectSql();
  try {
    console.log("→ Organization");
    const orgRows = await sql`
      insert into organizations (name, slug)
      values (${ORG_NAME}, ${SLUG})
      on conflict (slug) do update set name = excluded.name
      returning id
    `;
    const orgId = orgRows[0].id;

    let branchRows = await sql`
      select id from branches where org_id = ${orgId} order by created_at limit 1
    `;
    if (!branchRows[0]) {
      branchRows = await sql`
        insert into branches (org_id, name, code)
        values (${orgId}, 'Main Branch', 'MAIN')
        returning id
      `;
      await sql`
        insert into registers (branch_id, name) values (${branchRows[0].id}, 'Register 1')
      `;
    }
    const branchId = branchRows[0].id;

    console.log("→ Owner login (not HQ admin)");
    const userId = await ensureOwner(sql, password);
    await sql`
      insert into profiles (id, org_id, full_name, role)
      values (${userId}, ${orgId}, ${ORG_NAME}, 'owner')
      on conflict (id) do update
        set org_id = excluded.org_id,
            full_name = excluded.full_name,
            role = 'owner'
    `;
    await sql`
      insert into branch_members (branch_id, user_id)
      values (${branchId}, ${userId})
      on conflict (branch_id, user_id) do nothing
    `;

    await writeFile(
      CRED_FILE,
      JSON.stringify(
        {
          email: EMAIL,
          password,
          orgId,
          slug: SLUG,
          storeUrl: `https://mypoz-and-store.vercel.app/store/${SLUG}`,
          loginUrl: "https://mypoz-and-store.vercel.app/login",
        },
        null,
        2,
      ),
    );

    console.log("→ Site banners + logo");
    const assets = await scrapeSiteAssets();
    const chrome = [
      assets.logo ? { kind: "logo", url: assets.logo } : null,
      ...assets.banners.map((url, i) => ({ kind: `banner-${i + 1}`, url })),
    ].filter(Boolean);
    let logoUrl = assets.logo || "";
    const bannerUrls = [...assets.banners];
    for (const item of chrome) {
      const got = await downloadBytes(item.url);
      if (!got) continue;
      const name = `${item.kind}.${extOf(got.type)}`;
      await writeFile(join(IMAGE_DIR, name), got.buf);
    }
    console.log(`  banners: ${bannerUrls.length}  logo: ${logoUrl ? "yes" : "no"}`);

    console.log("→ Categories");
    const catNames = [...new Set(catalog.map((p) => p.category))];
    const catId = new Map();
    for (const name of catNames) {
      const rows = await sql`
        insert into categories (org_id, name)
        values (${orgId}, ${name})
        on conflict (org_id, name) do update set name = excluded.name
        returning id
      `;
      catId.set(name, rows[0].id);
    }

    console.log("→ Products");
    const idBySku = new Map();
    const CHUNK = 60;
    for (let i = 0; i < catalog.length; i += CHUNK) {
      const batch = catalog.slice(i, i + CHUNK);
      await sql.begin(async (tx) => {
        for (const p of batch) {
          const rows = await tx`
            insert into products (
              org_id, sku, slug, name, brand, category_id,
              cost_price, sale_price, compare_at_price, wholesale_price,
              max_discount, single_discount, reorder_level, warranty_months,
              is_active, description, online_visible, online_status, online_price,
              featured, tags, image_url, weight_grams
            ) values (
              ${orgId}, ${p.sku}, ${p.slug}, ${p.name}, ${p.brand}, ${catId.get(p.category) ?? null},
              0, ${p.sale_price}, ${p.compare_at_price}, null,
              0, 0, 5, 0,
              true, ${p.description || null}, true, 'published', ${p.sale_price},
              ${p.featured}, ${p.tags}, ${p.image_src || null}, ${p.weight_grams}
            )
            on conflict (org_id, sku) do update set
              name = excluded.name,
              brand = excluded.brand,
              category_id = excluded.category_id,
              sale_price = excluded.sale_price,
              compare_at_price = excluded.compare_at_price,
              description = excluded.description,
              online_visible = true,
              online_status = 'published',
              online_price = excluded.online_price,
              featured = excluded.featured,
              tags = excluded.tags,
              image_url = excluded.image_url,
              weight_grams = excluded.weight_grams,
              is_active = true,
              updated_at = now()
            returning id, sku
          `;
          idBySku.set(rows[0].sku, rows[0].id);
          if (p.barcode) {
            await tx`
              insert into product_barcodes (org_id, product_id, barcode)
              values (${orgId}, ${rows[0].id}, ${p.barcode})
              on conflict (org_id, barcode) do nothing
            `;
          }
          await tx`
            insert into branch_stock (branch_id, product_id, quantity)
            values (${branchId}, ${rows[0].id}, ${p.quantity})
            on conflict (branch_id, product_id) do update set
              quantity = excluded.quantity,
              updated_at = now()
          `;
        }
      });
      process.stdout.write(`\r  ${Math.min(i + CHUNK, catalog.length)}/${catalog.length} products`);
    }
    console.log("");

    console.log("→ Download product images");
    let downloaded = 0;
    let failed = 0;
    const withImg = catalog.filter((p) => p.image_src);
    await pool(withImg, 8, async (p) => {
      const got = await downloadBytes(p.image_src);
      if (!got) {
        failed += 1;
        return;
      }
      const name = `${slugify(p.sku, "sku")}.${extOf(got.type)}`;
      try {
        await writeFile(join(IMAGE_DIR, name), got.buf);
        downloaded += 1;
      } catch {
        failed += 1;
      }
      if ((downloaded + failed) % 50 === 0) {
        process.stdout.write(`\r  images ${downloaded} ok / ${failed} skip / ${withImg.length}`);
      }
    });
    console.log(`\n  images ${downloaded} saved locally, ${failed} skipped`);

    const store = buildStoreConfig({ logoUrl, bannerUrls });
    const now = new Date().toISOString();
    const commerce = {
      draft: store,
      published: store,
      publishedAt: now,
      updatedAt: now,
    };
    const website = {
      enabled: true,
      theme: "classic",
      announcementBar: store.announcement,
      banners: bannerUrls.slice(0, 8).map((imageUrl, i) => ({
        id: `banner-${i + 1}`,
        imageUrl,
        alt: `${ORG_NAME} banner ${i + 1}`,
        href: "",
      })),
      heroHeadline: "Exclusive Kitchen items, Home products in Sri Lanka",
      heroSubline: "No. 1 authentic imported product reseller",
      about: store.description,
      seoTitle: store.seoTitle,
      seoDescription: store.seoDescription,
      ogImageUrl: bannerUrls[0] || logoUrl || "",
      socialFacebook: SITE,
      socialInstagram: "",
      socialTwitter: "",
      socialTiktok: "",
      whatsappNumber: "",
      paymentModes: ["cash", "card", "bank_transfer"],
      fulfilmentModes: ["pickup", "courier"],
      bankTransferInstructions:
        "Transfer to our bank account and enter the reference on checkout. Staff will confirm payment.",
      pickupInstructions:
        "Collect from Shopping Station during opening hours. Bring your order number.",
    };
    const settings = {
      businessName: ORG_NAME,
      address: "Sri Lanka",
      phone: "",
      email: EMAIL,
      currency: "LKR",
      timezone: "Asia/Colombo",
      receiptHeader: ORG_NAME,
      receiptFooter: "Thank you for shopping at Shopping Station",
      paperWidth: "80mm",
      showQr: "No",
      taxPercent: 0,
      taxInclusive: "Yes",
      trainingMode: "No",
      storeEnabled: "Yes",
      storeSlug: SLUG,
      storeSlogan: "Exclusive Kitchen items, Home products in Sri Lanka",
      storeBanner: bannerUrls[0] || "",
    };
    const tenant = {
      brand: {
        businessName: ORG_NAME,
        logoUrl: logoUrl || "",
        accentColor: "#c81e1e",
      },
      license: { plan: "business", expiry: "2027-12-31", extras: [] },
    };

    console.log("→ Publish store documents + storefront");
    const docs = [
      ["commerce", commerce],
      ["website", website],
      ["settings", settings],
      ["tenant", tenant],
    ];
    for (const [key, data] of docs) {
      await sql`
        insert into app_documents (org_id, key, data)
        values (${orgId}, ${key}, ${sql.json(data)})
        on conflict (org_id, key) do update set data = excluded.data
      `;
    }

    try {
      await sql`
        insert into storefronts (
          org_id, branch_id, slug, domain, enabled,
          hero_headline, hero_subline, hero_image_url, about
        ) values (
          ${orgId}, ${branchId}, ${SLUG}, 'shoppingstation.lk', true,
          ${website.heroHeadline}, ${website.heroSubline}, ${bannerUrls[0] || null}, ${website.about}
        )
        on conflict (org_id) do update set
          branch_id = excluded.branch_id,
          slug = excluded.slug,
          domain = excluded.domain,
          enabled = true,
          hero_headline = excluded.hero_headline,
          hero_subline = excluded.hero_subline,
          hero_image_url = excluded.hero_image_url,
          about = excluded.about
      `;
    } catch (e) {
      await sql`
        insert into storefronts (
          org_id, branch_id, slug, domain, enabled,
          hero_headline, hero_subline, hero_image_url, about
        ) values (
          ${orgId}, ${branchId}, ${SLUG}, null, true,
          ${website.heroHeadline}, ${website.heroSubline}, ${bannerUrls[0] || null}, ${website.about}
        )
        on conflict (org_id) do update set
          branch_id = excluded.branch_id,
          slug = excluded.slug,
          enabled = true,
          hero_headline = excluded.hero_headline,
          hero_subline = excluded.hero_subline,
          hero_image_url = excluded.hero_image_url,
          about = excluded.about
      `;
      console.warn("  custom domain left unset:", e instanceof Error ? e.message.slice(0, 120) : e);
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          email: EMAIL,
          orgId,
          slug: SLUG,
          products: catalog.length,
          imagesDownloaded: downloaded,
          imagesFailed: failed,
          banners: bannerUrls.length,
          store: `https://mypoz-and-store.vercel.app/store/${SLUG}`,
          credentialsFile: "grabber-pos/data/shopping-station-owner.json",
        },
        null,
        2,
      ),
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error("\nProvision failed:", e.message || e);
  process.exit(1);
});

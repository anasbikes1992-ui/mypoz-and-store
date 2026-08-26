/**
 * Seed storefront CMS docs for an HQ-provisioned org (website + commerce + settings).
 *   node scripts/seed-storefront-cms.mjs [orgId] [slug] [name]
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  storeConfigSchema,
  commerceDocumentSchema,
} from "../src/lib/commerce/schema.ts";
import { DEFAULT_WEBSITE, websiteSchema } from "../src/lib/website.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

const orgId = process.argv[2] || "0aba445f-94e6-4a64-aea9-883475f90d9d";
const slug = process.argv[3] || "pilot-02";
const name = process.argv[4] || "Pilot 02";

const store = storeConfigSchema.parse({
  name,
  slug,
  status: "published",
  delivery: {
    pickup: true,
    localDelivery: true,
    islandwide: true,
    freeThreshold: 10000,
    zones: [{ id: "colombo", name: "Colombo", fee: 100 }],
  },
  cod: {
    enabled: true,
    minOrder: 0,
    maxOrder: 100000,
    fee: 0,
    requireConfirmation: false,
  },
});
const commerce = commerceDocumentSchema.parse({
  draft: store,
  published: store,
  publishedAt: new Date().toISOString(),
});
const website = websiteSchema.parse({
  ...DEFAULT_WEBSITE,
  enabled: true,
  heroHeadline: `${name} Store`,
  heroSubline: "Live from HQ Pilot",
  paymentModes: ["cash", "card", "bank_transfer"],
  fulfilmentModes: ["pickup", "courier"],
});
const settings = {
  businessName: name,
  storeEnabled: "Yes",
  storeSlug: slug,
  currency: "LKR",
};

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://veavfkjgtkbnggukzjds.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { persistSession: false } },
);
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

for (const [key, data] of [
  ["website", website],
  ["commerce", commerce],
  ["settings", settings],
]) {
  const { error } = await db
    .from("app_documents")
    .upsert({ org_id: orgId, key, data }, { onConflict: "org_id,key" });
  if (error) {
    console.error(key, error.message);
    process.exit(1);
  }
  console.log("ok", key);
}
console.log(JSON.stringify({ ok: true, orgId, slug }));

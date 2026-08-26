/**
 * Rebuild Anaz Store from trusted on-disk catalog SQL.
 *
 * Org UUID is locked to match data/anaz-jsonb-batches + anaz-storefront-publish.sql:
 *   304adc33-7279-4547-a73d-a2240333e814
 *
 * Usage:
 *   node --env-file=.env.local scripts/rebuild-anaz-store.mjs
 *   node --env-file=.env.local scripts/rebuild-anaz-store.mjs --force
 *
 * Env:
 *   SUPABASE_DB_PASSWORD (required)
 *   SUPABASE_PROJECT_REF (default veavfkjgtkbnggukzjds)
 *   ANAZ_OWNER_EMAIL (default anazazeez1992@gmail.com)
 *   ANAZ_OWNER_PASSWORD (optional — set/reset Auth password when provided)
 *   ANAZ_OWNER_NAME (default Anaz Store Owner)
 *
 * Never restores mypoz-full-2026-08-24.json.
 * Does not delete Gate 3 security orgs (tenant-a-sec / tenant-b-sec / hq-sec).
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const force = process.argv.includes("--force");

/** Load simple KEY=VALUE lines from .env.local when --env-file is unavailable (e.g. odd BOM). */
function loadLocalEnv() {
  const path = join(root, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i <= 0) continue;
    const key = trimmed.slice(0, i).trim();
    let val = trimmed.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadLocalEnv();

const ANAZ_ORG_ID = "304adc33-7279-4547-a73d-a2240333e814";
const ANAZ_SLUG = "anaz-store";
const ANAZ_NAME = "Anaz Store";
const FORBIDDEN = "mypoz-full-2026-08-24.json";

const dbPassword = process.env.SUPABASE_DB_PASSWORD;
const ref = process.env.SUPABASE_PROJECT_REF || "veavfkjgtkbnggukzjds";
const ownerEmail = (
  process.env.ANAZ_OWNER_EMAIL || "anazazeez1992@gmail.com"
)
  .trim()
  .toLowerCase();
const ownerPassword = process.env.ANAZ_OWNER_PASSWORD || "";
const ownerName = process.env.ANAZ_OWNER_NAME || "Anaz Store Owner";

if (!dbPassword) {
  console.error("Missing SUPABASE_DB_PASSWORD");
  process.exit(1);
}

if (process.argv.some((a) => a.includes(FORBIDDEN))) {
  console.error(`Refusing forbidden backup path: ${FORBIDDEN}`);
  process.exit(1);
}

const batchDir = join(root, "data", "anaz-jsonb-batches");
const publishSql = join(root, "data", "anaz-storefront-publish.sql");
if (!existsSync(batchDir) || !existsSync(publishSql)) {
  console.error("Missing trusted catalog SQL under data/anaz-jsonb-batches or anaz-storefront-publish.sql");
  process.exit(1);
}

const chunkFiles = [
  "00-setup.sql",
  ...readdirSync(batchDir)
    .filter((f) => /^\d+-chunk\.sql$/.test(f))
    .sort(),
].map((f) => join(batchDir, f));

const sql = postgres({
  host: `db.${ref}.supabase.co`,
  port: 5432,
  database: "postgres",
  username: "postgres",
  password: dbPassword,
  ssl: "require",
  max: 1,
  // Large jsonb DO blocks
  connection: { statement_timeout: 0 },
});

function log(step, detail = "") {
  console.log(`${step}${detail ? ` — ${detail}` : ""}`);
}

async function ensureOrg() {
  const existing = await sql`
    select id, slug, name from organizations where id = ${ANAZ_ORG_ID}::uuid
  `;
  if (existing.length) {
    await sql`
      update organizations
         set name = ${ANAZ_NAME},
             slug = ${ANAZ_SLUG}
       where id = ${ANAZ_ORG_ID}::uuid
    `;
    log("org", "updated existing Anaz org");
    return;
  }

  const slugClash = await sql`
    select id, slug from organizations where slug = ${ANAZ_SLUG} limit 1
  `;
  if (slugClash.length && String(slugClash[0].id) !== ANAZ_ORG_ID) {
    console.error(
      `Slug ${ANAZ_SLUG} owned by other org ${slugClash[0].id}. Abort.`,
    );
    process.exit(1);
  }

  await sql`
    insert into organizations (id, name, slug)
    values (${ANAZ_ORG_ID}::uuid, ${ANAZ_NAME}, ${ANAZ_SLUG})
  `;
  log("org", "created Anaz org with locked UUID");
}

async function ensureBranchAndRegister() {
  let branch = await sql`
    select id from branches where org_id = ${ANAZ_ORG_ID}::uuid
     order by created_at limit 1
  `;
  if (!branch.length) {
    branch = await sql`
      insert into branches (org_id, name, code)
      values (${ANAZ_ORG_ID}::uuid, 'Main Branch', 'MAIN')
      returning id
    `;
    log("branch", "created Main Branch");
  }
  const branchId = branch[0].id;
  const reg = await sql`
    select id from registers where branch_id = ${branchId}::uuid limit 1
  `;
  if (!reg.length) {
    await sql`
      insert into registers (branch_id, name)
      values (${branchId}::uuid, 'Register 1')
    `;
    log("register", "created Register 1");
  }
  return branchId;
}

async function ensureOwner(branchId) {
  const users = await sql`
    select id from auth.users where lower(email) = ${ownerEmail} limit 1
  `;
  let userId = users[0]?.id;

  if (!userId) {
    if (!ownerPassword) {
      console.error(
        `Owner ${ownerEmail} missing — set ANAZ_OWNER_PASSWORD to create Auth user`,
      );
      process.exit(1);
    }
    const created = await sql`
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, email_change,
        email_change_token_new, recovery_token
      ) values (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        ${ownerEmail},
        crypt(${ownerPassword}, gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb,
        now(), now(), '', '', '', ''
      )
      returning id
    `;
    userId = created[0].id;
    log("auth", "created owner user");
  } else if (ownerPassword) {
    await sql`
      update auth.users
         set encrypted_password = crypt(${ownerPassword}, gen_salt('bf')),
             email_confirmed_at = coalesce(email_confirmed_at, now()),
             updated_at = now()
       where id = ${userId}::uuid
    `;
    log("auth", "updated owner password");
  }

  const ident = await sql`
    select id from auth.identities
     where user_id = ${userId}::uuid and provider = 'email' limit 1
  `;
  if (!ident.length) {
    const identityData = {
      sub: String(userId),
      email: ownerEmail,
      email_verified: true,
    };
    await sql`
      insert into auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at,
        created_at, updated_at
      ) values (
        gen_random_uuid(),
        ${userId}::uuid,
        ${sql.json(identityData)},
        'email',
        ${String(userId)},
        now(), now(), now()
      )
    `;
    log("auth", "created email identity");
  }

  const profile = await sql`
    select org_id, role from profiles where id = ${userId}::uuid limit 1
  `;
  if (!profile.length) {
    await sql`
      insert into profiles (id, org_id, full_name, role)
      values (${userId}::uuid, ${ANAZ_ORG_ID}::uuid, ${ownerName}, 'owner')
    `;
    log("profile", "created owner profile on Anaz");
  } else if (String(profile[0].org_id) !== ANAZ_ORG_ID) {
    // Safe: Gate 3 fixtures use @mypoz.test — remapping Anaz Gmail off tenant-a-sec is intentional.
    await sql`
      update profiles
         set org_id = ${ANAZ_ORG_ID}::uuid,
             role = 'owner',
             full_name = ${ownerName},
             is_active = true
       where id = ${userId}::uuid
    `;
    log("profile", `remapped owner from ${profile[0].org_id} → Anaz`);
  } else {
    await sql`
      update profiles
         set role = 'owner', full_name = ${ownerName}, is_active = true
       where id = ${userId}::uuid
    `;
    log("profile", "owner already on Anaz");
  }

  await sql`
    insert into branch_members (branch_id, user_id)
    values (${branchId}::uuid, ${userId}::uuid)
    on conflict (branch_id, user_id) do nothing
  `;
  return userId;
}

async function ensureStorefront(branchId) {
  const row = await sql`
    select org_id from storefronts where org_id = ${ANAZ_ORG_ID}::uuid limit 1
  `;
  if (!row.length) {
    await sql`
      insert into storefronts (org_id, branch_id, slug, enabled, status, published_at)
      values (
        ${ANAZ_ORG_ID}::uuid,
        ${branchId}::uuid,
        ${ANAZ_SLUG},
        true,
        'published',
        now()
      )
    `;
    log("storefront", "created published row");
  } else {
    await sql`
      update storefronts
         set slug = ${ANAZ_SLUG},
             branch_id = coalesce(branch_id, ${branchId}::uuid),
             enabled = true,
             status = 'published',
             published_at = coalesce(published_at, now()),
             updated_at = now()
       where org_id = ${ANAZ_ORG_ID}::uuid
    `;
    log("storefront", "ensured published");
  }
}

async function guardExistingProducts() {
  const [{ count }] = await sql`
    select count(*)::int as count
      from products
     where org_id = ${ANAZ_ORG_ID}::uuid
  `;
  if (count > 0 && !force) {
    console.error(
      `Anaz already has ${count} products. Re-run with --force to upsert chunks.`,
    );
    process.exit(1);
  }
  if (count > 0 && force) {
    log("guard", `${count} existing products — continuing with --force upsert`);
  }
}

async function applyFile(path) {
  const body = readFileSync(path, "utf8");
  if (body.includes(FORBIDDEN)) {
    throw new Error(`Refusing SQL that references ${FORBIDDEN}: ${path}`);
  }
  const name = path.split(/[/\\]/).pop();
  const t0 = Date.now();
  await sql.unsafe(body);
  log("sql", `${name} (${Date.now() - t0}ms)`);
}

async function summarize() {
  const [row] = await sql`
    select
      (select count(*)::int from products where org_id = ${ANAZ_ORG_ID}::uuid and is_active) as products,
      (select count(*)::int from products where org_id = ${ANAZ_ORG_ID}::uuid and online_visible and online_status = 'published') as online,
      (select status from storefronts where org_id = ${ANAZ_ORG_ID}::uuid) as store_status,
      (select slug from storefronts where org_id = ${ANAZ_ORG_ID}::uuid) as store_slug,
      (select slug from organizations where id = ${ANAZ_ORG_ID}::uuid) as org_slug
  `;
  console.log(JSON.stringify({ anaz: row }, null, 2));
  return row;
}

try {
  log("start", `project=${ref} org=${ANAZ_ORG_ID} owner=${ownerEmail}`);
  await ensureOrg();
  const branchId = await ensureBranchAndRegister();
  await ensureOwner(branchId);
  await ensureStorefront(branchId);
  await guardExistingProducts();

  for (const file of chunkFiles) {
    if (!existsSync(file)) {
      console.error(`Missing chunk: ${file}`);
      process.exit(1);
    }
    await applyFile(file);
  }
  await applyFile(publishSql);

  const summary = await summarize();
  if ((summary.products ?? 0) < 1400) {
    console.error(`Expected ~1518 products, got ${summary.products}`);
    process.exit(1);
  }
  if (summary.store_status !== "published" || summary.store_slug !== ANAZ_SLUG) {
    console.error("Storefront not published as anaz-store");
    process.exit(1);
  }
  log("done", "Anaz rebuild PASS");
} catch (err) {
  console.error("FAIL", err?.message || err);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}

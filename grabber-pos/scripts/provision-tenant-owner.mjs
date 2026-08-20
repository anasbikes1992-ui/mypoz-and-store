/**
 * Provision a tenant owner (NOT GMS HQ admin).
 * Creates org + branch + Auth user + profiles.role=owner.
 *
 * Usage:
 *   node --env-file=.env.local scripts/provision-tenant-owner.mjs
 *
 * Env:
 *   UPSERT_ADMIN_EMAIL, UPSERT_ADMIN_PASSWORD
 *   UPSERT_ADMIN_NAME (optional)
 *   UPSERT_ORG_NAME, UPSERT_ORG_SLUG (optional)
 *   SUPABASE_DB_PASSWORD, SUPABASE_PROJECT_REF
 * Never logs the password.
 */
import postgres from "postgres";

const email = (process.env.UPSERT_ADMIN_EMAIL ?? "").trim().toLowerCase();
const password = process.env.UPSERT_ADMIN_PASSWORD ?? "";
const fullName = process.env.UPSERT_ADMIN_NAME ?? "Store Owner";
const orgName = process.env.UPSERT_ORG_NAME ?? "Client Store";
const rawSlug =
  process.env.UPSERT_ORG_SLUG ||
  orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
const orgSlug = (rawSlug || "client-store").trim();
const dbPassword = process.env.SUPABASE_DB_PASSWORD;
const ref = process.env.SUPABASE_PROJECT_REF || "veavfkjgtkbnggukzjds";

if (!email || !password) {
  console.error("Set UPSERT_ADMIN_EMAIL and UPSERT_ADMIN_PASSWORD");
  process.exit(1);
}
if (!dbPassword) {
  console.error("Missing SUPABASE_DB_PASSWORD");
  process.exit(1);
}

const sql = postgres({
  host: `db.${ref}.supabase.co`,
  port: 5432,
  database: "postgres",
  username: "postgres",
  password: dbPassword,
  ssl: "require",
  max: 1,
});

const existing = await sql`
  select id from auth.users where lower(email) = ${email} limit 1
`;

let userId = existing[0]?.id;
if (userId) {
  await sql`
    update auth.users
       set encrypted_password = crypt(${password}, gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           raw_app_meta_data = coalesce(raw_app_meta_data, '{"provider":"email","providers":["email"]}'::jsonb)
             - 'role',
           updated_at = now()
     where id = ${userId}
  `;
  console.log("updated_auth_user");
} else {
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
      ${email},
      crypt(${password}, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(), now(), '', '', '', ''
    )
    returning id
  `;
  userId = created[0].id;
  console.log("created_auth_user");
}

const ident = await sql`
  select id from auth.identities where user_id = ${userId}::uuid and provider = 'email' limit 1
`;
if (!ident.length) {
  const identityData = {
    sub: String(userId),
    email,
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
  console.log("created_identity");
}

let orgId;
const existingProfile = await sql`
  select org_id from profiles where id = ${userId}::uuid limit 1
`;
if (existingProfile[0]?.org_id) {
  orgId = existingProfile[0].org_id;
  await sql`
    update profiles
       set role = 'owner', full_name = ${fullName}
     where id = ${userId}::uuid
  `;
  console.log("updated_profile");
} else {
  const slugHit = await sql`
    select id from organizations where slug = ${orgSlug} limit 1
  `;
  if (slugHit[0]?.id) {
    orgId = slugHit[0].id;
  } else {
    const org = await sql`
      insert into organizations (name, slug)
      values (${orgName}, ${orgSlug})
      returning id
    `;
    orgId = org[0].id;
    await sql`
      insert into branches (org_id, name, code)
      values (${orgId}::uuid, 'Main Branch', 'MAIN')
    `;
    const branch = await sql`
      select id from branches where org_id = ${orgId}::uuid limit 1
    `;
    if (branch[0]?.id) {
      await sql`
        insert into registers (branch_id, name)
        values (${branch[0].id}::uuid, 'Register 1')
      `;
    }
    console.log("created_org");
  }

  await sql`
    insert into profiles (id, org_id, full_name, role)
    values (${userId}::uuid, ${orgId}::uuid, ${fullName}, 'owner')
  `;
  const branch = await sql`
    select id from branches where org_id = ${orgId}::uuid limit 1
  `;
  if (branch[0]?.id) {
    await sql`
      insert into branch_members (branch_id, user_id)
      values (${branch[0].id}::uuid, ${userId}::uuid)
      on conflict (branch_id, user_id) do nothing
    `;
  }
  console.log("created_profile");
}

// Ensure HQ can see this org on reseller_licences via app_documents.tenant
const tenantDoc = await sql`
  select id from app_documents
   where org_id = ${orgId}::uuid and key = 'tenant'
   limit 1
`;
if (!tenantDoc.length) {
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 1);
  const licence = {
    brand: { businessName: orgName },
    license: {
      plan: "business",
      expiry: expiry.toISOString().slice(0, 10),
      extras: [],
      suspended: false,
    },
  };
  await sql`
    insert into app_documents (org_id, key, data)
    values (${orgId}::uuid, 'tenant', ${sql.json(licence)})
  `;
  console.log("created_tenant_licence");
}

const storefront = await sql`
  select org_id from storefronts where org_id = ${orgId}::uuid limit 1
`;
if (!storefront.length) {
  await sql`
    insert into storefronts (org_id, slug, enabled, status, published_at)
    values (${orgId}::uuid, ${orgSlug}, true, 'published', now())
  `;
  console.log("created_storefront");
}

const check = await sql`
  select
    email,
    email_confirmed_at is not null as confirmed,
    coalesce(raw_app_meta_data->>'role', '') as app_role
  from auth.users
  where id = ${userId}::uuid
`;

console.log(
  JSON.stringify({
    ok: true,
    email: check[0]?.email,
    confirmed: check[0]?.confirmed,
    app_role: check[0]?.app_role || null,
    profile_role: "owner",
    org_id: orgId,
    org_slug: orgSlug,
    login: "https://mypoz-and-store-ui.vercel.app/login",
    storefront: `/store/${orgSlug}`,
  }),
);

await sql.end({ timeout: 5 });

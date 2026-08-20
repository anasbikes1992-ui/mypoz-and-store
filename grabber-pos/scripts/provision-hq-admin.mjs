/**
 * Provision MyPoz HQ super-admin on Anaz Auth.
 * Usage:
 *   node --env-file=.env.local scripts/provision-hq-admin.mjs
 * Env: UPSERT_ADMIN_EMAIL, UPSERT_ADMIN_PASSWORD, SUPABASE_DB_PASSWORD
 * Never logs the password.
 */
import postgres from "postgres";

const email = (process.env.UPSERT_ADMIN_EMAIL ?? "").trim().toLowerCase();
const password = process.env.UPSERT_ADMIN_PASSWORD ?? "";
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
           raw_app_meta_data = jsonb_set(
             coalesce(raw_app_meta_data, '{"provider":"email","providers":["email"]}'::jsonb),
             '{role}',
             '"gms_admin"'
           ),
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
      '{"provider":"email","providers":["email"],"role":"gms_admin"}'::jsonb,
      '{}'::jsonb,
      now(), now(), '', '', '', ''
    )
    returning id
  `;
  userId = created[0].id;
  await sql`
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at,
      created_at, updated_at
    ) values (
      gen_random_uuid(),
      ${userId}::uuid,
      jsonb_build_object(
        'sub', ${String(userId)},
        'email', ${email},
        'email_verified', true
      ),
      'email',
      ${String(userId)},
      now(), now(), now()
    )
  `;
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

const orgs = await sql`select id from organizations order by created_at limit 1`;
let orgId = orgs[0]?.id;
if (!orgId) {
  const org = await sql`
    insert into organizations (name, slug)
    values ('MyPoz HQ workspace', 'mypoz-hq')
    returning id
  `;
  orgId = org[0].id;
  await sql`
    insert into branches (org_id, name, code)
    values (${orgId}, 'Main Branch', 'MAIN')
  `;
  console.log("created_org");
}

const profile = await sql`select id from profiles where id = ${userId}::uuid`;
if (profile.length) {
  await sql`
    update profiles set role = 'owner', full_name = 'HQ Super Admin' where id = ${userId}::uuid
  `;
  console.log("updated_profile");
} else {
  await sql`
    insert into profiles (id, org_id, full_name, role)
    values (${userId}::uuid, ${orgId}::uuid, 'HQ Super Admin', 'owner')
  `;
  const branch = await sql`
    select id from branches where org_id = ${orgId} limit 1
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

const check = await sql`
  select
    email,
    email_confirmed_at is not null as confirmed,
    raw_app_meta_data->>'role' as app_role
  from auth.users
  where id = ${userId}::uuid
`;
console.log(
  JSON.stringify({
    ok: true,
    email: check[0]?.email,
    confirmed: check[0]?.confirmed,
    app_role: check[0]?.app_role,
    profile_role: "owner",
    login: "https://mypoz-and-store-ui.vercel.app/login then /hq",
  }),
);

await sql.end({ timeout: 5 });

/**
 * Set the same Auth password for every listed email (or all users if none given).
 * Uses direct Postgres crypt — never logs the password.
 *
 *   node scripts/set-all-passwords.mjs
 *   node scripts/set-all-passwords.mjs anazazeez1992@gmail.com
 *
 * Env: SUPABASE_DB_PASSWORD, optional RESET_PASSWORD (default Aa123456)
 */
import postgres from "postgres";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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

const password = (process.env.RESET_PASSWORD || "Aa123456").trim();
const ref = process.env.SUPABASE_PROJECT_REF || "veavfkjgtkbnggukzjds";
const dbPassword = process.env.SUPABASE_DB_PASSWORD;
const emails = process.argv
  .slice(2)
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

if (!dbPassword) {
  console.error("Missing SUPABASE_DB_PASSWORD");
  process.exit(1);
}
if (password.length < 8) {
  console.error("Password must be at least 8 characters");
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

const users =
  emails.length > 0
    ? await sql`
        select id, email from auth.users
         where lower(email) = any(${emails})
         order by email
      `
    : await sql`
        select id, email from auth.users
         where email is not null
         order by email
      `;

console.log(`Updating ${users.length} user(s)…`);

for (const u of users) {
  await sql`
    update auth.users
       set encrypted_password = crypt(${password}, gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           updated_at = now()
     where id = ${u.id}::uuid
  `;
  console.log(`✓ ${u.email}`);
}

// Verify one login via Auth API when anon key present
const anon =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";
const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  `https://${ref}.supabase.co`;

if (anon && users.length) {
  const sample = users[0];
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email: sample.email, password }),
  });
  console.log(
    res.ok
      ? `sign-in verify OK (${sample.email})`
      : `sign-in verify FAIL (${sample.email}) HTTP ${res.status}`,
  );
}

await sql.end({ timeout: 5 });
console.log(JSON.stringify({ ok: true, updated: users.length }));

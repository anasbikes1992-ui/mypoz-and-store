#!/usr/bin/env node
/**
 * Reset Supabase Auth password(s) by email — does not change roles or profiles.
 *
 * Usage:
 *   node --env-file=.env.local scripts/reset-user-password.mjs anaz@shop.com
 *   RESET_PASSWORD='Aa123456' node --env-file=.env.local scripts/reset-user-password.mjs a@x.com b@y.com
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const emails = process.argv
  .slice(2)
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
const password = (process.env.RESET_PASSWORD ?? "").trim();

if (emails.length === 0 || !password) {
  console.error(
    "Usage: RESET_PASSWORD='…' node --env-file=.env.local scripts/reset-user-password.mjs email@… [email2@…]",
  );
  process.exit(1);
}
if (password.length < 8) {
  console.error("RESET_PASSWORD must be at least 8 characters");
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserByEmail(email) {
  let page = 1;
  for (;;) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = (data.users ?? []).find(
      (u) => (u.email ?? "").toLowerCase() === email,
    );
    if (hit) return hit;
    if (!data.users?.length || data.users.length < 200) return null;
    page += 1;
    if (page > 50) return null;
  }
}

async function main() {
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  for (const email of emails) {
    const user = await findUserByEmail(email);
    if (!user) {
      console.error(`✗ No auth user for ${email}`);
      continue;
    }
    const { error } = await db.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
    });
    if (error) {
      console.error(`✗ ${email}: ${error.message}`);
      continue;
    }
    console.log(`✓ Password updated for ${email} (${user.id.slice(0, 8)}…)`);

    if (anon) {
      const client = createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error: signErr } = await client.auth.signInWithPassword({
        email,
        password,
      });
      console.log(
        signErr ? `  sign-in verify: FAIL (${signErr.message})` : "  sign-in verify: OK",
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

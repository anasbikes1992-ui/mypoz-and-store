/**
 * Rotate passwords for known MyPoz accounts (requires service role from Vercel pull).
 *
 *   node --env-file=.env.vercel.pull scripts/rotate-chat-passwords.mjs
 *
 * Prints new passwords once to stdout — store securely; do not commit.
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const TARGETS = [
  "anasbikes1992@gmail.com",
  "anazazeez1992@gmail.com",
];

function tempPassword() {
  return randomBytes(9)
    .toString("base64url")
    .replace(/[^a-zA-Z0-9]/g, "x")
    .slice(0, 14);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const results = [];
for (const email of TARGETS) {
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) throw listErr;
  const user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    results.push({ email, ok: false, error: "not found" });
    continue;
  }
  const password = tempPassword();
  const { error } = await admin.auth.admin.updateUserById(user.id, { password });
  if (error) {
    results.push({ email, ok: false, error: error.message });
    continue;
  }
  results.push({ email, ok: true, password, userId: user.id });
}

console.log(JSON.stringify({ rotatedAt: new Date().toISOString(), results }, null, 2));

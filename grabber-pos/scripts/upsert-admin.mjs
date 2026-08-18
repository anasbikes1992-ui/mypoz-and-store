#!/usr/bin/env node
/**
 * Upsert a Supabase Auth user + profiles.role=owner for /admin access.
 * Does NOT re-seed org/catalog (safe on existing projects).
 *
 * Usage:
 *   node --env-file=.env.local scripts/upsert-admin.mjs
 *
 * Optional env overrides:
 *   UPSERT_ADMIN_EMAIL, UPSERT_ADMIN_PASSWORD, UPSERT_ADMIN_NAME
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const EMAIL = (
  process.env.UPSERT_ADMIN_EMAIL ??
  process.env.SEED_ADMIN_EMAIL ??
  ""
).trim().toLowerCase();
const PASSWORD =
  process.env.UPSERT_ADMIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? "";
const FULL_NAME = process.env.UPSERT_ADMIN_NAME ?? "Super Admin";

if (!EMAIL || !PASSWORD) {
  console.error("Set UPSERT_ADMIN_EMAIL/PASSWORD (or SEED_ADMIN_*)");
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const refMasked = url.replace(
  /https:\/\/([a-z0-9]+)\.supabase\.co/i,
  (_m, ref) => `https://${ref.slice(0, 4)}…${ref.slice(-2)}.supabase.co`,
);

async function findUserByEmail(email) {
  // Paginate admin list (no direct get-by-email in all SDK versions)
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const hit = (data.users ?? []).find(
      (u) => (u.email ?? "").toLowerCase() === email,
    );
    if (hit) return hit;
    if (!data.users?.length || data.users.length < perPage) return null;
    page += 1;
    if (page > 50) return null;
  }
}

async function ensureOrgContext(userId) {
  const { data: existingProfile } = await db
    .from("profiles")
    .select("id, org_id, role, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (existingProfile) {
    const { error } = await db
      .from("profiles")
      .update({ role: "owner", full_name: FULL_NAME })
      .eq("id", userId);
    if (error) throw error;
    return { orgId: existingProfile.org_id, createdProfile: false };
  }

  // Prefer attaching to an existing org rather than inventing a new tenant.
  const { data: orgs, error: orgErr } = await db
    .from("organizations")
    .select("id, name")
    .order("created_at", { ascending: true })
    .limit(1);
  if (orgErr) throw orgErr;

  let orgId = orgs?.[0]?.id;
  if (!orgId) {
    const slug =
      "grabber-" + Date.now().toString(36);
    const { data: org, error } = await db
      .from("organizations")
      .insert({ name: "Grabber Demo Store", slug })
      .select("id")
      .single();
    if (error) throw error;
    orgId = org.id;

    const { data: branch, error: bErr } = await db
      .from("branches")
      .insert({ org_id: orgId, name: "Main Branch", code: "MAIN" })
      .select("id")
      .single();
    if (bErr) throw bErr;
    await db.from("registers").insert({
      branch_id: branch.id,
      name: "Register 1",
    });
  }

  const { error: pErr } = await db.from("profiles").insert({
    id: userId,
    org_id: orgId,
    full_name: FULL_NAME,
    role: "owner",
  });
  if (pErr) throw pErr;

  const { data: branches } = await db
    .from("branches")
    .select("id")
    .eq("org_id", orgId)
    .limit(1);
  const branchId = branches?.[0]?.id;
  if (branchId) {
    await db.from("branch_members").upsert(
      { branch_id: branchId, user_id: userId },
      { onConflict: "branch_id,user_id", ignoreDuplicates: true },
    );
  }

  return { orgId, createdProfile: true };
}

async function main() {
  console.log(`→ Supabase project: ${refMasked}`);
  console.log(`→ Target email: ${EMAIL}`);

  let user = await findUserByEmail(EMAIL);
  let action;

  if (user) {
    const { data, error } = await db.auth.admin.updateUserById(user.id, {
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user;
    action = "updated_password";
    console.log("✓ Auth user exists — password updated, email confirmed");
  } else {
    const { data, error } = await db.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user;
    action = "created";
    console.log("✓ Auth user created (email confirmed)");
  }

  const { orgId, createdProfile } = await ensureOrgContext(user.id);
  console.log(
    createdProfile
      ? `✓ Profile created with role=owner (org ${String(orgId).slice(0, 8)}…)`
      : `✓ Profile role set to owner (org ${String(orgId).slice(0, 8)}…)`,
  );

  // Verify sign-in works with anon key path (same as login page).
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (anon) {
    const client = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: sess, error: signErr } = await client.auth.signInWithPassword({
      email: EMAIL,
      password: PASSWORD,
    });
    if (signErr) {
      console.error("✗ Login verify failed:", signErr.message);
      process.exit(1);
    }
    await client.auth.signOut();
    console.log("✓ signInWithPassword verified");
    console.log(`  user_id=${sess.user.id}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        action,
        role: "owner",
        email: EMAIL,
        project: refMasked,
        login: "https://grabber-poz.vercel.app/login",
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error("\nUpsert failed:", e.message ?? e);
  process.exit(1);
});

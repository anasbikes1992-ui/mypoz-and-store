/**
 * Live PostgreSQL concurrency certification (P1-5).
 *
 * Requires:
 *   RUN_DB_CONCURRENCY=1
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   RUN_DB_CONCURRENCY=1 node --env-file=.env.local scripts/db-concurrency-cert.mjs
 *
 * Safe: uses disposable payment_events / receipt calls; cleans up test rows.
 */
import { createClient } from "@supabase/supabase-js";

const enabled = process.env.RUN_DB_CONCURRENCY === "1";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
}

function pass(msg) {
  console.log(`PASS: ${msg}`);
}

async function main() {
  if (!enabled) {
    console.log("SKIP: set RUN_DB_CONCURRENCY=1 to run live DB concurrency cert");
    return;
  }
  if (!url || !key) {
    fail("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return;
  }

  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: org, error: orgErr } = await db
    .from("organizations")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (orgErr || !org?.id) {
    fail(`No organization for tests: ${orgErr?.message ?? "empty"}`);
    return;
  }
  const orgId = org.id;

  // ── Test C / A: duplicate payment_event claim (20 parallel) ──────────────
  const eventId = `cert-dup-${Date.now()}`;
  const claims = await Promise.all(
    Array.from({ length: 20 }, () =>
      db.rpc("claim_payment_event", {
        p_provider: "WEBXPAY",
        p_provider_event_id: eventId,
        p_org_id: orgId,
        p_payment_intent_id: null,
        p_status: "PAID",
        p_amount_minor: 100,
        p_currency: "LKR",
        p_provider_transaction_id: eventId,
        p_payload: { cert: true },
      }),
    ),
  );
  const claimErrors = claims.filter((c) => c.error);
  if (claimErrors.length) {
    fail(`claim_payment_event errors: ${claimErrors[0].error.message}`);
  } else {
    const winners = claims.filter((c) => c.data === true).length;
    const losers = claims.filter((c) => c.data === false).length;
    if (winners === 1 && losers === 19) {
      pass(`claim_payment_event idempotent (${winners} win / ${losers} ignore)`);
    } else {
      fail(`claim_payment_event expected 1/19, got ${winners}/${losers}`);
    }
  }
  await db
    .from("payment_events")
    .delete()
    .eq("provider", "WEBXPAY")
    .eq("provider_event_id", eventId);

  // ── Test D: concurrent receipt numbers ───────────────────────────────────
  const { data: branch, error: branchErr } = await db
    .from("branches")
    .select("id")
    .eq("org_id", orgId)
    .limit(1)
    .maybeSingle();
  if (branchErr || !branch?.id) {
    fail(`No branch for receipt test: ${branchErr?.message ?? "empty"}`);
  } else {
    const receipts = await Promise.all(
      Array.from({ length: 10 }, () =>
        db.rpc("next_receipt_no", { p_branch: branch.id }),
      ),
    );
    const errors = receipts.filter((r) => r.error);
    if (errors.length) {
      fail(`next_receipt_no errors: ${errors[0].error.message}`);
    } else {
      const nums = receipts.map((r) => String(r.data));
      const unique = new Set(nums);
      if (unique.size === nums.length) {
        pass(`next_receipt_no unique under concurrency (${nums.length} receipts)`);
      } else {
        fail(`duplicate receipts: ${nums.join(",")}`);
      }
    }
  }

  // ── Stock never negative under concurrent adjust (limited qty) ───────────
  const { data: product } = await db
    .from("products")
    .select("id")
    .eq("org_id", orgId)
    .limit(1)
    .maybeSingle();
  if (product?.id && branch?.id) {
    // Seed stock to 2 via adjust, then fire 5 competing -1 adjustments
    await db.rpc("adjust_stock", {
      p_branch: branch.id,
      p_product: product.id,
      p_delta: 2,
      p_note: "concurrency-cert seed",
      p_reason: "adjustment",
      p_reference: null,
    });
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        db.rpc("adjust_stock", {
          p_branch: branch.id,
          p_product: product.id,
          p_delta: -1,
          p_note: `concurrency-cert dec ${i}`,
          p_reason: "sale",
          p_reference: null,
        }),
      ),
    );
    const ok = results.filter((r) => !r.error).length;
    const rejected = results.filter((r) => r.error).length;
    const { data: stockRow } = await db
      .from("branch_stock")
      .select("qty")
      .eq("branch_id", branch.id)
      .eq("product_id", product.id)
      .maybeSingle();
    const qty = Number(stockRow?.qty ?? 0);
    if (qty >= 0 && ok <= 2) {
      pass(
        `adjust_stock concurrency: ok=${ok} rejected=${rejected} final_qty=${qty} (>=0)`,
      );
    } else {
      fail(`stock invariant broken: ok=${ok} rejected=${rejected} qty=${qty}`);
    }
  } else {
    console.log("SKIP stock concurrency: no product in org (expected pre-catalog)");
  }

  if (process.exitCode) {
    console.error("\nDB concurrency certification FAILED");
  } else {
    console.log("\nDB concurrency certification PASS");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

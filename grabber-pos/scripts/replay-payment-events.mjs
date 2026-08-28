#!/usr/bin/env node
/**
 * Replay unprocessed payment_events via service-role applyGatewayWebhook.
 * Requires built Next server modules — run from repo root with env loaded.
 *
 *   node --env-file=.env.local scripts/replay-payment-events.mjs
 */
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const limit = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] || 50);

const res = await fetch(
  `${(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")}/api/ops/replay-payments`,
  {
    method: "POST",
    headers: { "content-type": "application/json", cookie: process.env.OPS_REPLAY_COOKIE || "" },
    body: JSON.stringify({ limit }),
  },
);

if (!res.ok) {
  console.error(`HTTP ${res.status}:`, await res.text());
  console.error("Tip: call POST /api/ops/replay-payments as owner from the app, or set OPS_REPLAY_COOKIE.");
  process.exit(1);
}

const json = await res.json();
console.log(JSON.stringify(json.data, null, 2));

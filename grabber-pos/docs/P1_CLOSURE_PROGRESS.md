# P1 Closure Progress — pre–Gate 4

**Date:** 2026-08-25  
**Branch:** `production-hardening`  
**Scope:** Close P1-2 / P1-4 / P1-5 / P1-6 before Gate 4. **No catalog restore. No Gate 4 yet.**

## WebXPay staging (blocker for live card smoke)

| Item | Status |
|------|--------|
| Adapter defaults to staging URL | ✅ `https://stagingxpay.info/index.php?route=checkout/billing` |
| `WEBXPAY_ENV=staging` documented | ✅ `.env.example` |
| `/api/payments/status` readiness probe | ✅ |
| `/api/pos/pay` card checkout | ✅ |
| POS BillPanel card → pending → form POST | ✅ |
| Staging keys in `.env.local` | ❌ **MISSING** (file only has DB password) |
| Staging keys on Vercel production | ❌ **MISSING** (no `WEBXPAY_*` in project env) |
| Live keys | ⏸ deferred per CEO order |

**Action required from merchant:** paste WebXPay **staging** `WEBXPAY_PUBLIC_KEY` + `WEBXPAY_SECRET_KEY` (PEM from Dashboard → Settings → Integration). Set Return URL to `{APP_URL}/api/payments/webhook/WEBXPAY`. Do **not** set `WEBXPAY_ENV=live` until staging smoke passes.

Guide: https://developers.webxpay.com/Guides/Redirect-Integration/redirect.html

---

## P1 checklist

| ID | Item | Status | Evidence |
|----|------|--------|----------|
| P1-2 | POS card forces pending + gateway | ✅ code | `BillPanel` sends `status/paymentStatus=pending`; `/api/pos/pay` builds WebXPay form; stock waits for webhook |
| P1-4 | Distributed rate limit | ⚠ code ready, env pending | `rateLimitAsync` + Upstash REST pipeline; proxy awaits it. Needs `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` on Vercel |
| P1-5 | Live DB concurrency | ✅ partial | `claim_payment_event` 20× → 1 win (MCP SQL); `next_receipt_no` 10× → 10 distinct. Script: `scripts/db-concurrency-cert.mjs` |
| P1-6 | Reporting UI | ✅ | Reports page shows gross / discounts / refunds / net / COGS / profit / margin / tax + date filters |

---

## Deploy / Gate 3

| Step | Status |
|------|--------|
| Commit Phase 2 + P1 code | 🔄 in progress |
| Deploy `production-hardening` | ⏸ after commit + keys |
| Gate 3 re-smoke 79/79 | ⏸ after deploy |
| Gate 4 | **BLOCKED** until above + WebXPay staging smoke |

---

## Production invariant (unchanged)

> `production + Supabase` = zero silent fallback for money, inventory, auth, orders, payments, audit, or tenant data.

P1-1 dual demo fallbacks remain non-blocking when isolated from money/stock paths.

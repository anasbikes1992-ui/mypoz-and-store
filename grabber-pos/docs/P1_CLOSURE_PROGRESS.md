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
| Staging keys in `.env.local` | ❌ **MISSING** |
| Staging keys on Vercel production | ❌ **MISSING** — probe shows `configured:false` |
| Production probe | ✅ `GET /api/payments/status` → staging host `stagingxpay.info` |
| Live keys | ⏸ deferred |

**Action required from merchant:** add WebXPay **staging** `WEBXPAY_PUBLIC_KEY` + `WEBXPAY_SECRET_KEY` on Vercel (Production + Preview). Dashboard Return URL: `{APP_URL}/api/payments/webhook/WEBXPAY`. Do **not** set `WEBXPAY_ENV=live` until staging smoke passes.

Guide: https://developers.webxpay.com/Guides/Redirect-Integration/redirect.html

---

## P1 checklist

| ID | Item | Status | Evidence |
|----|------|--------|----------|
| P1-2 | POS card forces pending + gateway | ✅ code | `BillPanel` pending + `/api/pos/pay`; stock waits for webhook |
| P1-4 | Distributed rate limit | ⚠ code ready, env pending | Upstash-ready `rateLimitAsync` in proxy; needs `UPSTASH_REDIS_*` on Vercel |
| P1-5 | Live DB concurrency | ✅ partial | `claim_payment_event` 20→1; `next_receipt_no` 10 distinct; script ready |
| P1-6 | Reporting UI | ✅ | Gross / discounts / refunds / net / COGS / profit / margin / tax |

---

## Deploy / Gate 3

| Step | Status |
|------|--------|
| Commit Phase 2 + P1 code | ✅ `7bcc860` + `6d8551f` on `production-hardening` |
| Deploy `production-hardening` | ✅ production Ready |
| Gate 3 re-smoke 79/79 | ✅ **PASS** — 79/79, 0 critical/high (2026-08-25) |
| Gate 4 | **BLOCKED** until WebXPay staging keys + card smoke + Upstash (optional but P1) |

---

## Production invariant (unchanged)

> `production + Supabase` = zero silent fallback for money, inventory, auth, orders, payments, audit, or tenant data.

P1-1 dual demo fallbacks remain non-blocking when isolated from money/stock paths.

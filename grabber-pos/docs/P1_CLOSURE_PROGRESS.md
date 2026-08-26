# P1 Closure Progress

**Date:** 2026-08-26  
**Branch:** `production-hardening`  
**Scope:** Remaining P1s before CLIENT READY. **No Aug-24 JSON restore. No mass legacy delete.**

---

## WebXPay staging

| Item | Status |
|------|--------|
| Adapter defaults to staging URL | ✅ `https://stagingxpay.info/...` |
| Staging keys on Vercel Production + Preview | ✅ refreshed 2026-08-26 |
| `WEBXPAY_ENV=staging` + `PAYMENTS_LKR_PROVIDER=WEBXPAY` | ✅ |
| Return URL in merchant dashboard | ✅ (operator) |
| Probe `GET /api/payments/status` | ✅ configured + staging host |
| Automated claim / pending / forged webhook | ✅ Gate 4 |
| **Live RSA signed callback (one card pay)** | ⏸ **Deferred** — staging `442 Invalid encryption` on capturePay; billing hop OK |
| Live merchant keys | ⏸ after RSA PASS |

---

## Other P1

| ID | Item | Status |
|----|------|--------|
| P1-2 | POS card pending + gateway | ✅ |
| P1-4 | Distributed rate limit | ✅ Upstash on Vercel (probe `rateLimit: upstash`) |
| P1-5 | Concurrency / claim | ✅ Gate 4 |
| P1-6 | Reporting UI | ✅ |
| G5-P1-1 | Logical export | ✅ `data/backups/gate5-logical-2026-08-26T11-19-36-896Z.json` |
| G5-P1-2/3/4 | PITR confirm / restore drill / off-site copy | ⏳ operator |
| Anaz catalog | Trusted rebuild | ✅ 1518 products + published `/store/anaz-store` (2026-08-26) |
| Anaz COD smoke | Storefront order + delivery board | ✅ `GPS-MAIN-20260826-0001` / `DEL-7A6C74A9` |
| Resend | Email API key | ✅ (`email.configured`; optional `RESEND_FROM_EMAIL`) |

---

## Gate status

| Gate | Status |
|------|--------|
| Gate 3 | ✅ 79/79 |
| Gate 4 | ✅ PASS WITH P1 (RSA deferred) |
| Gate 5 | ✅ PASS WITH P1 (export done; drill/PITR operator) |
| CLIENT READY | ❌ OPEN — Anaz COD soft-launch OK; card RSA + Gate 5 drill still open |

---

## Next

1. Execute `docs/work/01`–`03` (P0 transactional + HQ truth) then **HQ Pilot #2**  
2. Operator: A-OP-01 + Gate 5 off-site/PITR/restore drill  
3. WebXPay 442 → RSA last (after pilot path green)  

Authority: `docs/MYPOZ_BUSINESS_OS_NEXT_EXECUTION_ROADMAP.md` · branch `business-os-cod-first`.

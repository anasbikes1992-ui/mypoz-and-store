# P1 Closure Progress

**Date:** 2026-08-25 (updated post Gate 4/5 closeout)  
**Branch:** `production-hardening`  
**Scope:** Remaining P1s before CLIENT READY. **No catalog restore. No mass legacy delete.**

---

## WebXPay staging

| Item | Status |
|------|--------|
| Adapter defaults to staging URL | ✅ `https://stagingxpay.info/...` |
| Staging keys on Vercel Production | ✅ |
| Return URL in merchant dashboard | ✅ (operator) |
| Probe `GET /api/payments/status` | ✅ configured + staging host |
| Automated claim / pending / forged webhook | ✅ Gate 4 |
| **Live RSA signed callback (one card pay)** | ⏸ **Deferred** — staging `442 Invalid encryption` (API/keys/settings); architecture OK |
| Live merchant keys | ⏸ after RSA PASS + staging settings fixed |

---

## Other P1

| ID | Item | Status |
|----|------|--------|
| P1-2 | POS card pending + gateway | ✅ |
| P1-4 | Distributed rate limit | ⚠ code ready — needs `UPSTASH_REDIS_*` |
| P1-5 | Concurrency / claim | ✅ Gate 4 |
| P1-6 | Reporting UI | ✅ |
| G5-P1 | Logical export + restore drill | ⏳ `SUPABASE_DB_PASSWORD` + dashboard drill |

---

## Gate status

| Gate | Status |
|------|--------|
| Gate 3 | ✅ 79/79 |
| Gate 4 | ✅ PASS WITH P1 (RSA) |
| Gate 5 | ✅ PASS WITH P1 (export/drill) |
| CLIENT READY | ❌ OPEN — see `MYPOZ_FINAL_PRODUCTION_CERTIFICATION.md` |

---

## Keys last

Fill using `docs/PRODUCTION_ENV_KEYS_CHECKLIST.md` — then RSA smoke → logical export → restore drill → pilot.

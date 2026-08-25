# Gate 4 — Commerce & Integrity Certification

**Date:** 2026-08-25 (updated P1 closure)  
**Branch:** `production-hardening`  
**App:** https://mypoz-and-store-ui.vercel.app  
**Runners:** `scripts/gate4-commerce-cert.mjs`, `scripts/gate4-p1-commerce.mjs`  
**Master blueprint:** `docs/MYPOZ_FINAL_MASTER_PRODUCTION_BLUEPRINT.md`

---

## Executive verdict

### **GATE 4 — PASS WITH P1 (live RSA webhook only)**

All automated commerce integrity paths below are **PASS with database evidence**, including void, partial return/refund, transfer, stocktake, and PO receive.

**Only remaining P1 for full Gate 4 close:**

| Gap | Status |
|-----|--------|
| Live WebXPay RSA signed callback | ⏸ **Deferred** — staging returns `442 Invalid encryption` on card checkout (merchant key / dashboard settings). App path (pending sale → encrypted form → staging host → webhook route) is certified; forged webhooks rejected; claim/stock side effects proven in DB. Retry after WebXPay staging keys/settings confirmed. |

Invalid/forged webhooks are rejected. Paid completion + claim idempotency already proven via the same DB side effects the webhook invokes.

**Infrastructure:** Do **not** add aaPanel/Webuzo. Stay on Vercel + Supabase + WebXPay.

---

## Fixes shipped during Gate 4

| Issue | Fix |
|-------|-----|
| `adjust_stock` text→enum mismatch | Migration **`0030`** |
| Sales API stripped pending status | Schema + card force-pending |
| Transfer id `TRF-*` broke `adjust_stock` uuid reference | UUID transfer ids + `org_id` on insert |
| PO insert missing `org_id` → RLS deny | `po-store` sets `org_id` from branch |

---

## Test inventory (DB-verified)

### Core (batch 1)

| ID | Result |
|----|--------|
| Cash POS stock −1 | PASS |
| Card pending no stock | PASS |
| Staging checkout form | PASS |
| Invalid/empty/forged webhook | PASS |
| Claim idempotency 5→1 | PASS |
| Paid complete stock once | PASS |
| Webhook replay no double stock | PASS |
| Concurrent last-unit | PASS |
| Tenant isolation | PASS |
| Receipt sequencing | PASS |
| Adjust + no negative | PASS |

### P1 commerce (batch 2 — preview build `859s9u548` + prod promote)

| ID | Result | Evidence |
|----|--------|----------|
| 4B_void_api | **PASS** | Sale voided; stock restored **38→40** |
| 4B_returns_refunds | **PASS** | Qty 5 sold, return 2, stock **+2**, refund **50** |
| 4B_return_over_qty_rejected | **PASS** | Over-return **422** |
| 4B_transfer_out_in | **PASS** | Src **20→17**, dst **0→3** |
| 4B_stocktake_post | **PASS** | Counted 12 → on-hand **12** |
| 4B_po_receive | **PASS** | PO received; stock **12→16** |
| 4A_forged_webhook_rejected | **PASS** | **400** Unparseable |
| 4A_live_webxpay_rsa_webhook | **P1 OPEN** | Manual staging card |

---

## Explicit verdict

```text
GATE 4 COMMERCE INTEGRITY
─────────────────────────
Automated money/stock/inventory paths     ✅ PASS
Live WebXPay RSA callback                 ⚠ P1 OPEN (manual)

OVERALL                                   🟡 PASS WITH P1 (RSA only)

Catalog restore                           🔒 BLOCKED
Legacy mass delete                        🔒 BLOCKED
Client onboarding                         🔒 BLOCKED until RSA smoke + Gate 5
```

### Next

1. Complete one staging card payment → confirm webhook → paid → stock (RSA).  
2. Execute **Gate 5** (`docs/GATE5_BACKUP_DR_SCAFFOLD.md`).  
3. Then catalog → legacy cleanup → pilot.

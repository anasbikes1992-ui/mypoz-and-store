# Gate 4 — Commerce & Integrity Certification

**Date:** 2026-08-25  
**Branch:** `production-hardening`  
**App:** https://mypoz-and-store-ui.vercel.app  
**Runner:** `scripts/gate4-commerce-cert.mjs` + privileged SQL via Supabase  
**Results JSON:** `data/backups/gate4-commerce-results.json` (gitignored)  
**Master blueprint:** `docs/MYPOZ_FINAL_MASTER_PRODUCTION_BLUEPRINT.md`

---

## Executive verdict

### **GATE 4 — PASS WITH P1 GAPS**

Core money/stock invariants for POS cash, card-pending, webhook claim idempotency, single stock apply, concurrent last-unit sale, tenant isolation, receipt sequencing, and typed stock adjustment are **PASS with database evidence**.

**Not yet 100% closed (P1 — block catalog / clients until done):**

| Gap | Why |
|-----|-----|
| Live WebXPay RSA callback | Invalid/empty HTTP webhooks PASS; PAID path certified via same `claim_payment_event` → `create_sale_internal` side effects. Full RSA signature round-trip still needs one manual staging card payment. |
| Void E2E | Requires configured manager PIN + API void; not executed this batch |
| Returns / refunds E2E | Not executed this batch |
| PO / transfer / stocktake E2E | Not executed this batch |

**P0 discovered and fixed during Gate 4:**

| Issue | Fix |
|-------|-----|
| `adjust_stock` inserted `text` into `movement_reason` enum → runtime failure | Forward migration **`0030_adjust_stock_reason_cast`** applied live + in repo |
| Sales API stripped `status`/`paymentStatus` (pre-Gate 4) | Already fixed on branch (`1422a72`) — card stays pending |

**Infrastructure note:** Do **not** add aaPanel/Webuzo. Stay on Vercel + Supabase.

---

## Precondition state

| Item | Evidence |
|------|----------|
| Migrations | Live includes `0027`–`0029`; **`0030` applied** during Gate 4 |
| Gate 3 | 79/79 PASS (post Phase 2 deploy) |
| WebXPay staging | `/api/payments/status` → `configured:true`, host `stagingxpay.info` |
| Catalog restore | **Not done** (correct) |
| Legacy delete | **Not done** (correct) |

---

## Test inventory (evidence standard)

Every PASS below used: `input → API/SQL → authz → mutation → DB readback` — not HTTP 200 alone.

### Auth fixtures

| ID | Result | Evidence |
|----|--------|----------|
| auth_aOwner | PASS | `e2847ae1-…` |
| auth_aCashier | PASS | `a5555555-…` |
| auth_bOwner | PASS | `f5154389-…` |

### 4A — POS / payments

| ID | Result | Evidence |
|----|--------|----------|
| 4A_cash_pos_e2e | **PASS** | Sale `GPS-MAIN-20260825-0011`; stock **50→49** |
| 4A_card_pending_no_stock | **PASS** | `POS-C741D9DAF00A` pending; stock **49→49**; `payment_intents.status=pending` |
| 4A_card_checkout_form | **PASS** | formAction `https://stagingxpay.info/.../billing` |
| 4A_invalid_webhook | **PASS** | POST garbage → **400** |
| 4A_empty_webhook | **PASS** | POST empty → **400** |
| 4A_webhook_event_idempotent_claim | **PASS** | 5× `claim_payment_event` → **1 win**; `payment_events` count **1** |
| 4A_card_paid_stock_once | **PASS** | `create_sale_internal` once; stock **10→9**; `sales` for client_uuid **1**; intent → **paid** |
| 4A_webhook_replay_no_double_stock | **PASS** | Replay claim `false`; stock unchanged after paid |
| 4A_concurrent_last_stock | **PASS** | Stock=1; **1 success / 1 reject**; final **0** (`STOCK: only 0.000…`) |
| 4A_tenant_isolation_sale | **PASS** | Tenant B cannot sell A product → **404 PRODUCT not found** |
| 4A_receipt_sequencing | **PASS** | 8 unique `next_receipt_no` values |
| 4A_audit_events_present | **PASS** | Recent `sale.created` / `payment.*` rows |
| 4A_live_webxpay_rsa_webhook | **P1 OPEN** | Manual staging card pay still required for RSA signature path |

### 4B — Inventory (partial)

| ID | Result | Evidence |
|----|--------|----------|
| 4B_stock_adjustment | **PASS** | After `0030`: stock **0→2** via `adjust_stock` |
| 4B_no_negative_stock | **PASS** | Delta −1 from 0 → exception; qty stays **0** |
| 4B_void_api | **P1 OPEN** | Needs manager PIN config + E2E |
| 4B_returns_refunds | **P1 OPEN** | Not run |
| 4B_po_transfer_stocktake | **P1 OPEN** | Not run |

---

## Payment / webhook evidence chain

```text
POS card
  → POST /api/sales (pending)           PASS (no stock)
  → POST /api/pos/pay                   PASS (staging form)
  → invalid/empty webhook HTTP          PASS (400)
  → claim_payment_event ×5              PASS (1 accept)
  → create_sale_internal                PASS (1 sale)
  → stock −1 once                       PASS
  → claim replay                        PASS (no second stock move)
  → payment_intents.status=paid         PASS
```

**Invariant held:** a payment event cannot double-decrement stock.

**Remaining:** browser completes staging checkout → WebXPay posts RSA-signed body → `/api/payments/webhook/WEBXPAY` → same claim/complete path without SQL simulation.

---

## Concurrency evidence

```text
Stock = 1
Cashier race ×2 cash sales
→ 1 × HTTP success
→ 1 × STOCK insufficient
→ Final stock = 0
```

---

## Commands

```bash
# API + JWT stock checks
export NEXT_PUBLIC_SUPABASE_URL=https://veavfkjgtkbnggukzjds.supabase.co
export NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon>
export NEXT_PUBLIC_APP_URL=https://mypoz-and-store-ui.vercel.app
node scripts/gate4-commerce-cert.mjs

# Privileged claim/complete (this run): Supabase SQL / MCP using
# data/backups/gate4-privileged-context.json
```

---

## Remaining risks (ordered)

1. **P1** Complete live WebXPay RSA webhook once on staging; confirm identical DB outcomes.  
2. **P1** Void + returns/refunds + PO/transfer/stocktake E2E with DB evidence.  
3. **P1** Upstash distributed rate limit env still unset (memory fallback on multi-instance).  
4. **P0/Gate 5** Backup/restore still unproven — do **not** onboard clients.  
5. Vercel `env pull` returns empty Supabase secrets — use dashboard/runtime only; rotate Gate 3 passwords after cert windows.

---

## Explicit Gate 4 verdict

```text
GATE 4 COMMERCE INTEGRITY
─────────────────────────
Core POS cash / card-pending / claim idempotency / single stock apply
Concurrent last-unit / tenant isolation / receipts / adjust_stock
                              ✅ PASS

Live RSA webhook / void / returns / PO-transfer-stocktake
                              ⚠ P1 OPEN

OVERALL                       🟡 PASS WITH P1 GAPS

Catalog restore               🔒 BLOCKED
Legacy mass delete            🔒 BLOCKED
Client onboarding             🔒 BLOCKED until P1 closed + Gate 5
```

**Next:** close P1 commerce gaps → Gate 5 backup/restore → then catalog → legacy cleanup → pilot.

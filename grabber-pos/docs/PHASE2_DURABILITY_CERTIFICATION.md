# Gate Phase 2 — Durability & Reconciliation Certification

**Date:** 2026-08-25  
**Branch:** `production-hardening`  
**Migrations applied live:** `0027`, `0028`, `0029` (history `0001`–`0026` unchanged)  
**Verification:** `tsc --noEmit` PASS · Vitest **209/209** PASS  

---

## Executive Verdict

**PHASE 2 PASS WITH REMAINING P1/P2**

P0 durability items from Gate 2B are addressed in schema + code paths. Gate 4 is **still blocked** until commerce E2E/concurrency is explicitly run. Legacy vertical `docStore`/`recordStore` modules remain classified DEFER (not deleted).

---

## Changed

| Area | Files |
|------|-------|
| Audit SoT | `0027_audit_unification.sql`, `audit-service.ts`, `audit-logger.ts`, `audit-store.ts`, `api/audit/route.ts` |
| Payments SoT | `0028_payment_domain.sql`, `gateway-payments-store.ts`, webhook route |
| POS pending | `0029_…sql` `create_pos_payment_intent`, `repositories/supabase.ts`, `complete-pending-sale.ts` |
| Inventory reasons | `adjust_stock` + `p_reason`/`p_reference_id`; `transfer-store.ts`, `returns-store.ts` |
| Reporting | `report_sales_summary` RPC; `api/reports/summary/route.ts` |
| Offline | `offline-queue.ts`, `OfflineSetup.tsx`, `BillPanel.tsx` — disabled unless `NEXT_PUBLIC_ALLOW_OFFLINE_POS=true` |
| Fallbacks | `persistence/backend.ts` — production never returns null for silent JSON |
| Tests | `phase2-hardening.test.ts`, `migration-batch.test.ts` updated |

---

## Database

| Migration | Purpose | Live |
|-----------|---------|------|
| 0027_audit_unification | `write_audit_event`, audit columns, owner/manager SELECT | Applied |
| 0028_payment_domain | `payment_intents`, `payment_events`, `claim_payment_event` | Applied |
| 0029_pos_pending_inventory_reporting | POS pending intent, typed `adjust_stock`, `report_sales_summary` | Applied |

**Immutable:** `0001`–`0026` not modified.

---

## Removed / deactivated (not mass-deleted)

| Item | Action |
|------|--------|
| Collection/JSON audit writers | Replaced — facades call SQL |
| Gateway JSON file ledger | Removed from production path — SQL intents only |
| Offline localStorage sale queue | Disabled by default |
| Silent `resolveDb() → null → JSON` in production | Throws instead |

Legacy dual-path stores for verticals (restaurant, HP, …) **KEEP/DEFER** — still present; not production money/stock primary path.

---

## Tests

```text
tsc --noEmit          PASS
vitest run            209 passed (47 files)
```

Targeted: phase2-hardening, migration-batch, webhook-idempotency, gms-auth-hardening.

---

## Domain evidence chains (Phase 2 scope)

### Audit
`UI /api/audit` → `requireTenantSession` + roles → `audit-logger` → `write_audit_event` / SELECT `audit_events` → RLS owner/manager → `0027` → phase2 tests

### Payments
Checkout/webhook → `gateway-payments-store` → `payment_intents` + `claim_payment_event` → complete sale once → `0028` → unit idempotency + static tests

### POS pending
`createSale(status/paymentStatus=pending)` → `create_pos_payment_intent` (no stock) → webhook → `completePosPaymentIntent` → `create_sale_internal` → `0029`

### Cash POS
Unchanged: `create_sale` immediate stock (terminal card without pending still immediate — document: pass `paymentStatus=pending` for gateway card)

### Inventory
Transfers/returns pass `p_reason` (`transfer_out`/`transfer_in`/`return`) → `stock_movements`

### Reporting
`GET /api/reports/summary?date_from&date_to&branch` → `report_sales_summary` → gross/net/COGS/margin/tax/method/cashier

### Offline
Production path: enqueue returns null; error asks retry online

---

## P0 / P1 / P2 remaining

### Closed this phase (were P0)

| Item | Status |
|------|--------|
| Audit split | **CLOSED** — SQL only for new writes/lists |
| Gateway JSON silent fallback | **CLOSED** |
| POS pending durable reject | **CLOSED** — pending supported |
| Reporting 200-row browser math (summary) | **CLOSED** — SQL RPC |
| Offline queue production | **CLOSED** — disabled by default |

### P1 remaining

| ID | Issue |
|----|-------|
| P1-1 | Dual JSON fallbacks still exist inside po/stocktake/register/transfer when demo mode (`!requireSupabase`) |
| P1-2 | POS UI does not yet force card → `paymentStatus=pending` + gateway checkout UX |
| P1-3 | Storefront boards still `app_collections` (orders); intents are SQL but boards DEFER |
| P1-4 | In-memory rate limiter still Map-based (multi-instance) |
| P1-5 | No live concurrent webhook/sale DB integration tests yet |
| P1-6 | Reporting UI may need wiring for new fields (COGS/margin); dead-stock empty on durable path |
| P1-7 | Service-role audit for storefront complete needs reliable `org_id` on all paths |

### P2

| ID | Issue |
|----|-------|
| P2-1 | Vertical modules still on `app_collections` |
| P2-2 | Orphan `gate3_as_user` cleanup |
| P2-3 | Licence still in `app_documents` |
| P2-4 | Empty-DB replay of `0001→0029` should be CI-certified (live incremental apply done) |

---

## Legacy inventory (do not delete yet)

**REPLACE done:** audit collections, gateway JSON.  
**DEFER:** restaurant/HP/layaway/bookings/jobs/delivery/click-collect/held-bills/whatsapp inbox docs, `LocalRepository`.  
**DELETE candidates after Gate 4:** offline wiring, unused audit collection data, demo JSON files.

---

## Gate status

| Gate / Phase | Status |
|--------------|--------|
| 2A | PASS |
| 2B | PASS WITH REMEDIATION → Phase 2 addressed P0s |
| 3 | PASS — re-smoke recommended after deploy |
| **Phase 2** | **PASS WITH P1/P2 remaining** |
| Gate 4 | **BLOCKED** until explicit go-ahead + deploy of 0027–0029 code |
| Gate 5 | NOT STARTED |

---

## Risks

1. Production deploy must ship code + confirm migrations `0027–0029` on the same project (already applied to `veavfkjgtkbnggukzjds`).  
2. Empty-DB full replay `0001→0029` not re-run in this session (incremental apply verified).  
3. Cashier card-at-counter without `pending` still completes immediately (intentional terminal semantics).  

---

## Next phase

1. Deploy `production-hardening` to Vercel.  
2. Re-run Gate 3 smoke (audit/reports/auth) — expect no regression.  
3. Wire POS card UI to pending+gateway when product requires verified card.  
4. Then **Gate 4** commerce + concurrency certification.  
5. Do **not** restore catalog or mass-delete legacy until Gate 4 PASS.

**Gate 4 not started.**

# FINAL ARCHITECTURE INVENTORY

**Date:** 2026-08-25  
**Mode:** READ-ONLY discovery (Phase 1)  
**Branch:** `production-hardening`  
**Tag:** `mypoz-pre-final-hardening`  
**Evidence bases:** Gate 2A/2B/3 docs + live SQL + `src/` census  

Classifications: `CANONICAL` | `LEGACY` | `DUPLICATE` | `DEVELOPMENT ONLY` | `TEST ONLY` | `MIGRATION ONLY` | `MUST REMOVE` | `MUST REPLACE` | `DOCUMENT-OK` | `DEFERRED`

---

## 1. PostgreSQL tables (live = 37)

| Table | Classification | Notes |
|-------|----------------|-------|
| organizations | CANONICAL | Tenant root |
| branches | CANONICAL | |
| profiles | CANONICAL | role on profile |
| branch_members | CANONICAL | SELECT RLS; underused in app |
| suppliers | CANONICAL | |
| categories | CANONICAL | |
| products | CANONICAL | |
| product_barcodes | CANONICAL | |
| branch_stock | CANONICAL | balance |
| stock_movements | CANONICAL | ledger |
| purchases | CANONICAL | PO headers (name ≠ purchase_orders) |
| purchase_lines | CANONICAL | |
| registers | CANONICAL | |
| shifts | CANONICAL | |
| shift_summaries | CANONICAL | 0026 |
| sales | CANONICAL | |
| sale_lines | CANONICAL | |
| payments | CANONICAL (tender) / PARTIAL domain | Used by sale RPC; **not** gateway lifecycle |
| audit_events | CANONICAL (target sole audit) | Written by RPCs; **not** wired to `/api/audit` |
| app_collections | DOCUMENT-OK (config/verticals) / MUST REPLACE for money/stock | Dual-use bag |
| app_documents | DOCUMENT-OK (settings/licence/whatsapp) | |
| stock_documents | CANONICAL | Damage/adj docs |
| storefronts | CANONICAL | |
| store_collections | CANONICAL | |
| store_collection_products | CANONICAL | |
| product_variants | CANONICAL | |
| variant_branch_stock | CANONICAL | |
| platform_settings | CANONICAL | HQ |
| receipt_counters | CANONICAL | |
| stocktakes / stocktake_lines | CANONICAL | |
| stock_transfers / stock_transfer_lines | CANONICAL | |
| sale_returns / sale_return_lines | CANONICAL | |
| refunds / refund_lines | CANONICAL | |

**Views:** `reseller_licences` — CANONICAL (HQ roll-up; not a table).

**Dropped by design (0006):** `app_settings`, `restaurant_orders` → documents/collections. MIGRATION ONLY history.

---

## 2. Migrations

| Range | Classification |
|-------|----------------|
| 0001–0026 (27 files incl. 0010b) | CANONICAL history — **immutable** |
| 0027+ (not created yet) | Future forward-only hardening |

---

## 3. RPCs / functions (app-relevant)

| Function | Classification |
|----------|----------------|
| create_sale / create_sale_internal | CANONICAL |
| void_sale | CANONICAL |
| next_receipt_no | CANONICAL |
| adjust_stock / set_branch_stock / receive_purchase | CANONICAL |
| catalog / product_by_barcode / inventory_stats | CANONICAL |
| storefront_* family | CANONICAL |
| whatsapp_resolve_org / whatsapp_create_order | CANONICAL |
| update_sale_fulfillment | CANONICAL |
| hq_provision_tenant | CANONICAL |
| current_org_id / current_user_role | CANONICAL |
| gate3_as_user | MUST REMOVE (orphan; not in repo migrations) |
| pg_trgm helpers | MIGRATION ONLY / extension |

---

## 4. Triggers (7)

`app_collections_touch`, `app_documents_touch`, `product_variants_touch`, `products_updated_at`, `shift_summaries_touch`, `store_collections_touch`, `storefronts_touch` — CANONICAL updated_at helpers.

---

## 5. RLS policies (38)

See `docs/RLS_MATRIX.md`. Pattern: org-scoped ALL for mutable entities; SELECT-only + DEFINER RPC for sales/stock/payments/audit_events.

---

## 6. API routes (102)

Auth census (static): PUBLIC 14 · STRONG 45 · INDIRECT 41 · WEAK 2 (`backup`, `products/export`).

Webhooks (PUBLIC + signature): `payments/webhook/[provider]`, `whatsapp/webhook`.

---

## 7. Repositories / domain stores

| Module | Classification |
|--------|----------------|
| `repositories/supabase.ts` | CANONICAL POS |
| `repositories/local.ts` | DEVELOPMENT ONLY / MUST REMOVE after demo gate |
| `returns-store.ts` | CANONICAL (SQL) |
| `po-store.ts` | CANONICAL SQL preferred; LEGACY JSON fallback |
| `transfer-store.ts` | CANONICAL SQL preferred; LEGACY docStore fallback |
| `stocktake-store.ts` | CANONICAL SQL preferred; LEGACY recordStore fallback |
| `register-store.ts` | CANONICAL SQL preferred; LEGACY docStore fallback |
| `gateway-payments-store.ts` | MUST REPLACE → payment domain tables |
| `audit-logger.ts` / `audit-store.ts` | DUPLICATE / MUST REPLACE → `audit_events` |
| `complete-pending-sale.ts` | CANONICAL durable path; LEGACY sales.json path |
| Vertical `*-store.ts` (restaurant, HP, layaway, jobs, bookings, play, delivery, click-collect) | DOCUMENT-OK via app_collections until product decides SQL |
| `doc-store.ts` / `record-store.ts` | LEGACY dual-path infrastructure — MUST REPLACE production writes |

---

## 8. docStore usages

| Key / file | Domain | Classification |
|------------|--------|----------------|
| settings / settings.json | Settings | DOCUMENT-OK (app_documents) |
| tenant / tenant.json | Licence/brand | DOCUMENT-OK → later SQL licences |
| permissions / permissions.json | Permissions | MUST REPLACE (SQL roles/permissions preferred) |
| commerce / commerce.json | Commerce config | DOCUMENT-OK |
| website / website.json | CMS | DOCUMENT-OK |
| register_shift* | Register | MUST REPLACE (already have shifts tables) |
| stock_transfers.json key | Transfers | MUST REPLACE |
| whatsapp | WA settings | DOCUMENT-OK |

---

## 9. recordStore usages (collections)

| Collection | Classification |
|------------|----------------|
| gateway-payments | MUST REPLACE |
| audit-logs / audit-events | MUST REPLACE |
| storefront-orders | MUST REPLACE or formalize as order tables |
| purchase-orders | DUPLICATE of `purchases` — MUST REMOVE fallback |
| stocktakes | DUPLICATE of SQL — MUST REMOVE fallback |
| restaurant-orders, bookings, jobs, layaway, hire-purchase, play-sessions, held-bills, delivery-orders, click-collect-orders, reload-log, tenant-knowledge, ux-events, commerce-events, storefront-customers, whatsapp-* | DOCUMENT-OK / DEFERRED SQL |

---

## 10. JSON files / local persistence (production risk)

| Path pattern | Classification |
|--------------|----------------|
| `data/*.json` via `local-json.ts` | DEVELOPMENT ONLY when `requireSupabase` |
| `gateway-payments.json`, `sales.json` | MUST REMOVE production path |
| `hq-tickets.json`, `hq-platform.json`, `hq-tenant-ops.json` | LEGACY fallback |

---

## 11. localStorage business data

| Usage | Classification |
|-------|----------------|
| Offline sale queue `grabber-pos-offline-sales` | DEFERRED / MUST REMOVE production |
| Storefront cart | UI-only OK |
| Theme / display | UI-only OK |

---

## 12. Payment implementations

| Path | Classification |
|------|----------------|
| SQL `payments` via create_sale_internal | CANONICAL tender rows |
| `gateway-payments` collection | MUST REPLACE |
| Licence payment via webhook meta | MUST REPLACE into billing domain |

---

## 13. Audit implementations

| Path | Classification |
|------|----------------|
| SQL `audit_events` (RPC inserts) | CANONICAL target |
| `audit-logger` → collection `audit-logs` | DUPLICATE / MUST REMOVE |
| `audit-store` → collection `audit-events` | DUPLICATE / MUST REMOVE |

---

## 14. Reporting

| Path | Classification |
|------|----------------|
| `api/reports/summary` Node aggregation | MUST REPLACE with SQL reporting |
| `GET /api/sales` limit 200 | LEGACY incomplete |

---

## 15. Webhooks

| Route | Classification |
|-------|----------------|
| `/api/payments/webhook/[provider]` | CANONICAL entry; persistence MUST REPLACE |
| `/api/whatsapp/webhook` | CANONICAL |

---

## 16. Service-role operations

See `docs/SERVICE_ROLE_AUDIT.md`.

---

## 17. Public endpoints

store/*, payments webhook, whatsapp webhook, health, auth/login, auth/forgot-password, waf-deny — expected public with signature/rate limits.

---

## 18. Cron / background

No first-party cron jobs verified in repo for production money paths. **UNVERIFIED** Vercel cron config outside this inventory.

Offline flush on reconnect (`OfflineSetup.tsx`) — DEFERRED/disable.

---

## 19. Tests (48 files)

Mostly unit/static. Gate 3 = live HTTP security. **Missing:** live DB concurrency for sales/webhooks/stock. See Gate 2B test section.

---

## 20. Explicit non-actions this phase

- No migrations created  
- No legacy deleted  
- No catalog restore  
- No Gate 4  
- No feature builds  

# DATABASE DOMAIN MATRIX

**Date:** 2026-08-25  
**Statuses:** VERIFIED | MISSING | DUPLICATED | ORPHANED | BROKEN | PARTIAL | DEFERRED

| Domain | UI | API | Service/Store | Table/View | RPC | RLS | FK | Index | Migration | Tests | Status |
|--------|----|-----|---------------|------------|-----|-----|----|-------|-----------|-------|--------|
| Auth login | Y | auth/login | auth-session | Auth+profiles | — | Y | Y | Y | 0001 | Gate3+unit | VERIFIED |
| Orgs/tenancy | HQ+tenant | tenant, hq/* | hq-repo | organizations | hq_provision | Y | Y | Y | 0001 | Gate3 | VERIFIED |
| Profiles/roles | permissions | permissions | permissions-store | profiles + **doc** | — | Y | Y | Y | 0001 | unit | PARTIAL (perms in doc) |
| Branches | settings | — | repos | branches | — | Y | Y | Y | 0001 | — | VERIFIED |
| Products | products | products/* | product-admin, catalog | products | catalog | Y | Y | Y | 0001+ | unit | VERIFIED |
| Variants | products | variants | variants-repo | product_variants | — | Y | Y | Y | 0011 | unit | VERIFIED |
| Categories/suppliers | products | collections | catalog-entity-store | categories/suppliers | — | Y | Y | Y | 0001 | — | VERIFIED |
| Barcodes | POS | — | product-admin | product_barcodes | product_by_barcode | Y | Y | Y | 0001 | — | VERIFIED |
| Branch stock | inventory | stock/* | stock-store | branch_stock | adjust_stock | Y | Y | Y | 0001 | — | VERIFIED |
| Stock movements | — | — | RPC | stock_movements | adjust/set/receive | Y | Y | Y | 0001 | MISSING live | PARTIAL |
| POS cash sale | POS | sales | SupabaseRepository | sales/lines/payments | create_sale | Y | Y | Y | 0002 | unit | VERIFIED path / PARTIAL tests |
| POS card pending | POS | sales | supabase.ts **rejects** | — | — | — | — | — | — | — | **BROKEN / MISSING** |
| Void | POS | sales/void | void_sale | sales | void_sale | Y | Y | Y | 0024 | string test | PARTIAL |
| Receipts | POS | — | RPC | receipt_counters | next_receipt_no | Y | Y | Y | 0021 | migration | VERIFIED |
| Register/shift | register | register | register-store | shifts+summaries | — | Y | Y | Y | 0001/26 | — | PARTIAL (doc fallback) |
| Returns/refunds | returns | returns | returns-store | sale_returns/refunds | adjust_stock | Y | Y | Y | 0025 | Gate3 | VERIFIED |
| PO + receive | purchasing | purchase-orders | po-store | purchases | receive_purchase | Y | Y | Y | 0001 | Gate3 | PARTIAL (JSON fallback) |
| Stocktake | stocktake | stocktake | stocktake-store | stocktakes | set_branch_stock | Y | Y | Y | 0024 | Gate3 | PARTIAL (JSON fallback) |
| Transfers | transfers | transfers | transfer-store | stock_transfers | adjust_stock | Y | Y | Y | 0024 | Gate3 | PARTIAL (JSON fallback) |
| Gateway payments | pay | payments/webhook | gateway-payments-store | **collections** | — | — | — | — | — | unit idempotency | **DUPLICATED / MUST REPLACE** |
| SQL payments tender | — | via sale | create_sale_internal | payments | create_sale_internal | Y | Y | Y | 0001 | — | VERIFIED |
| Storefront order | store | store/*/order | storefront-repo | sales+collections | storefront_create_order | Y | Y | Y | 0007+ | unit | PARTIAL |
| WhatsApp order | WA | whatsapp/webhook | whatsapp-durable | sales | whatsapp_* | Y | Y | Y | 0014 | signature | PARTIAL |
| Reporting | reports | reports/summary | inline | sales select | — | Y | — | — | — | Gate3 auth only | **PARTIAL / BROKEN math** |
| Audit UI | audit | audit | audit-logger | **collections** | — | — | — | — | — | Gate3 role | **DUPLICATED** |
| Audit SQL | — | RPC only | RPCs | audit_events | DEFINER insert | Y | Y | Y | 0001 | — | ORPHANED from UI |
| Licence/billing | billing | billing | licence-payment | app_documents | — | Y | — | — | 0006 | — | PARTIAL |
| HQ platform | HQ | hq/* | hq-repo | platform_settings+view | — | Y | — | — | 0015 | Gate3 | VERIFIED |
| Offline queue | POS | sales POST later | offline-queue | localStorage | — | — | — | — | — | — | **DEFERRED / MUST DISABLE** |
| Discount codes | commerce | discounts/validate | commerce | settings/docs | — | — | — | — | — | unit | PARTIAL (atomicity risk) |
| AI/Jarvis | AI | ai/* | ai-tools | reads sales | — | — | — | — | — | unit | PARTIAL |
| Verticals (restaurant etc.) | Y | collections APIs | recordStore | app_collections | — | Y | Y | Y | 0005 | unit | DOCUMENT / DEFERRED |

---

## P0 rows to close before Gate 4

1. POS card pending — BROKEN  
2. Audit UI vs SQL — DUPLICATED  
3. Gateway payments — DUPLICATED  
4. Reporting — PARTIAL/BROKEN  
5. Offline — DEFERRED (disable)  

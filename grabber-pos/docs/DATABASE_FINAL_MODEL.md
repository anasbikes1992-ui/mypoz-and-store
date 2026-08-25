# DATABASE FINAL MODEL (AS-IS + TARGET)

**Date:** 2026-08-25  
**Phase:** 1 Discovery  
**Rule:** Prefer existing tables; do not invent duplicates. Target changes via **0027+** only.

---

## 1. Identity (AS-IS — CANONICAL)

```text
organizations 1──* branches
organizations 1──* profiles
branches *──* users (branch_members)
```

| Entity | Table | Gap |
|--------|-------|-----|
| Org | organizations | OK |
| Profile/role | profiles.role | Permissions still in app_documents |
| Branch | branches | OK |
| Branch membership | branch_members | App underuses |
| Dedicated roles/permissions tables | — | MISSING (config doc today) |

---

## 2. Catalog (AS-IS — CANONICAL)

```text
organizations → categories, suppliers, products
products → product_barcodes, product_variants → variant_branch_stock
```

Brands: column `products.brand` (no brands table) — DOCUMENT as catalog attribute unless product requires entity table.

---

## 3. Inventory (AS-IS — CANONICAL + HARDEN)

```text
branch_stock (balance)
stock_movements (ledger)
stock_documents (typed docs)
stocktakes / stocktake_lines
stock_transfers / stock_transfer_lines
```

**Gaps:** movement `reason` often coarse (`adjustment`); transfer refs weak; no separate `stock_document_lines` (lines in jsonb on `stock_documents`).

**Target:** keep tables; tighten CHECK/enums + RPC reasons; no new parallel stock tables.

---

## 4. Commerce / POS (AS-IS)

```text
registers → shifts → shift_summaries
sales → sale_lines → payments (tender)
receipt_counters
```

**Gap:** no first-class `PENDING_PAYMENT` sale state machine for POS card in durable `create_sale` (explicit reject).

**Target (0029):** pending payment + payment_intent linkage without stock until PAID.

---

## 5. Returns (AS-IS — CANONICAL)

```text
sales → sale_returns → sale_return_lines
sale_returns → refunds → refund_lines
```

Harden: quantity ≤ sold, refund ≤ paid, no double post — constraints + tests.

---

## 6. Purchasing (AS-IS)

Tables named `purchases` / `purchase_lines` (not `purchase_orders`). **Do not create duplicate PO tables** — rename in docs/API only if needed; keep SQL names.

---

## 7. Storefront (AS-IS)

```text
storefronts
store_collections / store_collection_products
sales (ONLINE_STORE source) via storefront RPCs
boards: app_collections storefront-orders  ← TARGET migrate or formalize
```

---

## 8. Payments — TARGET MODEL (P0)

**AS-IS:** tender `payments` + gateway rows in `app_collections.gateway-payments`.

**TARGET (do not duplicate blindly):**

```text
payment_intents
payment_attempts
payment_events   UNIQUE (provider, provider_event_id)
payments         (settled tender / linked to sale)
```

Map existing gateway collection fields into these tables in **0028**. Keep `payments` for sale tenders if still used by RPC — extend rather than fork two “payment” meanings without docs.

---

## 9. Licensing — TARGET (later)

AS-IS: `app_documents` key `tenant` + view `reseller_licences`.  
TARGET: `licenses` / `subscriptions` / `invoices` — **after** payment domain; do not block P0 audit/payment.

---

## 10. WhatsApp — AS-IS

RPCs for order; conversations/messages in collections/documents.  
TARGET: SQL conversations/messages when messaging is certification-critical; else DOCUMENT-OK for Gate 4 core.

---

## 11. Audit — TARGET (P0)

**Sole table:** `audit_events`  
Extend columns if needed (before/after, correlation_id, actor_role) via **0027**.  
Remove collection writers after cutover.

---

## 12. Reporting — TARGET

Views/RPCs e.g. `report_sales_summary(org, branch, from, to)` — **0030**.  
No new fact tables required initially if aggregation views suffice.

---

## 13. Relationship integrity (verified FKs exist)

| Relationship | FK present |
|--------------|------------|
| org → branches/profiles/products/sales | Yes |
| sale → sale_lines / payments | Yes |
| sale → sale_returns | Yes |
| return → refunds | Yes |
| purchase → purchase_lines | Yes |
| transfer → lines; stocktake → lines | Yes |
| product → variants; variant → variant_branch_stock | Yes |

---

## 14. Explicit non-duplication list

Do **not** create: second products table, second sales table, parallel `purchase_orders` if `purchases` exists, parallel audit tables, parallel stock balance tables.

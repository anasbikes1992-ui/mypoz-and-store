# MyPoz Database Map

**Source of truth:** `grabber-pos/supabase/migrations/` and `grabber-pos/docs/DATA-MODEL.md`  
**ORM:** NOT FOUND (SQL + supabase-js)  
**Tenant key:** `org_id` → `organizations.id` (via `current_org_id()`)

---

## Entity diagram (canonical POS)

```
organizations
  ├─ profiles (auth.users)
  ├─ branches
  │    ├─ branch_members
  │    ├─ registers → shifts
  │    ├─ branch_stock → products
  │    ├─ purchases → purchase_lines
  │    └─ sales → sale_lines → payments
  ├─ products
  │    ├─ product_barcodes
  │    ├─ category_id → categories
  │    └─ supplier_id → suppliers
  ├─ stock_movements
  ├─ audit_events
  ├─ storefronts                 (0007, 1:1 org)
  ├─ store_collections           (0008 file present; apply status unknown)
  ├─ app_collections             (generic JSON records)
  ├─ app_documents               (generic JSON docs)
  └─ stock_documents             (GRN/return/damage headers)
```

---

## Tables

| Table | Purpose | Tenant Key | Important relationships | Used by | Status |
|---|---|---|---|---|---|
| `organizations` | Merchant tenant | `id` | parent of all | Auth, RLS, HQ | WORKING |
| `branches` | Location / store | `org_id` | stock, sales, registers | POS, storefront branch_id | WORKING |
| `profiles` | Staff user | `org_id` | `auth.users`, role enum | Auth, permissions | WORKING |
| `branch_members` | Staff ↔ branch | via branch.org_id | profiles, branches | POS access | WORKING |
| `products` | Catalog | `org_id` | category, supplier, barcodes, stock | POS + storefront | WORKING |
| `product_barcodes` | Alternate codes | `org_id` | product_id | Scanner | WORKING |
| `categories` | Product groups | `org_id` | parent_id | POS + storefront filters | WORKING |
| `suppliers` | Vendors | `org_id` | products, purchases | Purchasing | WORKING |
| `branch_stock` | Qty per location | branch → org | product_id, quantity, expire | Inventory, `create_sale` | WORKING |
| `stock_movements` | Qty ledger | `org_id` | product, branch, reason | Audit, sync | WORKING |
| `purchases` / `purchase_lines` | Stock in | `org_id` | supplier, products | GRN path | WORKING |
| `registers` / `shifts` | Drawer sessions | via branch | sales | POS register | WORKING |
| `sales` | Order/sale header | `org_id` | branch, lines, payments | POS + online (via RPC) | WORKING |
| `sale_lines` | Line items | via sale | product_id | POS + online | WORKING |
| `payments` | Tender splits | via sale | method, amount | POS + gateway | WORKING |
| `audit_events` | Action log | `org_id` | actor, entity | Admin audit | WORKING |
| `storefronts` | Public shop identity | `org_id` PK | slug, domain, branch_id | Storefront RPCs | WORKING |
| `app_collections` | Module records JSON | `org_id` | collection + entity_id | Customers, delivery, variants, web orders, … | WORKING |
| `app_documents` | Config JSON | `org_id` | key (settings, tenant, website, commerce) | Settings, CMS, licence | WORKING |
| `stock_documents` | Stock doc headers | `org_id` | adjust_stock | GRN/returns/damages | WORKING |
| `store_collections` | Merchandising collections | `org_id` | slug | 0008 only | UNKNOWN (file exists; may be unapplied) |

`app_settings` and `restaurant_orders` appear in 0005 then were folded into `app_documents` / `app_collections` in 0006.

---

## Spec entities vs reality

| Spec concept | Status |
|---|---|
| organizations / businesses | `organizations` EXISTS |
| users / memberships / roles | `profiles` + `branch_members` + `user_role` EXISTS (owner/manager/cashier only) |
| products | EXISTS |
| product variants | NOT FOUND as first-class SQL. Partial JSON collection `variants` |
| categories | EXISTS |
| brands | NOT FOUND as SQL table. JSON collection + `products.brand` text |
| collections (merchandising) | PARTIAL: 0008 `store_collections` + commerce JSON; not POS catalog driver |
| inventory / locations / stock movements | EXISTS (`branch_stock`, `branches`, `stock_movements`) |
| customers | NOT FOUND as SQL table. `app_collections['customers']` + separate storefront customers |
| carts / cart items | NOT FOUND in DB. Client memory + `localStorage` (`grabber-store-cart`) |
| orders / order items | `sales` / `sale_lines` EXISTS (POS-shaped, not Shopify order FSM) |
| payments / refunds | `payments` EXISTS. Refunds: void sale path; gateway `REFUNDED` status on adapter. No dedicated refunds table |
| discounts / promotions | NOT FOUND as tables. Per-line `max_discount` on products |
| media | `products.image_url` (0005). Files on disk `public/uploads/`. No media library table |
| reviews | NOT FOUND |
| addresses | NOT FOUND as table. Free-text on delivery orders / checkout payload |
| shipping / delivery | NOT FOUND as SQL. `app_collections['delivery-orders']` |
| stores / storefronts | `storefronts` EXISTS |
| themes / pages / CMS / navigation | NOT FOUND as SQL. JSON in `app_documents` (`website`, `commerce`) |
| settings | `app_documents['settings']` EXISTS |

---

## Product columns (0001 + 0007)

`sku`, `name`, `name_local`, `brand` (text), `category_id`, `supplier_id`, prices (`cost_price`, `sale_price`, `wholesale_price`), `max_discount`, `single_discount`, `reorder_level`, `warranty_months`, `is_active`, `image_url` (0005), `slug`, `description`, `online_visible`, `online_price` (0007).

Unique: `(org_id, sku)`, `(org_id, slug)`.

Stock: **not on products**. `branch_stock(branch_id, product_id, quantity)`.

---

## Sales / orders

`sales` fields: receipt_no, subtotal, discount_total, final_discount, service_charge, tax_total, total, payment_method (`cash|card|wholesale|mixed`), customer_name, customer_mobile, employee, cash_received, client_uuid, status (`completed|voided`).

**No `source` column** (`POS` / `ONLINE_STORE`). Online orders reuse `create_sale_internal` and also write `app_collections['storefront-orders']` with `source: storefront` on delivery/click-collect boards.

Minimum change for `ONLINE_STORE` source: add nullable `source` (or metadata) on `sales`, or keep using the JSON web-order record as the channel flag (already exists).

---

## RLS

Enabled on all tenant tables in `0003_rls.sql` plus `storefronts` in `0007`. Policies: `org_id = current_org_id()`. Sales/stock mutations are RPC-only (definer), client policies are read-oriented.

Public storefront uses SECURITY DEFINER RPCs that resolve org from `storefronts.slug`/`domain`, not from the shopper JWT (`0007_storefront.sql`).

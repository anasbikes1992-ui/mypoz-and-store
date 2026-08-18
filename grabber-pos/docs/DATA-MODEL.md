# Data Model

Postgres schema (Supabase). All tables are organization-scoped and protected by
row-level security. Source of truth: `supabase/migrations/`.

## Entity map

```
organizations
 └─ branches
     ├─ branch_members ── profiles (auth.users)
     ├─ registers ── shifts
     ├─ branch_stock ── products
     ├─ purchases ── purchase_lines
     └─ sales ── sale_lines
                └─ payments
products ─ product_barcodes
products ─ categories, suppliers
stock_movements   (append-only ledger)
audit_events      (append-only ledger)
```

## Core tables

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `organizations` | Tenant | `id`, `slug` |
| `branches` | Store within a tenant | `org_id`, `code`, `currency` |
| `profiles` | User (1:1 with `auth.users`) | `org_id`, `role` (`owner`/`manager`/`cashier`) |
| `branch_members` | User ↔ branch access | `branch_id`, `user_id` |
| `products` | Catalog item | `sku`, `sale_price`, `wholesale_price`, `max_discount`, `single_discount`, `reorder_level` |
| `product_barcodes` | Many barcodes per product | `barcode` (unique per org) |
| `categories` / `suppliers` | Reference | `name` |
| `branch_stock` | Per-branch quantity + expiry | `quantity`, `expire_date` |
| `stock_movements` | Every quantity change | `delta`, `balance_after`, `reason`, `reference_id` |
| `purchases` / `purchase_lines` | Stock-in | `status`, `cost_price` |
| `registers` / `shifts` | POS terminals + cash drawer sessions | `opening_float`, `closing_amount` |
| `sales` | Completed sale header | `receipt_no`, `total`, `payment_method`, `client_uuid` |
| `sale_lines` | Sale detail | `unit_price`, `quantity`, `discount`, `line_total` |
| `payments` | Split-payment support | `method`, `amount` |
| `audit_events` | Who did what | `action`, `entity`, `metadata` |

## Enums

- `user_role`: `owner`, `manager`, `cashier`
- `payment_method`: `cash`, `card`, `wholesale`, `mixed`
- `sale_status`: `completed`, `voided`
- `movement_reason`: `sale`, `purchase`, `adjustment`, `return`, `transfer_in`, `transfer_out`, `opening`
- `purchase_status`: `draft`, `received`, `cancelled`
- `shift_status`: `open`, `closed`

## Money & precision

All money is `numeric(12,2)`; quantities are `numeric(12,3)` to allow weighed
goods. Never use floats for currency.

## RPCs (the write/read API)

| Function | Kind | Notes |
|----------|------|-------|
| `create_sale(payload jsonb)` | write | Atomic sale post. Validates prices/discounts, checks stock (fail-closed), decrements inventory, writes movements + audit. Idempotent on `client_uuid`. |
| `receive_purchase(id)` | write | Adds purchased stock, writes movements, marks received. |
| `adjust_stock(branch, product, delta, note)` | write | Manager+; manual correction with movement audit. |
| `catalog(branch, search, category, page, size)` | read | Paged, filtered catalog with category histogram, per-branch stock. |
| `product_by_barcode(branch, code)` | read | Exact barcode → product (scanner path). |
| `inventory_stats(branch)` | read | Product count, stock value, low-stock, expired. |
| `current_org_id()` / `current_role()` | helper | Resolve caller identity for RLS. |

## Application data tables (0005 / 0006)

Beyond the core POS schema, two generic tables back every module store. Both are
org-scoped by RLS with `org_id default current_org_id()`, so no application code
passes a tenant id.

| Table | Key | Holds |
|-------|-----|-------|
| `app_collections` | `(org_id, collection, entity_id)` | One row per record: delivery orders, repair/service jobs, room & rent bookings, hire-purchase agreements, purchase orders, play sessions, reload log, live restaurant orders, and every simple CRUD collection (customers, employees, suppliers, clients, …). |
| `app_documents` | `(org_id, key)` | One row per single document: `settings` (business/receipt/tax/printers) and `tenant` (white-label brand + licence). |
| `stock_documents` | `id` | GRN / return / damage headers; quantities move via `adjust_stock`, never by direct write. |

`reseller_licences` (a definer view, service-role only) rolls licences, branch and
user counts, and sales totals up across organizations for the operator. RLS keeps
tenants confined to their own row, so this view is the only cross-client read.

Migration 0006 consolidated onto these: `app_settings` became
`app_documents['settings']` and `restaurant_orders` became
`app_collections['restaurant-orders']`. Neither had shipped to a live project, so
no data migration was needed.

## Storefront (0007)

Migration `0007_storefront` adds public-shop support: a `storefronts` table (slug /
domain), product fields for online visibility / slug / online price, and
SECURITY DEFINER RPCs for anonymous catalog + order placement. Website CMS config
also lives in `app_documents` (`key = 'website'`). See
[CUSTOMER-STOREFRONT.md](CUSTOMER-STOREFRONT.md) and [PRODUCTION.md](PRODUCTION.md).

## Row-Level Security

Every tenant table has RLS enabled. Summary:

- **Read**: rows where `org_id = current_org_id()`.
- **Catalog writes** (products, categories, suppliers, purchases): `owner`/`manager`.
- **User management** (profiles): `owner` only.
- **Sales & stock writes**: not allowed via direct table access — they flow only
  through the SECURITY DEFINER RPCs, which enforce their own org checks. Tables
  expose read-only policies to clients.
- `audit_events`: read-only to clients; written by RPCs.

## Idempotency (offline safety)

`sales.client_uuid` is unique per org. The mobile app generates a UUID per sale
before sending; if a queued sale is retried after a crash or timeout, the RPC
detects the existing `client_uuid` and returns the original sale instead of
double-posting.

## Legacy mapping

The old Excel columns map onto `products` / `branch_stock` as follows:

| Legacy column | New location |
|---------------|--------------|
| Name / Product ENG, Product SIN | `products.name`, `products.name_local` |
| Barcode(s) (space/pipe separated) | `product_barcodes.barcode` (one row each) |
| Cost / Sale / Wholesale price | `products.cost_price` / `sale_price` / `wholesale_price` |
| Max / Single discount | `products.max_discount` / `single_discount` |
| Quantity | `branch_stock.quantity` |
| Category, Supplier | `categories`, `suppliers` |
| Expire date, Warranty months | `branch_stock.expire_date`, `products.warranty_months` |

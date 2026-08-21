# Database map (migrations 0001–0018)

Short index of `supabase/migrations/`. Detailed columns and RPC contracts live in
[DATA-MODEL.md](DATA-MODEL.md). This file answers: *what did each migration add?*

> Note: [GO_TO_MARKET.md](GO_TO_MARKET.md) mentions later hardening (0019+) that
> may exist on the remote project; **this repo folder currently ends at `0018`**.
> Always `list_migrations` / Dashboard before assuming remote = git.

---

## Migration index

| File | Adds |
|------|------|
| `0001_schema.sql` | Core multi-tenant schema: `organizations`, `branches`, `profiles` (`owner`/`manager`/`cashier`), `branch_members`, catalog (`products`, barcodes, categories, suppliers), `branch_stock`, `stock_movements`, purchases, registers/shifts, `sales`/`sale_lines`/`payments`, `audit_events`. Money `numeric(12,2)`. |
| `0002_functions.sql` | `current_org_id()`, role helpers, **`create_sale`** and other SECURITY DEFINER write paths, stock/purchase helpers. |
| `0003_rls.sql` | Enable RLS + org policies; sales/stock client policies read-oriented; mutations via DEFINER. |
| `0004_catalog_rpc.sql` | Read RPCs: `catalog`, `product_by_barcode`, `inventory_stats` (app-shaped JSON). |
| `0005_app_data.sql` | Early module tables (later consolidated). |
| `0006_app_documents.sql` | **`app_collections`** + **`app_documents`** (+ `stock_documents`); runtime seam for module stores. `reseller_licences` view (service-role). |
| `0007_storefront.sql` | `storefronts`, online product fields, anonymous DEFINER catalog/order RPCs; website CMS in `app_documents`. |
| `0008_commerce_cloud.sql` | Store presentation fields on existing POS data (no duplicate catalog). |
| `0009_commerce_core.sql` | `sale_source` enum on canonical `sales` (web / POS / etc.). |
| `0010_product_commerce.sql` | Shopify-style product fields (`compare_at_price`, tags, …). |
| `0010b_product_commerce_columns.sql` | Additive column fix without breaking `storefront_catalog` signature. |
| `0011_product_variants.sql` | `product_variants` (+ stock linkage). |
| `0012_smart_collections.sql` | Smart/manual `store_collections` rules. |
| `0013_variant_sales_and_fulfillment.sql` | Variant-aware sales + fulfillment; still one ledger. |
| `0014_whatsapp_orders.sql` | WA webhook tenant resolve by `phone_number_id`; sales through internal create with `source = WHATSAPP`. |
| `0015_platform_settings.sql` | `platform_settings` — HQ config, **service_role only** (no tenant RLS). |
| `0016_media_and_storefront_discount.sql` | Media bucket paths; storefront discount stamp into sale internal. |
| `0017_storefront_public_documents.sql` | Public RPCs to read theme/commerce docs by storefront host/slug (anonymous). |
| `0018_ux_events.sql` | `storefront_ingest_ux_event` — capped public UX events into tenant collections. |

---

## Table groups (mental model)

```
Tenant spine
  organizations → branches → profiles / branch_members / registers

Catalog & stock
  products → product_barcodes / product_variants
  categories, suppliers
  branch_stock, variant_branch_stock
  stock_movements (append-only)
  stock_documents + adjust_stock RPC

Commerce ledger
  sales → sale_lines → payments
  (sources: POS, storefront, WhatsApp, …)

Module blob store
  app_collections (keyed records)
  app_documents (settings, tenant, website, whatsapp, …)

Public shop
  storefronts, store_collections, media
  DEFINER RPCs for anonymous catalog/order/docs

Platform
  platform_settings (HQ)
  reseller_licences (view)
```

---

## RPC clusters

| Cluster | Examples | Who calls |
|---------|----------|-----------|
| Identity helpers | `current_org_id`, `current_user_role` | RLS + app |
| POS writes | `create_sale`, `adjust_stock`, `receive_purchase` | Authenticated POS / servers |
| Catalog reads | `catalog`, `product_by_barcode`, `inventory_stats` | POS apps |
| Storefront public | catalog/order/document helpers from `0007`/`0017` | Anonymous shop |
| WhatsApp | phone_number_id → org + sale internal (`0014`) | Webhook (service) |
| UX | `storefront_ingest_ux_event` (`0018`) | Public beacon |

---

## RLS summary

1. **Tenant tables:** RLS on; `org_id = current_org_id()` (or branch→org exists).
2. **Privileged writes:** role checks (`owner`/`manager`) on catalog/profiles.
3. **Ledger writes:** not via table INSERT from clients — DEFINER RPCs only.
4. **HQ / platform:** `platform_settings` and cross-org views are service-role.
5. **Anonymous store:** never uses staff JWT; uses slug-scoped DEFINER functions.

See [SECURITY_AND_AUTH.md](SECURITY_AND_AUTH.md) for proxy vs RLS boundaries.

---

## App ↔ DB mapping

| App seam | Durable target |
|----------|----------------|
| `getRepository()` / `SupabaseRepository` | Core tables + `create_sale` / catalog RPCs |
| `recordStore(collection)` | `app_collections` |
| `docStore(key)` | `app_documents` |
| Stock documents store | `stock_documents` + `adjust_stock` |
| HQ platform store | `platform_settings` or local `data/hq-platform.json` |
| Storefront anonymous | DEFINER RPCs + public document readers |

Demo mode (no Supabase): JSON under `data/` (gitignored runtime).

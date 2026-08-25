# RLS Matrix

## Scope
This matrix tracks the verified row-level security posture of the current Supabase schema and highlights where security depends on RPCs or still needs direct verification.

## Core Tenant Tables

| Table | RLS | Policy status | Write path |
| --- | --- | --- | --- |
| `organizations` | Enabled | `org_self` verified | Read-only to tenant via policy |
| `branches` | Enabled | `branch_read`, `branch_write` verified | Direct writes for owner/manager |
| `profiles` | Enabled | `profile_read`, `profile_write` verified | Direct writes for owner only |
| `branch_members` | Enabled | `branch_members_read` verified | Limited direct access |
| `suppliers` | Enabled | `suppliers_rw` verified | Direct org-scoped |
| `categories` | Enabled | `categories_rw` verified | Direct org-scoped |
| `products` | Enabled | `products_read`, `products_write` verified | Direct owner/manager writes |
| `product_barcodes` | Enabled | `barcodes_rw` verified | Direct org-scoped |

## Inventory And Commerce

| Table | RLS | Policy status | Authoritative write path |
| --- | --- | --- | --- |
| `branch_stock` | Enabled | Read-only policy verified | `create_sale`, `adjust_stock`, `receive_purchase`, `set_branch_stock` |
| `stock_movements` | Enabled | Read-only policy verified | `create_sale`, `adjust_stock`, `receive_purchase`, `set_branch_stock` |
| `purchases` | Enabled | `purchases_rw` verified | App/runtime and `receive_purchase()` |
| `purchase_lines` | Enabled | `purchase_lines_rw` verified | App/runtime and `receive_purchase()` |
| `registers` | Enabled | Read policy verified | Mixed; app runtime still doc-backed |
| `shifts` | Enabled | `shifts_rw` verified | Mixed; app runtime still doc-backed |
| `sales` | Enabled | Read-only policy verified | `create_sale()` only |
| `sale_lines` | Enabled | Read-only policy verified | `create_sale()` only |
| `payments` | Enabled | Read-only policy verified | `create_sale()` only |
| `audit_events` | Enabled | Read-only policy verified | SQL audit writes from RPC path |

## Generic Runtime Tables

| Table | RLS | Policy status | Notes |
| --- | --- | --- | --- |
| `app_collections` | Enabled | `app_collections_rw` verified | Backing store for many module records; still overused for critical domains |
| `app_documents` | Enabled | `app_documents_rw` verified | Acceptable for intentional config/document domains |
| `stock_documents` | Enabled | `stock_documents_rw` verified | Header/doc table only; stock effect must still go through ledger RPCs |
| `restaurant_orders` | Enabled | `restaurant_orders_rw` verified | Vertical-specific |

## Functions And Execute Grants

| Function | Access model | Status |
| --- | --- | --- |
| `current_org_id()` | SECURITY DEFINER helper | Verified |
| `current_user_role()` | SECURITY DEFINER helper | Verified |
| `create_sale(jsonb)` | Authenticated only, revoked from `anon/public` | Verified in `0023_launch_rls_hardening.sql` |
| `adjust_stock(uuid, uuid, numeric, text)` | Authenticated only, revoked from `anon/public` | Verified |
| `receive_purchase(uuid)` | Authenticated only, revoked from `anon/public` | Verified |
| `set_branch_stock(uuid, uuid, numeric, text)` | Authenticated only | Verified |
| `next_receipt_no(uuid)` | Authenticated only | Verified; function body must align with atomic counter migration |
| `catalog(...)` | Authenticated only | Verified |
| `product_by_barcode(...)` | Authenticated only | Verified |
| `inventory_stats(uuid)` | Authenticated only | Verified |
| `get_sale(uuid)` | Authenticated only | Verified |
| `storefront_by_host(text, text)` | SECURITY DEFINER, not directly exposed to tenants | Verified |

## Service-Role Risk Areas

These flows bypass RLS by design and therefore require explicit server-side tenant validation:

- `src/lib/server/storefront-orders-store.ts`
- `src/lib/server/storefront-repo.ts`
- `src/lib/server/gateway-payments-store.ts`
- `src/lib/server/complete-pending-sale.ts`
- `src/lib/server/hq-repo.ts`
- `src/lib/server/hq-monitor.ts`
- `src/lib/server/hq-tenant-ops.ts`

## New Tables (0024–0026)

| Table | RLS | Notes |
| --- | --- | --- |
| `stocktakes` / `stocktake_lines` | Enabled | Posted via `set_branch_stock` |
| `stock_transfers` / `stock_transfer_lines` | Enabled | Approve via `adjust_stock` out/in |
| `sale_returns` / `sale_return_lines` | Enabled | Linked to `sales` / `sale_lines` |
| `refunds` / `refund_lines` | Enabled | Linked to returns |
| `shift_summaries` | Enabled | Complements SQL `shifts` |

## Functions Added

| Function | Access |
| --- | --- |
| `void_sale(uuid, text)` | Authenticated; restores stock + audits |

## Still Requires Live DB Replay

| Area | Reason |
| --- | --- |
| Apply `0024`–`0026` on empty + current project | Static SQL + unit tests done; live `supabase db push` is an ops step |
| Cross-tenant denial under real JWTs | Covered by RLS policy presence tests; runtime JWT suite needs staging |

## Release Rule

Critical domains are only production-safe when all of the following are true:

1. Table exists in Postgres.
2. RLS is enabled and verified.
3. Tenant writes do not rely on local JSON or blob fallback.
4. Mutations happen through explicit route auth and trusted server-side tenant resolution.
5. Tests prove cross-tenant denial and migration replayability.

# RLS MATRIX

**Date:** 2026-08-25  
**Live policies:** 38  
**All 37 tables:** RLS enabled  

Policy cmds from live `pg_policies`. `current_org_id()` is the tenant predicate used by DEFINER helpers and policies (migration 0002/0003/0019+).

| Table | Tenant scoped | RLS | SELECT | INSERT | UPDATE | DELETE | Service role | Notes |
|-------|---------------|-----|--------|--------|--------|--------|--------------|-------|
| organizations | Y | Y | org_self | — | — | — | HQ provision | No tenant write |
| profiles | Y | Y | Y | ALL write | ALL | ALL | password reset | |
| branches | Y | Y | Y | ALL | ALL | ALL | provision | |
| branch_members | Y | Y | Y | — | — | — | possible | SELECT-only |
| categories | Y | Y | ALL | ALL | ALL | ALL | rare | |
| suppliers | Y | Y | ALL | ALL | ALL | ALL | | |
| products | Y | Y | read+write | write | write | write | | |
| product_barcodes | Y | Y | ALL | ALL | ALL | ALL | | |
| product_variants | Y | Y | ALL | ALL | ALL | ALL | | |
| variant_branch_stock | Y | Y | ALL | ALL | ALL | ALL | | |
| branch_stock | Y | Y | Y | — | — | — | via RPC | Mutate via adjust/set |
| stock_movements | Y | Y | Y | — | — | — | via RPC | Append via RPC |
| purchases | Y | Y | ALL | ALL | ALL | ALL | | |
| purchase_lines | Y | Y | ALL | ALL | ALL | ALL | | |
| registers | Y | Y | Y | — | — | — | provision | |
| shifts | Y | Y | ALL | ALL | ALL | ALL | | |
| shift_summaries | Y | Y | ALL | ALL | ALL | ALL | | |
| sales | Y | Y | Y | — | — | — | storefront SR | create via RPC |
| sale_lines | Y | Y | Y | — | — | — | via RPC | |
| payments | Y | Y | Y | — | — | — | via RPC | Tender only |
| audit_events | Y | Y | Y | — | — | — | via RPC | Append-only intent |
| receipt_counters | Y | Y | — | — | — | — | via RPC | |
| app_collections | Y | Y | ALL | ALL | ALL | ALL | gateway/WA | Dual-path bag |
| app_documents | Y | Y | ALL | ALL | ALL | ALL | HQ/WA | |
| stock_documents | Y | Y | ALL | ALL | ALL | ALL | | |
| storefronts | Y | Y | ALL | ALL | ALL | ALL | provision | |
| store_collections | Y | Y | ALL | ALL | ALL | ALL | | |
| store_collection_products | Y | Y | ALL | ALL | ALL | ALL | | |
| platform_settings | Platform | Y | — | — | — | — | HQ only | No tenant policy write |
| stocktakes | Y | Y | ALL | ALL | ALL | ALL | | |
| stocktake_lines | Y | Y | ALL | ALL | ALL | ALL | | |
| stock_transfers | Y | Y | ALL | ALL | ALL | ALL | | |
| stock_transfer_lines | Y | Y | ALL | ALL | ALL | ALL | | |
| sale_returns | Y | Y | ALL | ALL | ALL | ALL | | |
| sale_return_lines | Y | Y | ALL | ALL | ALL | ALL | | |
| refunds | Y | Y | ALL | ALL | ALL | ALL | | |
| refund_lines | Y | Y | ALL | ALL | ALL | ALL | | |

**View:** `reseller_licences` — revoked from anon/authenticated; service-role read (0006).

### Policy gaps to address in 0027+

- Explicit deny UPDATE/DELETE on `audit_events` for all non-definer (today SELECT-only — good; document forever).
- Payment domain tables will need SELECT for tenant + INSERT only via DEFINER/service.
- Do not grant client INSERT on `branch_stock` / `stock_movements`.

### Client trust rule

Never trust `org_id` / `role` / `actor` from request body. Session + `current_org_id()` / GMS checks only.

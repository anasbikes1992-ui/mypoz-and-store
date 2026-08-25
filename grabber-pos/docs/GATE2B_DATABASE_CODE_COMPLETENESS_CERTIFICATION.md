# Gate 2B — Database / Code Completeness Certification

**Project:** Grabber POS / MyPoz (`veavfkjgtkbnggukzjds`)  
**Production commit audited:** `530b65b`  
**Audit date:** 2026-08-25  
**Mode:** READ-ONLY (no migrations created, no schema changes, no deletions, Gate 4 not started)

**Evidence sources:**
- Live schema via Supabase SQL (`37` tables, `38` policies, `79` FKs, `85` indexes, `7` triggers, `62` public functions including extension helpers)
- Repo migrations `supabase/migrations/0001_schema.sql` … `0026_register_shift_summaries.sql` (27 files; includes `0010b`)
- Code census under `src/` (`.from` / `.rpc` / dual-path stores / `src/app/api/**/route.ts`)
- Tests under `src/**/__tests__`, `e2e/`
- Prior gates: Gate 2A PASS (`docs/GATE2A_MIGRATION_REPLAY_CERTIFICATION.md`), Gate 3 PASS 79/79 (`docs/GATE3_SECURITY_CERTIFICATION_FINAL.md`)

---

## Executive Verdict

**PASS WITH P0/P1 REMEDIATION**

### Primary question (precise answer)

> Does the current MyPoz codebase have every required UI → API → auth → authorization → service → repository/store → table → RPC → FK → index → RLS → migration → test for the production system?

**No.**

The **durable core** for tenancy, POS sale/void, catalog, purchasing receive, stock ledger RPCs, returns/refunds tables, stocktake/transfer tables, storefront RPCs, and WhatsApp order RPCs **exists** and **replays cleanly** (Gate 2A). Production security gating for the hardened surface **passed** (Gate 3).

What is **not** complete:

1. Not every UI feature maps to a first-class relational table (many verticals are `app_collections` / `app_documents` document stores).
2. Several durable SQL objects are **under-consumed or duplicated** by application stores (notably `audit_events` vs collection audit, `payments` vs gateway ledger).
3. Authoritative reporting is **PARTIAL** (server loads rows then aggregates in Node; sales list hard-capped).
4. Card/pending POS completion on durable `create_sale` is **explicitly unsupported**; storefront uses a separate service-role path.
5. Offline localStorage queue is **not** a production-safe sync architecture (**DEFERRED**).
6. Business-critical flows largely lack **live DB integration** tests (mocks/static SQL string tests dominate).

Flags used below: `MISSING` | `BROKEN` | `PARTIAL` | `LOCAL-ONLY` | `SUPABASE-ONLY` | `UNUSED` | `DUPLICATED` | `UNVERIFIED` | `DEFERRED`.

---

## Database Inventory

### Live replay counts (Gate 2A + re-verified 2026-08-25)

| Object | Count | Notes |
|--------|------:|-------|
| Tables (`public`, `relkind=r`) | 37 | All RLS enabled |
| Views | 1 | `reseller_licences` (not a table) |
| Policies | 38 | |
| Foreign keys | 79 | |
| Indexes | 85 | |
| Triggers (user) | 7 | `*_touch` / `products_updated_at` |
| Functions (`public`) | 62 | Includes `pg_trgm` helpers + `gate3_as_user` |
| App RPCs of interest | ~30 | See RPC Inventory |
| Migrations applied | 27 | `0001`…`0026` incl. `0010b` |

### Tables (live columns / PK / FK / RLS / migration introduced)

| Table | Purpose | Migration | PK | FK# | RLS | Mutations |
|-------|---------|-----------|----|----:|-----|-----------|
| `organizations` | Tenant root | 0001 | `id` | 0 | Y | Service / HQ; SELECT `org_self` |
| `branches` | Stores | 0001 | `id` | 1 | Y | RLS write |
| `profiles` | Users ↔ org/role | 0001 | `id` | 2 | Y | RLS write |
| `branch_members` | Branch membership | 0001 | `(branch_id,user_id)` | 2 | Y | SELECT-only policy |
| `suppliers` | Purchasing | 0001 | `id` | 1 | Y | RLS ALL |
| `categories` | Catalog | 0001 | `id` | 2 | Y | RLS ALL |
| `products` | Catalog | 0001+commerce cols | `id` | 3 | Y | RLS read+write |
| `product_barcodes` | Scan codes | 0001 | `id` | 2 | Y | RLS ALL |
| `branch_stock` | On-hand qty | 0001 | `(branch_id,product_id)` | 2 | Y | SELECT; mutate via RPC |
| `stock_movements` | Inventory ledger | 0001 | `id` | 4 | Y | SELECT; mutate via RPC |
| `purchases` | PO headers | 0001 | `id` | 4 | Y | RLS ALL |
| `purchase_lines` | PO lines | 0001 | `id` | 2 | Y | RLS ALL |
| `registers` | Cash drawers | 0001 | `id` | 1 | Y | SELECT-only |
| `shifts` | Open/close | 0001 | `id` | 2 | Y | RLS ALL |
| `sales` | Sale headers | 0001+commerce | `id` | 5 | Y | SELECT; create via RPC |
| `sale_lines` | Sale lines | 0001+variants | `id` | 3 | Y | SELECT; via RPC |
| `payments` | Tender rows on sale | 0001 | `id` | 1 | Y | SELECT; insert via `create_sale_internal` |
| `audit_events` | Immutable SQL audit | 0001 | `id` | 2 | Y | SELECT; insert via RPC DEFINER |
| `app_collections` | Document entity store | 0005 | `(org_id,collection,entity_id)` | 1 | Y | RLS ALL |
| `app_documents` | Document config store | 0006 | `(org_id,key)` | 1 | Y | RLS ALL |
| `stock_documents` | Damage/adj docs | 0005 | `id` | 3 | Y | RLS ALL |
| `storefronts` | Online store config | 0007 | `org_id` | 2 | Y | RLS ALL |
| `store_collections` | Merchandising | 0008+0012 | `id` | 1 | Y | RLS ALL |
| `store_collection_products` | Manual collection SKUs | 0012 | `(collection_id,product_id)` | 2 | Y | RLS ALL |
| `product_variants` | Variants | 0011 | `id` | 2 | Y | RLS ALL |
| `variant_branch_stock` | Variant qty | 0011 | `(branch_id,variant_id)` | 2 | Y | RLS ALL |
| `platform_settings` | HQ platform KV | 0015 | `key` | 0 | Y | No tenant write policy (service) |
| `receipt_counters` | Daily receipt seq | 0021 | `(branch_id,day)` | 1 | Y | No write policy (RPC) |
| `stocktakes` | Stocktake header | 0024 | `id` | 3 | Y | RLS ALL |
| `stocktake_lines` | Stocktake lines | 0024 | `id` | 2 | Y | RLS ALL |
| `stock_transfers` | Transfer header | 0024 | `id` | 3 | Y | RLS ALL |
| `stock_transfer_lines` | Transfer lines | 0024 | `id` | 2 | Y | RLS ALL |
| `sale_returns` | Returns | 0025 | `id` | 4 | Y | RLS ALL |
| `sale_return_lines` | Return lines | 0025 | `id` | 3 | Y | RLS ALL |
| `refunds` | Refund header | 0025 | `id` | 4 | Y | RLS ALL |
| `refund_lines` | Refund lines | 0025 | `id` | 2 | Y | RLS ALL |
| `shift_summaries` | Z/X summary JSON | 0026 | `shift_id` | 2 | Y | RLS ALL |

### Intentionally dropped after introduce (migration evidence)

| Object | Introduced | Dropped | Replacement |
|--------|------------|---------|-------------|
| `app_settings` | 0005 | 0006 | `app_documents` key `settings` |
| `restaurant_orders` | 0005 | 0006 | `app_collections` collection `restaurant-orders` |

Live check: both absent (`to_regclass` false). **Not MISSING** — by design.

### View

| View | Migration | Purpose | Consumers |
|------|-----------|---------|-----------|
| `reseller_licences` | 0006 | Cross-tenant licence roll-up (SECURITY INVOKER false; revoke anon/authenticated) | `src/lib/server/hq-repo.ts` L151; `hq-monitor.ts` L317 |

### Tables with SELECT-only RLS (mutations expected via SECURITY DEFINER RPC)

Evidence: live policy inventory — no INSERT/UPDATE/DELETE/ALL for:

`audit_events`, `branch_members`, `branch_stock`, `organizations`, `payments`, `platform_settings`, `receipt_counters`, `registers`, `sale_lines`, `sales`, `stock_movements`

**Design:** POS/ledger integrity via RPC. Application direct writes to these are blocked by RLS for normal sessions.

---

## Migration Inventory

| File | Role |
|------|------|
| 0001_schema | Core org/branch/catalog/stock/sales/payments/audit |
| 0002_functions | `create_sale`, `adjust_stock`, `receive_purchase`, `next_receipt_no`, helpers |
| 0003_rls | Baseline RLS |
| 0004_catalog_rpc | `catalog`, `product_by_barcode`, `inventory_stats` |
| 0005_app_data | Document stores + stock_documents (+ later-dropped tables) |
| 0006_app_documents | Documents + `reseller_licences` view; drop legacy tables |
| 0007_storefront | Storefronts + public RPCs + `create_sale_internal` path |
| 0008_commerce_cloud | Collections bootstrap |
| 0009_commerce_core | Commerce sale fields / audit |
| 0010 / 0010b | Product commerce columns + `storefront_catalog` signature fix |
| 0011_product_variants | Variants + stock |
| 0012_smart_collections | Rules + collection products |
| 0013_variant_sales_and_fulfillment | Variant lines + fulfillment RPC |
| 0014_whatsapp_orders | `whatsapp_resolve_org`, `whatsapp_create_order` |
| 0015_platform_settings | HQ settings table |
| 0016_media_and_storefront_discount | Media/discount storefront |
| 0017_storefront_public_documents | `storefront_documents` |
| 0018_ux_events | `storefront_ingest_ux_event` |
| 0019_rls_select_wrappers | SELECT wrappers / policy refresh |
| 0020_collection_matches_stable | Stable collection matcher |
| 0021_receipt_indexes_domain_stock | Receipt counters, `set_branch_stock`, domain indexes, `hq_provision_tenant` |
| 0022_wholesale_tiers | Wholesale/VIP pricing |
| 0023_launch_rls_hardening | Launch RLS |
| 0024_p0_auth_and_ops_hardening | `void_sale`, stocktake/transfer tables |
| 0025_returns_refunds | Return/refund tables + policies |
| 0026_register_shift_summaries | `shift_summaries` |

**Migration ↔ replay:** Gate 2A certified clean one-shot apply. Re-query 2026-08-25 matches expected 37 tables and migration name list.

---

## RPC Inventory

### Application RPCs (SECURITY DEFINER unless noted)

| Function | Migration (introduced/last major) | Callers (FILE) | Tenant isolation | Tests |
|----------|-----------------------------------|----------------|------------------|-------|
| `current_org_id` / `current_user_role` | 0002 | Used inside other RPCs/RLS | Session profile | Static migration tests |
| `create_sale` | 0002+ | `repositories/supabase.ts` L103 | DEFINER + org | `money-path.test.ts` (payload only) |
| `create_sale_internal` | 0007+ | Storefront / service paths | DEFINER | UNVERIFIED live concurrency |
| `void_sale` | 0024 | `repositories/supabase.ts` L149; `sales/[id]/void` | DEFINER + audit insert | `auth-rls-coverage.test.ts` (string) |
| `next_receipt_no` | 0002→0021 | Inside sale RPCs | Counter table | migration-batch |
| `adjust_stock` | 0002 | returns/transfer/product-admin/stock-store | DEFINER; writes `stock_movements` reason `adjustment` | UNVERIFIED integration |
| `set_branch_stock` | 0021 | `stocktake-store.ts` post | DEFINER + movements | UNVERIFIED integration |
| `receive_purchase` | 0002 | `po-store.ts` L190 | DEFINER + movements | UNVERIFIED integration |
| `catalog` / `product_by_barcode` / `inventory_stats` | 0004 | SupabaseRepository / product-admin | DEFINER | Unit/mocks |
| `get_sale` | 0002 | Limited | DEFINER | UNVERIFIED app callers |
| `storefront_*` family | 0007–0018 | `storefront-repo.ts`, public docs, UX | DEFINER anon-capable | commerce unit tests |
| `storefront_create_order` | 0007+ | storefront + `complete-pending-sale.ts` L166 | DEFINER | webhook-idempotency (logic only) |
| `update_sale_fulfillment` | 0013 | `commerce/orders/[id]/fulfill` | DEFINER | UNVERIFIED |
| `whatsapp_resolve_org` / `whatsapp_create_order` | 0014 | `whatsapp-durable.ts` | DEFINER | signature/unit only |
| `hq_provision_tenant` | 0021 | HQ provisioning path | DEFINER | UNVERIFIED |
| `collection_matches_rules` | 0012/0020 | INVOKER helper | — | collections-engine tests |
| `product_json` | 0004/0022 | INVOKER helper | — | — |
| `gate3_as_user` | **not in repo migrations** | Gate 3 cert tooling | DEFINER | **UNUSED by app; cleanup candidate** |

### `adjust_stock` ledger evidence (live `pg_get_functiondef`)

- Updates `branch_stock`
- Inserts `stock_movements` (`reason='adjustment'`, `balance_after`, `created_by`)
- Blocks cashiers via `current_user_role()`

### Grants / search_path

Critical DEFINER functions use `SET search_path TO 'public'` (verified on `adjust_stock`). Full grant matrix for all 62 functions: **UNVERIFIED line-by-line in this audit** (Gate 3 exercised authz at HTTP layer).

---

## RLS Inventory

| Pattern | Tables | Evidence |
|---------|--------|----------|
| ALL org-scoped | categories, products, purchases, returns, stocktakes, transfers, app_* , storefronts, … | `pg_policies` |
| SELECT + RPC write | sales, sale_lines, payments, branch_stock, stock_movements, audit_events, registers, receipt_counters | policies + RPC defs |
| SELECT org_self | organizations | policy `org_self` |
| Platform service | platform_settings, reseller_licences view | revoke/service role |

**INSERT/UPDATE/DELETE policy presence:** where listed as SELECT-only above, client mutations must go through DEFINER RPCs — **intentional**, not MISSING policy.

---

## API Inventory

**Census:** `102` `src/app/api/**/route.ts` files.

| Auth class | Count | Meaning |
|------------|------:|---------|
| PUBLIC (allowlisted prefixes) | 14 | store/*, payment webhook, WA webhook, health, login, forgot-password, waf-deny |
| STRONG (session/GMS/repo helpers) | 45 | Explicit `requireTenantSession` / `requireGmsAdmin` / `getRepository` / … |
| INDIRECT (resolveDb / *-store / docStore) | 41 | Relies on store + RLS when session exists |
| WEAK (no strong/medium markers in file text) | 2 | See below |

### Weak routes (evidence)

| Route | Methods | Finding | Flag |
|-------|---------|---------|------|
| `api/backup/route.ts` | GET | Calls `dumpSignedInOrg()` which throws `"Unauthorized"` internally — auth not visible in route file | `PARTIAL` |
| `api/products/export/route.ts` | GET | Calls `exportProductsBuffer()` only — session gate must be inside helper | `UNVERIFIED` at route layer |

### Representative critical routes

| Route | Auth | DB access | Store/RPC | Idempotency | Tests |
|-------|------|-----------|-----------|-------------|-------|
| `sales/route.ts` | getRepository | sales + `create_sale` | SupabaseRepository | client_uuid in RPC | money-path unit |
| `sales/[id]/void` | session + permission | `void_sale` | repo | void status | auth-rls string |
| `returns/route.ts` | requireTenantSession | sale_returns/refunds + `adjust_stock` | returns-store | none beyond DB | Gate 3 HTTP |
| `reports/summary` | requireTenantSession | sales/products/branch_stock full select | inline | n/a | Gate 3 HTTP |
| `purchase-orders*` | session + po-store | purchases + `receive_purchase` | po-store | RPC | Gate 3 |
| `stocktake*` / `transfers*` | session + stores | relational when resolveDb | dual-path | audit-logger | Gate 3 |
| `payments/webhook/[provider]` | signature verify | gateway ledger + completePendingSale | gateway-payments-store | status+meta flags | webhook-idempotency unit |
| `store/[slug]/order` | public | storefront RPCs | storefront-repo | client_uuid style | commerce units |
| `whatsapp/webhook` | signature | whatsapp_durable RPCs | whatsapp-* | Meta delivery ids in docs | signature tests |
| `hq/*` | requireGmsAdmin | service role + orgs/docs | hq-repo | n/a | Gate 3 HQ deny |

Full per-route matrix of rate-limit / zod / transaction for all 102: **not exhaustively line-audited**; residual risk tracked as P2 documentation debt. Auth census test: `src/lib/server/__tests__/api-auth-census.test.ts`.

---

## Feature → Database Trace

### AUTHENTICATION — PARTIAL

| Step | Evidence | Flag |
|------|----------|------|
| Login | `api/auth/login` + Supabase auth when enabled | OK |
| Logout / refresh | proxy + supabase session cookies | OK (Gate 3) |
| Password reset | `password-reset.ts` + `app_documents` / profiles; needs service role | PARTIAL if SRK missing |
| Roles | `profiles.role` + `requireRoles` | OK |
| Permissions | `permissions-store` → `app_documents` key `permissions` (not SQL enum) | DOCUMENT |
| Tenant membership | profiles.org_id + RLS | OK |

### TENANCY — OK (core)

orgs → profiles → branches → branch_members (SELECT) → storefronts. HQ uses service role + `reseller_licences` **view**.

### HQ — PARTIAL

| Feature | Path | Flag |
|---------|------|------|
| GMS auth | `gms-auth.ts` app_metadata only | OK (Gate 3) |
| Orgs / fleet | organizations + hq-repo | OK |
| Licences | `app_documents` tenant.license + view | DOCUMENT |
| Platform settings | `platform_settings` table | OK |
| Tickets | hq-tickets.json / app_documents fallback | DUAL-PATH |

### POS — OK with gaps

| Feature | Path | Flag |
|---------|------|------|
| Products / barcode | catalog RPC / product_by_barcode | OK |
| Cart | client UI only | A (UI state) |
| Sale | `POST /api/sales` → `create_sale` | OK |
| Sale lines | via RPC → `sale_lines` | OK |
| Discounts | payload → RPC | OK |
| Payments (tender on sale) | `payments` via create_sale_internal | OK |
| Gateway card pending | **rejected** by SupabaseRepository L97–100 | MISSING on durable POS path |
| Receipt | `next_receipt_no` / counters | OK |
| Register / shifts | `register-store` → `shifts`+`shift_summaries` when resolveDb | PARTIAL dual JSON |
| Void | `void_sale` | OK |

### INVENTORY — OK with reason-coding gap

| Op | Stock change | Movement | Flag |
|----|--------------|----------|------|
| Sale / void | RPC | yes (sale RPCs) | OK |
| Receive PO | `receive_purchase` | yes | OK |
| Adjust/damage (`stock-store`) | `adjust_stock` | yes (`adjustment`) | PARTIAL reason taxonomy |
| Stocktake post | `set_branch_stock` | yes | OK |
| Transfer approve | dual `adjust_stock` | yes but both `adjustment` | PARTIAL (no transfer reason enum in RPC) |
| Return restock | `adjust_stock` in returns-store | yes | OK |

### PURCHASING — OK (durable preferred)

`po-store.ts`: relational `purchases`/`purchase_lines` when `resolveDb`; else `app_collections` `purchase-orders` + JSON file — **writes throw in production without session** (`requireSupabase`).

### RETURNS — OK

UI `/returns` → `api/returns` → `returns-store.ts` → `sale_returns` / lines / `refunds` / `refund_lines` + `adjust_stock`. Migration 0025. Fail-closed without DB (`Returns require the durable database`).

### STOREFRONT — OK (RPC-centric)

Public catalog/order via DEFINER RPCs; boards in `app_collections` `storefront-orders`.

### PAYMENTS (gateway) — PARTIAL / DUPLICATED model

| Stage | Storage | Evidence |
|-------|---------|----------|
| Pending gateway payment | `app_collections` `gateway-payments` (service) or local JSON | `gateway-payments-store.ts` |
| Webhook verify | provider signature in webhook route | fail-closed |
| Idempotent PAID | status==PAID early return; `meta.completedAt` / `licenceAppliedAt` | L153–186 |
| Complete sale/stock | `completePendingSale` → `storefront_create_order` / internal | L49–56 fail-closed with SRK |
| SQL `payments` table | Used by POS sale RPC tenders, **not** gateway ledger | DUPLICATED conceptual model |

### WHATSAPP — PARTIAL

Tenant resolve + order RPCs durable; inbox/settings largely `app_collections`/`app_documents`.

### REPORTING — PARTIAL

`api/reports/summary/route.ts`: loads **all** sales (no `.range`/date filter) then aggregates in Node. No dedicated profit/COGS SQL. `GET /api/sales` limited to **200** (`sales/route.ts` L9). Local path `listSales(5000)`.

### AI / JARVIS — PARTIAL

Chat/settings APIs; tools read sales/inventory via app helpers — not separate DB schema.

### BILLING / LICENCE — DOCUMENT

Licence in `app_documents` tenant doc; payment apply via webhook meta `kind=licence`.

### AUDIT — DUPLICATED / PARTIAL

| Store | Target | Consumers |
|-------|--------|-----------|
| SQL `audit_events` | RPC inserts (sale/void/etc.) | SELECT policy; **API does not list this table** |
| `audit-logger` | `app_collections` `audit-logs` | `api/audit` |
| `audit-store` | `app_collections` `audit-events` | writeAudit callers |

**Flag:** UI audit ≠ SQL immutable ledger. **P0 completeness** for “immutable audit storage” claim.

---

## Schema Drift

| Finding | Evidence | Flag |
|---------|----------|------|
| `reseller_licences` in `database.types.ts` as Table | Actually a **view** (0006) | type drift |
| `app_settings` / `restaurant_orders` in historical migrations | Dropped 0006; live absent | historical only |
| Gateway payments not in `payments` | collections | model drift |
| App audit collections vs `audit_events` | dual | DUPLICATED |
| Pending sale status on durable create_sale | explicit throw L97–100 | gap |
| `gate3_as_user` in live DB | not in migration files | orphan |
| Stocktake/transfer JSON dual collections | still wired as fallback | LOCAL-ONLY in demo |
| Types cast hacks (`storefronts as organizations`) | gateway-payments-store L64–66 | stale generated types |

No evidence in this audit of columns referenced by production POS RPC path that are absent from live sales/products schema (core path aligned).

---

## Durability Audit

| Path | Classification | Production behavior |
|------|----------------|---------------------|
| Cart localStorage (`store/[slug]/cart.tsx`) | A Legitimate UI | OK |
| Theme localStorage | A | OK |
| Offline sale queue (`lib/offline-queue.ts`) | E / DEFERRED | Can POST `/api/sales` later; **not** safe multi-device ledger sync |
| Customer display localStorage | A | OK |
| `docStore` / `recordStore` JSON files | C Dev fallback | Writes blocked when `requireSupabase` and no session |
| `gateway-payments.json` / `sales.json` completePending | C/E | Durable path preferred; local only without SRK |
| HQ tickets/platform local JSON | C | Service-role preferred |
| In-memory product overrides (local repo) | C Demo | Not used when Supabase enabled (`getRepository`) |

**Silent production business data → local JSON:** Mitigated by `requireSupabase` (`config.ts` L28–29) + throw on write without session. Residual: **read** paths returning empty JSON when `resolveDb()` is null without throwing — **P1** for operator confusion, not silent multi-tenant bleed if production always has Supabase.

---

## Payment Model

```
createGatewayPayment → app_collections gateway-payments (PENDING)
       ↓
webhook verify → applyGatewayWebhook
       ↓ (idempotent if already PAID)
completePendingSale / applyLicencePayment
       ↓
storefront_create_order / licence doc update
       ↓
stock via sale RPC (not before PAID)
```

**Duplicate webhook protection (unit-evidenced):** early return on PAID; `completedAt` / `licenceAppliedAt` gates.  
**Live DB race under concurrent identical webhooks:** UNVERIFIED (no integration test).  
**SQL `payments` rows:** created for completed POS/storefront sales via RPC — separate from gateway pending ledger.

---

## Inventory Ledger

Authoritative quantity: `branch_stock` / `variant_branch_stock`.  
Authoritative movement log: `stock_movements` (written by DEFINER RPCs).

| Operation | Movement created? | Reference quality |
|-----------|-------------------|-------------------|
| create_sale / void_sale | Yes (RPC) | sale id |
| receive_purchase | Yes | purchase |
| adjust_stock callers | Yes | note; reason often `adjustment` |
| set_branch_stock (stocktake) | Yes | stocktake |
| Transfer | Yes ×2 via adjust_stock | PARTIAL reason |
| Direct UPDATE branch_stock | Blocked by RLS for clients | OK |

Anything mutating qty **without** movement: local demo `upsertOverride` paths only (`complete-pending-sale` local branch L94–101) — **LOCAL-ONLY**.

---

## Reporting

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Server-side data | PARTIAL | Node aggregation after select |
| No hidden 200 limit on summary | Summary has no limit; sales list API **200** | `sales/route.ts` L9 |
| PostgREST max-rows risk | UNVERIFIED against project API settings | if default 1000, summary silently truncated |
| Date range / branch filters | MISSING on summary route | no query params |
| Revenue | OK (sum total) | |
| COGS / profit / margin | MISSING | cost_price loaded on products but not used in `buildReport` |
| Tax | `tax_total` on sales unused in report | MISSING |
| Stock valuation | dead-stock heuristic only | PARTIAL |

---

## Test Coverage

| Flow | Coverage type | Gap |
|------|---------------|-----|
| Auth / GMS | unit + Gate 3 HTTP | OK for security gate |
| Tenant isolation | Gate 3 | OK |
| POS sale | unit payload / mock | **no live concurrent create_sale** |
| Receipt uniqueness | migration/RPC | no live stress test |
| Void | string contains rpc | PARTIAL |
| Stock / stocktake / transfer / PO | Gate 3 HTTP smoke | no ledger assertion tests |
| Return / refund | Gate 3 route | no qty ledger assert |
| Payment webhook duplicate | pure unit | no live DB |
| Storefront order | unit | PARTIAL |
| Reporting math | none dedicated | MISSING |
| WhatsApp | signature/unit | PARTIAL |
| Migration batch | static file parse | OK Gate 2A |

Vitest: **201** reported PASS at Gate 3 closeout — overwhelmingly unit/static, not DB integration.

---

## Dead/Legacy Code Candidates

**Do not delete until after Gate 4 + explicit cleanup gate.**

### Database / migrations

- `gate3_as_user` live function (orphan)
- Historical create/drop of `app_settings`, `restaurant_orders`
- Unused-by-API surface of SQL `audit_events` (keep for RPC; wire or document)

### Code

- `LocalRepository` / `sales.json` / product local overrides
- Dual JSON fallbacks inside po/transfer/stocktake/register stores
- Duplicate audit (`audit-store` vs `audit-logger`)
- Offline queue + service worker as “production offline POS”
- Demo login path when `POS_ALLOW_DEMO`
- Type casts for missing generated tables

### Unused / underused SQL

- Direct app reads of `payments` gateway lifecycle: none found
- `get_sale` RPC: callers sparse / UNVERIFIED

---

## Missing Components

1. Durable POS pending/card sale on `create_sale` (explicit MISSING).
2. Unified immutable audit API over `audit_events`.
3. Gateway payment first-class table (optional; collections work but drift from `payments`).
4. Reporting SQL (date/branch, COGS, tax, pagination).
5. Transfer-specific movement reason / reference_id consistency.
6. Live integration test suite for money + stock + webhook races.
7. Production offline sync protocol (currently DEFERRED).

---

## P0 Issues

| ID | Issue | Evidence | Before |
|----|-------|----------|--------|
| P0-1 | Audit claim vs reality: UI/API uses `app_collections` audit collections; SQL `audit_events` not exposed | `audit-logger.ts` L25–28; `audit-store.ts` L15–17; RPC inserts to `audit_events` | Gate 4 / clients |
| P0-2 | Durable POS rejects pending card sales | `repositories/supabase.ts` L97–100 | Gate 4 if POS card-on-counter required |
| P0-3 | Reporting can be mathematically incomplete (no COGS/margin/tax; possible row truncation; sales API 200) | `reports/summary/route.ts`; `sales/route.ts` L9 | Clients relying on reports |
| P0-4 | Offline queue can re-POST sales without proven durable idempotency UX | `offline-queue.ts`; BillPanel enqueue | Disable or DEFER before clients |

---

## P1 Issues

| ID | Issue | Evidence |
|----|-------|----------|
| P1-1 | Dual-path stores still compile JSON fallbacks for PO/transfer/stocktake/register | `*-store.ts` recordStore/docStore |
| P1-2 | Gateway ledger ≠ `payments` table (ops/reporting confusion) | `gateway-payments-store.ts` |
| P1-3 | Transfer/return stock movements often reason `adjustment` | `adjust_stock` definer |
| P1-4 | Weak-looking export/backup routes (auth only inside helpers) | `backup/route.ts`, `products/export/route.ts` |
| P1-5 | `resolveDb()` null → empty/local reads without loud error on some list paths | `backend.ts` + stores |
| P1-6 | No live DB integration tests for concurrent sale / webhook | test tree |
| P1-7 | Stale/orphan `gate3_as_user` in production DB | live `pg_proc` |

---

## P2 Issues

- Document-store verticals (restaurant, HP, layaway, play, bookings, jobs) lack relational schema — acceptable if product accepts JSONB entities.
- Generated types incomplete for some storefront columns (casts).
- Full 102-route idempotency/rate-limit matrix documentation.
- Cleanup of unused helpers after Gate 4.

---

## Recommended Fix Order

1. **Decide audit source of truth** — wire `/api/audit` to `audit_events` **or** formally document collections as ops audit and SQL as RPC-only (no silent dual).
2. **Reporting contract** — date/branch filters, explicit pagination, COGS/margin or label UI as “activity summary not P&L”.
3. **POS pending/card** — implement durable pending path **or** product-disable card-at-POS until Gate 4+.
4. **Disable offline enqueue in production** UI until sync design exists.
5. **Add DB integration tests** for create_sale concurrency, void stock restore, webhook duplicate, return restock.
6. **Normalize movement reasons** for transfer/return.
7. **Post-Gate-4 cleanup** of JSON fallbacks and orphan RPCs.

---

## Gate 2B Certification

| Check | Result |
|-------|--------|
| Migrations 0001–0026 replay inventory matches live | **PASS** (Gate 2A + re-verify) |
| Every claimed feature has full UI→…→test chain | **FAIL** (gaps above) |
| Core POS/inventory/returns/storefront durable objects present | **PASS** |
| No automatic fixes applied this gate | **PASS** |
| Ready to start Gate 4 without remediation discussion | **NO** — triage P0 first |

### Final decision answers

1. **Does the database contain everything the code requires?**  
   **Mostly yes for core relational paths.** Code also requires document collections and a licence **view**. Orphan `gate3_as_user` is extra, not missing. Pending POS card path needs RPC/product support that is not present.

2. **Does the code use every critical durable table correctly?**  
   **No.** `audit_events` and gateway vs `payments` are the clearest misalignments; register/PO/stocktake correctly prefer SQL when session DB resolves.

3. **Missing tables/RPCs/indexes/RLS?**  
   **No missing tables for core Gate 2A schema.** Missing is **application wiring** and **reporting/pending-sale capabilities**, not blank migration holes for listed core entities.

4. **Schema/code mismatches?**  
   **Yes** — audit dual store; gateway payments vs `payments`; types/view; movement reason coarseness; pending sale.

5. **Production business flows still using local persistence?**  
   **Writes fail-closed in production without Supabase/session** for doc/record stores. **Residual risk:** demo/offline paths and dual-path reads; gateway/HQ fall back only when service role / Supabase disabled.

6. **P0 before Gate 4?**  
   P0-1 (audit truth), P0-2 (if Gate 4 includes POS card), P0-4 (offline). P0-3 if Gate 4 includes reporting certification.

7. **P1 before clients?**  
   Reporting completeness, dual-path removal or hard fail, movement reasons, export/backup auth clarity, integration tests.

8. **Post-launch?**  
   Vertical relationalization, type regen, orphan RPC drop, deep idempotency matrix.

9. **Delete only AFTER Gate 4?**  
   LocalRepository JSON, dual fallbacks, offline POS pretence, duplicate audit helper, `gate3_as_user`, demo auth — **candidates only**.

10. **Structurally ready for Gate 4?**  
    **Conditionally.** Schema foundation **is** ready. Product should **not** treat Gate 2B as “every feature complete.” Agree P0 triage, then run Gate 4 commerce E2E against durable paths only.

---

**Gate 2B status: PASS WITH P0/P1 REMEDIATION**  
**Gate 4: NOT STARTED (blocked on explicit go-ahead after P0 triage)**

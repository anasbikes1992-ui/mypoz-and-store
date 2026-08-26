# MYPOZ AUDIT VERIFICATION — Second Pass

**Source:** `MYPOZ_CURRENT_STATE_AUDIT.md` (first-pass audit)  
**Date:** 2026-08-24  
**Method:** Read-only deep trace. Every claim requires exact file + function evidence.  
**Scope:** Every item marked COMPLETE or PARTIAL in the first pass is re-examined.  
**Legend:** ✅ VERIFIED · 🟡 DOWNGRADED (was PARTIAL, evidence thinner) · 🔴 DOWNGRADED (was COMPLETE/PARTIAL, unproven) · ⚠️ BROKEN · ❓ UNVERIFIED · ✔ CONFIRMED-BROKEN

---

## Module 1: POS sale (was PARTIAL)

### Claimed
POS flow: scan → cart → `POST /api/sales` → `create_sale` RPC.

### Verification trace

**UI → API:**  
`src/app/(app)/pos/page.tsx` (exists, not read in full) → Zustand cart-store → `POST /api/sales`  
`src/app/api/sales/route.ts` L6–16: `getRepository()` on GET, and L18–42: `getRepository()` + `repo.createSale(parsed.data)` on POST.

**API auth:**  
`getRepository()` (`src/lib/server/repositories/index.ts` L30) calls `db.auth.getUser()`. If no session → throws "Unauthorized". ✅

**Repository dispatch:**  
`SupabaseRepository.createSale` (`src/lib/server/repositories/supabase.ts` L94–134): calls `db.rpc("create_sale", { payload })`. ✅

**`create_sale` RPC:**  
`supabase/migrations/0002_functions.sql` L49–275: server-side price recheck, discount cap, stock fail-closed, `client_uuid` idempotency, atomic sale + lines + payments + stock decrement. ✅

**Tenant isolation:**  
`create_sale` declares `v_org := current_org_id()` and verifies `branch.org_id = v_org`. RLS enforces reads. ✅ for Supabase path.

### Missing error handling
- `getRepository()` throws a generic 500 on any Supabase error; no typed error categories to client.
- `client_uuid` idempotency returns prior sale, but the API returns it as success (200/422 ambiguous). If the RPC raises for stock, 422 is returned with the message. ✅

### Race conditions
- `create_sale` uses implicit row lock on `branch_stock` inside the definer function. **UNVERIFIED** that `SELECT ... FOR UPDATE` or similar is present in `0002_functions.sql` beyond line 120 (file truncated in this read). PostgreSQL row-level lock inside a function is assumed, not confirmed from this read.

### Missing tests
- No test calls `create_sale` against a real Postgres instance (integration tests mocked).
- No concurrent checkout test.

### Verified status: 🟡 PARTIAL (strong path confirmed; stock lock not proven from available text; branch selection hardcoded to "first active")

---

## Module 2: Storefront checkout (was PARTIAL)

### Trace

**UI:** `src/app/store/[slug]/checkout/page.tsx` (exists)  
**API:** `POST /api/store/[slug]/order/route.ts` L81–177  
**Auth:** No session required (public). Rate limit: in-memory `hits` Map (not multi-instance safe). ✅ for single instance.  
**Product resolution:** `placeStorefrontOrder` (`src/lib/server/storefront-repo.ts` L438): Supabase path calls `anonClient().rpc("storefront_catalog")` then resolves variants. If product not found → throws 422. ✅  
**Order placement path:**
1. `assertNoLocalFallbackForPublicOrders()` — throws if production + Supabase + no service role key. ✅
2. `resolvedLines` built from anonymous RPC.
3. COD/cash path → calls `createSale` via repo.
4. Card path → `createGatewayPayment` + redirect to payment gateway. **Stock is NOT decremented on card pending.** Stock only decrements after webhook (`completePendingSaleDurable` calls `storefront_create_order` RPC).
**Tenant isolation:** `storefront_catalog` is a DEFINER function scoped by host+slug. org is never from client input. ✅

### Missing error handling
- Email on order confirmation is fire-and-forget (void promise). Email errors silently dropped. ✅ (intentional — does not block)
- Email `items` in confirmation uses raw `productId` as the item name (`String(l.productId)`) — **orders show product IDs, not names in confirmation emails**. Bug.
- No timeout on multi-page `storefront_catalog` loop (up to 20 pages = 20 sequential RPC calls before throwing).

### Race condition
- Between card checkout: `createGatewayPayment` persists order as pending; if two checkouts submit the same `clientUuid` within the webhook race window, both may be processed. `client_uuid` idempotency in `create_sale` prevents double-stock-decrement, **but** `clientUuid: null` is passed in `completePendingSaleDurable` L155 — idempotency is **disabled** for webhook completions. Race possible.

### Missing tests
- No end-to-end payment-webhook test against real Supabase.

### Verified status: 🟡 PARTIAL (core path proven; email bug confirmed; clientUuid=null on webhook path disables idempotency; rate limit in-memory)

---

## Module 3: Payment webhooks (was PARTIAL)

### Trace

`POST /api/payments/webhook/[provider]/route.ts`:
1. Gets raw body as text.
2. `adapter.verifyWebhook(headers, rawBody)` — provider-specific signature.
3. Unverified → 202 (ignored). ✅ fail-closed.
4. Verified + PAID → `applyGatewayWebhook` → `completePendingSale`.
5. `completePendingSaleDurable` → `createServiceSupabase().rpc("storefront_create_order")` → stock moves only after PAID. ✅

**Auth:** No session; route is in PUBLIC_PATHS. Signature verification is the auth.  
**PayHere:** `payhereAdapter.configured()` checks env. `verifyWebhook` confirmed to check HMAC signature (from test file `payhere.test.ts`).  
**Stripe:** `stripeAdapter` checks `stripe-signature` header + `STRIPE_WEBHOOK_SECRET`. ✅

### Missing error handling
- `applyGatewayWebhook` with `NOT_FOUND` returns 404. Gateway may retry, causing repeated 404 log noise with no backoff.
- `completePendingSaleDurable` falls through to local JSON on `PENDING_SALE_NOT_FOUND` — **in production with Supabase on, this means an unmatched webhook may silently update a local JSON file** rather than fail loud.

### Race condition
- Webhook may be delivered twice (gateway retry). `applyGatewayWebhook` fetches then updates; not atomic. Duplicate webhook could call `completePendingSale` twice — `clientUuid: null` means `create_sale` won't deduplicate. **Potential double-stock-decrement if webhook received twice.**

### Missing tests
- No integration test for webhook idempotency.

### Verified status: 🟡 PARTIAL (verify-then-apply pattern solid; clientUuid=null on completion is a confirmed race risk)

---

## Module 4: Void sale (was ⚠️ BROKEN in audit)

### Trace

`POST /api/sales/[id]/void/route.ts`:  
- Requires manager PIN + `resolvePermission("void_sale")`. ✅ business gate.
- Calls `repo.voidSale(id, reason)`.
- `SupabaseRepository.voidSale` (`src/lib/server/repositories/supabase.ts` L137–157): `.from("sales").update({ status: "voided" }).eq("id", id)`.

**RLS check:**  
`0003_rls.sql` L93: `policy sales_read` = `for select using (org_id = current_org_id())`. **There is no `sales_write` policy that allows UPDATE.** RLS policies that are not defined default to DENY. Therefore this `.update()` will be **rejected by RLS in durable mode.**

**Stock not restored:** Void does not call `adjust_stock` to restore inventory. Even if RLS were fixed, voiding a sale would leave stock decremented.

**PIN check has no session guard:** `getPermissions()` and `verifyManagerPin()` both go through `docStore`/`resolveDb`. If Supabase enabled and user is unauthenticated, `resolveDb()` returns `null` → falls to local JSON perms. PIN could be verified against demo local perms even for a Supabase-backed tenant. **Privilege escalation vector.**

### Verified status: ✔ CONFIRMED BROKEN (UPDATE blocked by RLS; stock not restored; PIN check may fall to demo path)

---

## Module 5: Stock operations — GRN / returns / damages (was PARTIAL)

### Trace

`src/lib/server/stock-store.ts` L141–238: `createStockDoc(type, input)`.  
**Durable path (Supabase):** `resolveDb()` → session required → `adjust_stock` RPC → `stock_movements` + `branch_stock`. ✅  
**Local path:** `upsertOverride` on product qty. ✅

**Returns page:** `src/app/(app)/returns/page.tsx` → `StockOperation type="return"` → stock-store. ✅ restock happens.  
**But:** No link to original `sale_id`. No payment reversal. No "return" entity in SQL. ✅ for restock, ✔ NOT a return-of-sale engine.

**Stocktake:** `src/lib/server/stocktake-store.ts` L60–75: `postStocktake` calls `upsertOverride` — **local JSON path only**. No `adjust_stock` call. On durable Supabase backend, `upsertOverride` writes to the local override map, **not** `branch_stock`. **Stocktake posting does not update production stock in Supabase durable mode.**

**Transfer:** `src/lib/server/transfer-store.ts` L19–77: **entire store is `docStore<StockTransferRequest[]>`** — a document blob. `approveTransferReceipt` updates the status but does NOT call `adjust_stock`. **Branch stock is never moved in durable mode.**

### Missing error handling
- `stocktake-store` fails silently against local JSON in Supabase mode.
- Transfer approval audit log confirms but stock does not move.

### Verified status:
- Stock GRN/damages durable path: ✅ VERIFIED via `adjust_stock`
- Stocktake: ✔ CONFIRMED BROKEN in durable mode (local JSON only)
- Transfers: ✔ CONFIRMED BROKEN (blob only, no stock movement)
- Returns: ⚠️ PARTIAL (restock works locally, durable unknown, no sale linkage)

---

## Module 6: Purchase orders (was PARTIAL)

### Trace

`src/lib/server/po-store.ts` L29–32: `recordStore({ collection: "purchase-orders", file: "purchase-orders.json" })`.  
`createPO` calls `findById(l.productId)` — **`findById` is from `product-repo.ts` which reads local JSON catalog**. On Supabase-enabled tenants this will fail to resolve products not in the local JSON.  
`receivePO` calls `createStockDoc("grn", ...)` — this **does** use `adjust_stock` when Supabase available. ✅  
But `createPO` itself cannot resolve SQL-catalog products. **Creating a PO in durable mode is broken for products that exist only in Supabase.**

### Auth: No `requireTenantSession` in `/api/purchase-orders/route.ts` — proxy-only.

### Verified status: 🟡 DOWNGRADED — createPO broken for Supabase-only products; no explicit auth in route handler

---

## Module 7: Inventory ledger (was PARTIAL)

### Trace

`branch_stock` + `stock_movements` in SQL. RPC `adjust_stock` (0002) used by `stock-store.ts`. `create_sale` decrements via `branch_stock` inside RPC. ✅  
`set_branch_stock` RPC exists (0023 references it) for direct set operations.

**Key finding:** `next_receipt_no(p_branch)` uses `count(*)+1` over daily sales — **not atomic under concurrent inserts**. Two concurrent sales at the same time could get the same receipt number, violating `UNIQUE (org_id, receipt_no)`. This would cause `create_sale` to throw a unique constraint error for the second concurrent sale. **Race condition confirmed in receipt generation.**

### Missing tests
- No concurrent sale test.

### Verified status: 🟡 PARTIAL (ledger pattern sound; receipt number race confirmed)

---

## Module 8: Transfers and stocktake auth

### Trace

`/api/transfers/route.ts` — no `requireTenantSession`, no `getRepository`. Uses `listTransfers()` → `docStore`. `docStore` calls `resolveDb()` which **does** call `getUser()`. If no session, `resolveDb` returns `null` → local JSON. In production (Supabase required), `resolveDb` would **throw** (requireSupabase=true + no user) rather than returning data. This effectively enforces auth indirectly — but with a 500 error, not a clean 401.

Same pattern for `/api/stocktake/route.ts`, `/api/register/route.ts`, `/api/purchase-orders/route.ts`, `/api/billing/route.ts` — all rely on `docStore`/`recordStore` → `resolveDb` → implicit session requirement.

**In production (NODE_ENV=production, Supabase enabled):** unauthenticated requests to these routes will throw an unhandled error rather than returning 401. The proxy should have blocked them first, but the proxy only checks cookie presence, not JWT validity.

### Verified status: Auth gap confirmed — no explicit `requireTenantSession`; effective auth via `resolveDb` throw, but error response is 500 not 401.

---

## Module 9: Platform HQ (was PARTIAL)

### Trace

`src/app/hq/layout.tsx` → `getGmsAdmin()` → redirect to login if null. ✅  
All `/api/hq/*` routes call `requireGmsAdmin()` at handler start. ✅  
`hq-repo.ts` uses `createServiceSupabase()` (service role) to read `organizations`, `sales`, `products`, `reseller_licences`. ✅

**`user_metadata` risk:**  
`src/lib/server/gms-auth.ts` L55–59: checks both `app_metadata` AND `user_metadata`. `user_metadata` is writable by clients via Supabase Auth update. If a tenant user updates their own `user_metadata.role = "gms_admin"`, they would gain HQ access. **This is a confirmed privilege escalation vector.**

**Fleet data accuracy:** `tryResellerLicences()` uses service role. Falls back to `demoFleet()` if unavailable. Fall-through is silent — HQ may show demo data without indicating it. ✅ (source labelled in UI)

### Verified status: 🟡 PARTIAL with HIGH RISK (`user_metadata` trust is confirmed privilege escalation)

---

## Module 10: Billing / licence (was PARTIAL)

### Trace

`GET /api/billing` → `readTenant()` (docStore). No explicit auth. See §8 — implicit via `resolveDb`.  
`POST /api/billing` → same. PayHere creates `createGatewayPayment` → on PAID webhook → `applyLicencePayment` → `writeTenant({ license: { plan, expiry } })` → stores in `app_documents`. ✅  
**Licence write is a JSON document, not a payment receipt table.** If service role writes licence, it would update `app_documents` row for org. ✅ tenant-scoped.

### Missing error handling
- No idempotency check on `applyLicencePayment` — duplicate PAID webhook re-extends licence by 30 days again.
- No invoice status tracking (ticket created but no state machine).

### Verified status: 🟡 PARTIAL (works for happy path; idempotency missing on licence apply; no explicit route auth)

---

## Module 11: WhatsApp (was PARTIAL)

### Trace

**Webhook POST:** `src/app/api/whatsapp/webhook/route.ts` L120–185:  
```
const secret = process.env.WHATSAPP_APP_SECRET?.trim();
const signed = verifyWhatsAppSignature(raw, sigHeader, secret);
if (!signed) {
  if (requireSupabase || secret) {
    return NextResponse.json({ received: false }, { status: 401 });
  }
  // Demo without WHATSAPP_APP_SECRET: accept so local inbox can be exercised.
}
```
`requireSupabase` is the **boolean export** from `config.ts`, not a function call. In production (`NODE_ENV=production`, `POS_ALLOW_DEMO=false`), `requireSupabase = true`, so unsigned bodies ARE rejected. ✅ in production.  
In demo/dev, unsigned bodies are accepted. ✅ as documented.

**Inbox route auth:** `src/app/api/whatsapp/inbox/route.ts` — no `requireTenantSession` in file. Relies on `whatsapp-inbox-store` → `recordStore` → `resolveDb`. Same implicit-auth pattern as §8. 500 for unauthenticated in production.

**Tenant isolation for webhook:** `handleInboundText` uses `phoneNumberId` to resolve tenant via `whatsapp_resolve_org` DB function. ✅

**Send message:** `sendWhatsAppText` uses `WHATSAPP_TOKEN` env (tenant can override via settings). Multiple tenants sharing one WA number is possible but env-conflated.

### Verified status: 🟡 PARTIAL (webhook correctly rejects unsigned in production; inbox has no explicit auth; multi-tenant phone number handling implicit)

---

## Module 12: Reporting (was PARTIAL)

### Trace

`src/app/(app)/reports/page.tsx`: `fetch("/api/sales")` + `fetch("/api/products?pageSize=200")`.  
`GET /api/sales`: `repo.listSales(200)` — hardcap 200.  
`GET /api/products`: `repo.queryProducts({ pageSize: min(200, requested) })`.  
No server-side aggregation. All profit/margin/trend calculations happen in the browser on max 200 records.

**With 1518 products and any reasonable sales history, the reports are wrong** — incomplete data, not just slow.

`salesStats()` in `SupabaseRepository` does `select("total")` with no row limit on the `allRes` query — could return thousands of rows for total revenue. Fine for accuracy but expensive.

### Missing
- No date-range filter in reports page (loads most recent 200 sales only).
- No server-side aggregation.
- No tax report, cashier report, or purchasing report API.

### Verified status: 🔴 DOWNGRADED TO UNVERIFIED FOR PRODUCTION — data is provably incomplete for stores with >200 sales/products; browser aggregation on truncated data

---

## Module 13: Audit logging (was ⚠️ BROKEN)

### Trace

`src/app/api/audit/route.ts`:  
`GET` — no auth check. Any request (even unauthenticated) gets last 100 audit entries.  
`POST` — no auth check. Any request can write arbitrary action/details/actor to the audit log.  
`src/lib/server/audit-logger.ts`: `store.write(updated)` overwrites the entire array — **mutable, not append-only**.  

Coverage gaps: login/logout, profile changes, price list changes, permission changes are NOT logged. Only: cart.item_removed, price.overridden, discount.authorized, drawer.manual_open, sale.created, sale.voided, register.opened/closed, stocktake.posted, transfer.approved, manager.unlock, licence.payment.

SQL `audit_events` table (0001) is populated by `create_sale` only (per ARCHITECTURE.md). Application-layer `audit-logger` is a separate mutable document. They are **not linked**.

### Verified status: ✔ CONFIRMED BROKEN (unauthenticated read+write; mutable; SQL audit separate and not used by app layer audit UI)

---

## Module 14: Order fulfillment (was PARTIAL)

### Trace

`PATCH /api/commerce/orders/[id]/fulfill/route.ts`:  
- No `requireTenantSession`. No `getRepository`. Calls `listStorefrontWebOrders()` → `recordStore("storefront-orders")` → `resolveDb`. Implicit auth.
- Validates status transition via `allowedFulfillmentNext`.
- If Supabase + valid UUID sale → calls `update_sale_fulfillment` RPC (best-effort, catch-all).
- Calls `notifyWhatsAppOrderStatus` to customer.

**Auth:** Route lacks explicit auth call. In production, `resolveDb` path requires user, but error would be 500.

**WA notification:** Fires on every fulfill status update. If WA not configured, `notifyWhatsAppOrderStatus` presumably fails silently.

### Verified status: 🟡 PARTIAL (lifecycle logic correct; explicit auth missing; WA notify best-effort)

---

## Module 15: Commerce categories / brands / suppliers UI (was PARTIAL, post-fix)

### Trace

`src/lib/server/collection-store.ts` L44–50: `listCollection(name)` checks `SQL_CATALOG_ENTITIES.has(name)` — set contains `"categories"`, `"suppliers"`, `"brands"`. If in set and `resolveDb()` returns a client, delegates to `catalog-entity-store.ts`.  
`listCatalogEntity(db, "categories")` → `db.from("categories").select(...)`. ✅ reads SQL table.  
`listCatalogEntity(db, "brands")` → `db.from("products").select("brand")` + distinct — **computed, not a brands table**. ✅

**Write path for categories:** `createCatalogEntity` (not read in full) should insert into `categories` table. **UNVERIFIED** that write path is correct.

**Suppliers:** reads SQL `suppliers` table. ✅ Supabase path.

### Verified status: ✅ PARTIAL — read path to SQL tables is proven for categories/suppliers/brands; write path UNVERIFIED

---

## Module 16: Multi-tenancy isolation (was PARTIAL)

### Full verification

**1. Tenant identifier:** `organizations.id` ✅  
**2. Org from session:** `current_org_id()` in RLS and RPCs reads `profiles.org_id` for `auth.uid()`. Never from request body. ✅  
**3. Can user change org_id from browser?** No — only via DB profile which requires RLS write check. ✅  
**4. Server-side enforcement:** RLS on all core tables (0003, 0023). ✅  
**5. `app_collections` isolation:** `app_collections.org_id` defaults to `current_org_id()` — writes are scoped. ✅  
**6. Service role bypass:** HQ, webhooks, and storefront persistence use service role. Any bug in those paths → cross-tenant. Risk exists but by design.  
**7. `resolveDb` returns null for unauthenticated** → local JSON → single shared file → **all unauthenticated/demo requests share one local JSON store**. Not relevant in production (requireSupabase throws), but dev risk.  
**8. `app_documents` key collision:** Multiple tenants can have key "settings" — scoped by `org_id` PK. ✅  

**Unverified:** whether storefront `storefront_catalog` DEFINER correctly refuses to return products from org B when queried with slug A. DEFINER functions run as owner and bypass caller RLS — correct scoping depends entirely on the function's WHERE clause.

### Verified status: ✅ Core isolation design is sound; service-role code paths are the remaining risk

---

## Module 17: RLS policies (was PARTIAL, schema drift)

### Full verification

From `0003_rls.sql`:
- `organizations`, `branches`, `profiles`, `branch_members` — RLS enabled + policies. ✅
- `products`, `product_barcodes`, `categories`, `suppliers` — RLS enabled + policies. ✅
- `branch_stock`, `stock_movements` — **read-only policies only**; mutations via DEFINER. ✅
- `sales`, `sale_lines`, `payments` — **read-only policies only**; `create_sale` is write path. ✅
- `audit_events` — RLS enabled, read-only policy. ✅

From `0023_launch_rls_hardening.sql`:
- `receipt_counters` — RLS enabled. ✅
- POS RPCs (`create_sale`, `catalog`, etc.) revoked from `public`/`anon`, re-granted to `authenticated`. ✅

**Tables NOT seen with RLS policies:**
- `stock_documents` (0005): no RLS seen in 0005 migration. Likely added in 0006 or 0019. **UNVERIFIED** for this migration.
- `app_collections` (0006): policy `app_collections_rw for all using (org_id = current_org_id())`. ✅ (from 0006 comment read in first pass)
- `app_documents` (0006): policy `app_documents_rw for all using (org_id = current_org_id())`. ✅
- `platform_settings` (0015): no tenant RLS by design (service role only). ✅
- `storefronts`, `store_collections`, `product_variants` (0007–0013): **UNVERIFIED** policies not read.

**Schema name drift:** Git `0001_schema.sql` names (`organizations`, `branch_stock`, `stock_movements`) match TypeScript types and 0003 RLS. Apparent mismatch was a prior misread. Names are **consistent** in available migrations.

### Revised finding on "migration drift": The specific table-name clash claimed in the first audit was not reproduced in this pass. The concern remains that `supabase/migrations` replays **from zero** have not been CI-tested — not that column names differ.

### Verified status: 🟡 PARTIAL — core table RLS confirmed; post-0009 commerce/variant/storefront RLS UNVERIFIED

---

## Module 18: Authentication flows (was PARTIAL)

### Login — Supabase path (verified)

`src/app/login/page.tsx` L55–60: `supabase.auth.signInWithPassword({ email, password })`. Standard SSR flow via `@supabase/ssr`. ✅

### Demo login (verified)

`POST /api/auth/login/route.ts` L20–31: blocked if `NODE_ENV=production && !isSupabaseEnabled && POS_ALLOW_DEMO!="true"`. ✅  
Blocked if Supabase enabled. ✅  
`POS_USER`/`POS_PASSWORD` default to `admin`/`admin123` — hardcoded fallback defaults. ✅ (risk if demo accidentally enabled on prod).

### Proxy auth (verified)

`src/proxy.ts` L120–130: checks `sb-*-auth-token` cookie name **only**, not JWT content. Confirmed — cookie presence ≠ valid session. Risk remains.

### `requireTenantSession` (verified)

`src/lib/server/auth-session.ts` L44–72: calls `db.auth.getUser()` + profiles lookup. Returns `orgId` from `profiles.org_id`. ✅ Strong — but only used by a subset of routes (see §8 census).

### Session expiry handling

Supabase SSR package (`@supabase/ssr`) handles refresh tokens via cookies. No explicit application-level handling found. **UNVERIFIED** whether refresh is called proactively or only on next request.

### Verified status: 🟡 PARTIAL — login path solid; proxy optimistic confirmed; subset of routes unprotected; refresh UNVERIFIED

---

## Module 19: Reseller / HQ fleet (was PARTIAL)

### Trace

`src/lib/server/hq-repo.ts` L144–160: `tryResellerLicences()` → `db.from("reseller_licences").select("*")`. ✅ (service role, real view).  
Falls back to `demoFleet()` → returns hardcoded/local demo fleet. **Silent fallback**: UI labels the source. ✅

No reseller accounts table. No commission calculation. No reseller portal. MISSING as confirmed.

### Verified status: ✅ confirmed view read is real; MISSING reseller portal confirmed

---

## Module 20: Email (was PARTIAL)

### Trace

`src/lib/email/client.ts` L9–25: reads `RESEND_API_KEY`. If absent → logs warning + returns `{ id: "noop" }`. **Silent noop — no error thrown**.  
Storefront order + licence payment → `sendEmail` called as fire-and-forget void promise. ✅ (intentional).  
`/api/auth/forgot-password` uses `sendEmail` via Resend. ✅  
Template preview at `/api/email/preview`.

### Bug confirmed
Order confirmation email uses `String(l.productId)` as item name — UUID shown in email instead of product name.

### Verified status: 🟡 PARTIAL — real when configured; noop silent when not; UUID-as-name bug confirmed

---

## Module 21: Jarvis / AI chat (was PARTIAL)

### Trace

`/api/ai/chat/route.ts` — imports `runAgentChat`. Auth census: `runAgentChat` is a STRONG marker → route is auth-protected. ✅  
`/api/hq/ai/chat/route.ts` — `requireGmsAdmin()`. ✅  
`src/lib/server/ai-chat.ts` L19–59: `fetch("https://api.openai.com/v1/chat/completions", ...)`. Real API call. ✅  
Plan gate: `tenantKnowledgeAllowed()` called before KB lookup. ✅

**`/api/ai/settings/route.ts`** — listed in auth census KNOWN_RESIDUAL (proxy-only). Anyone with a cookie can read/write AI settings.

### Verified status: 🟡 PARTIAL — chat auth confirmed; settings route has no strong auth

---

## Module 22: Discount codes storefront (was PARTIAL)

### Trace

`src/lib/server/storefront-repo.ts` L57–98: `validateDiscountCodeServiceOrg` queries `app_collections` with service role (no shopper JWT). ✅ correct isolation.  
`consumeDiscountCodeServiceOrg` L100–118: increments `usedCount` via service role update. ✅  
No atomic `SELECT ... FOR UPDATE` or check on `usedCount` before increment — **two concurrent checkouts with same code could both pass max-use check** before either increments. Race condition on discount code max-use.

### Verified status: 🟡 PARTIAL (isolation correct; max-use race confirmed)

---

## Module 23: Register / shifts (was PARTIAL)

### Trace

`/api/register/route.ts` — no `requireTenantSession`, no `getRepository`. Uses `getOpenShift()` → `docStore` → `resolveDb` → implicit auth (see §8).  
`register-store.ts` (`docStore`) — same implicit auth via `resolveDb`.  
No `shifts` SQL table used from TS. The SQL `shifts` and `registers` tables exist in 0001, but the application `register-store.ts` uses `docStore` (app_documents). **SQL shifts table is not used by the application.**

### Verified status: 🟡 PARTIAL — functional via docStore; SQL shifts table unused; no explicit auth in route

---

## Cross-cutting findings

### Auth coverage map (routes without explicit session call)

Confirmed routes with no `requireTenantSession`/`requireGmsAdmin`/`getRepository` in-file:

| Route | Effective auth | Risk if proxy bypassed |
|-------|---------------|------------------------|
| `/api/audit` | **NONE** | Anyone can read/write audit log |
| `/api/register` | `resolveDb` throws 500 | 500 error, not 401 |
| `/api/stocktake` | `resolveDb` throws 500 | 500 error, not 401 |
| `/api/transfers` | `resolveDb` throws 500 | 500 error, not 401 |
| `/api/purchase-orders` | `resolveDb` throws 500 | 500 error, not 401 |
| `/api/billing` | `resolveDb` throws 500 | 500 error, not 401 |
| `/api/print` | proxy only | **UNVERIFIED** — may expose printer |
| `/api/ai/settings` | proxy only | Anyone can read/write AI key |
| `/api/commerce/orders/[id]/fulfill` | `resolveDb` throws 500 | 500 error, not 401 |
| `/api/products/[id]/variants` | proxy only | Catalog data exposed |

### Race conditions confirmed

1. Receipt number: `count(*)+1` in `next_receipt_no` — not atomic under concurrency.
2. Card checkout webhook: `clientUuid: null` in `completePendingSaleDurable` disables idempotency.
3. Discount code max-use: non-atomic read-increment.
4. In-memory rate limiter on storefront orders: not shared across Vercel instances.

### Data correctness issues confirmed

1. Reports: capped 200 records, browser aggregation — **wrong data for active stores**.
2. Stocktake: writes local JSON override, not `branch_stock` — **does not update production stock**.
3. Transfers: blob only, no `adjust_stock` — **stock never moves between branches in durable mode**.
4. PO creation: `findById` resolves against local JSON products — **POs cannot reference Supabase-only products**.
5. Email order confirmation: shows product UUID, not name.

### Schema findings (corrected from first pass)

Table names in `0001` (`organizations`, `branch_stock`) match TypeScript types and later migrations. The "name drift" concern in the first audit was **not reproduced** in this pass. The concern about replayability remains: CI migrations are not tested against empty Postgres. The production schema may have been created differently.

---

## Final verification table

| Module | Claimed Status (audit) | Verified Status | Evidence | Risk |
|--------|----------------------|-----------------|----------|------|
| POS sale (create_sale) | PARTIAL | 🟡 PARTIAL | Route→repo→RPC chain proven; stock row lock not confirmed | MEDIUM — concurrent sales may race on receipt number |
| POS void | BROKEN | ✔ CONFIRMED BROKEN | RLS denies UPDATE on sales; no stock restore | HIGH — void silently fails in durable mode |
| POS offline queue | NOT IMPLEMENTED | ✔ CONFIRMED — localStorage retry only | `src/lib/offline-queue.ts` | HIGH — no durability |
| Storefront checkout | PARTIAL | 🟡 PARTIAL | Full trace proven; clientUuid=null on webhook disables idempotency; email shows UUIDs | HIGH — duplicate stock decrement on webhook retry |
| Payment webhook verify | PARTIAL | 🟡 PARTIAL | Verify-then-apply confirmed; duplicate webhook race possible | HIGH — double-decrement |
| PayHere signature | PARTIAL | ✅ VERIFIED | Test + `verifyWebhook` code path | LOW |
| Stripe webhook | PARTIAL | ✅ VERIFIED (code) | Sig check in adapter | LOW in code; UNVERIFIED live |
| Multi-tenancy (SQL core) | PARTIAL | ✅ VERIFIED | RLS + `current_org_id()` + DEFINER RPCs | LOW — service role path is residual risk |
| RLS core tables | PARTIAL | ✅ VERIFIED | 0003 + 0023 policies read | LOW for core |
| RLS post-0013 tables | UNVERIFIED | ❓ UNVERIFIED | Variants/storefront policies not read | MEDIUM |
| Auth — `requireTenantSession` | PARTIAL | ✅ VERIFIED (for routes that use it) | `auth-session.ts` confirmed | — |
| Auth — proxy optimistic | PARTIAL | ✔ CONFIRMED RISK | Cookie name match only | HIGH |
| GMS admin via `user_metadata` | BROKEN/risk | ✔ CONFIRMED RISK | `gms-auth.ts` L57 | CRITICAL — privilege escalation |
| Platform HQ fleet | PARTIAL | 🟡 PARTIAL | `reseller_licences` view + service role confirmed | LOW |
| Inventory ledger (adjust_stock) | PARTIAL | ✅ VERIFIED | `stock-store.ts` → `adjust_stock` RPC | LOW |
| Stocktake posting | PARTIAL | ✔ CONFIRMED BROKEN | `stocktake-store.ts` uses `upsertOverride` not `adjust_stock` | HIGH — counts don't update production stock |
| Transfers | PARTIAL | ✔ CONFIRMED BROKEN | `transfer-store.ts` is blob; no `adjust_stock` called | HIGH — stock never moves between branches |
| GRN (purchase receive) | PARTIAL | ✅ VERIFIED (receive step) | `po-store.receivePO` → `createStockDoc` → `adjust_stock` | LOW for receive; createPO broken for SQL-only products |
| PO creation | PARTIAL | 🔴 DOWNGRADED | `findById` reads local JSON, not Supabase catalog | HIGH — POs fail for most products |
| Categories UI (SQL) | PARTIAL | ✅ VERIFIED read path | `catalog-entity-store.ts` confirmed | LOW |
| Suppliers UI | PARTIAL | ✅ VERIFIED read path | SQL read confirmed | LOW |
| Audit log read | BROKEN | ✔ CONFIRMED — no auth | `audit/route.ts` L4 — no session check | CRITICAL |
| Audit log write | BROKEN | ✔ CONFIRMED — no auth + client-supplied actor | `audit/route.ts` L22 | CRITICAL |
| Audit log immutability | BROKEN | ✔ CONFIRMED — mutable array | `audit-logger.ts` L44 `.slice(0,500)` then overwrite | HIGH |
| Billing (licence) | PARTIAL | 🟡 PARTIAL | Route confirmed; no idempotency on payment apply; no explicit auth | MEDIUM |
| WhatsApp webhook | PARTIAL | ✅ VERIFIED (production path) | `requireSupabase` boolean used correctly | LOW in prod |
| WhatsApp inbox auth | PARTIAL | ⚠️ WEAK | No explicit session check; resolveDb implicit | MEDIUM |
| Email (Resend) | PARTIAL | ✅ VERIFIED | Real when configured; noop silent when not | LOW |
| Email order confirmation | PARTIAL | ✔ BUG — product UUID in email | `order/route.ts` L156: `String(l.productId)` | LOW severity, HIGH visibility |
| Jarvis chat auth | PARTIAL | ✅ VERIFIED | `runAgentChat` is STRONG marker | LOW |
| AI settings auth | PARTIAL | 🔴 DOWNGRADED | Proxy-only; no session check in file | MEDIUM |
| Reporting accuracy | PARTIAL | 🔴 DOWNGRADED TO BROKEN | 200-row cap; browser aggregation; wrong for active stores | HIGH |
| Register/shifts SQL | PARTIAL | ✔ CONFIRMED — SQL shifts table unused | App uses `docStore`, not `shifts` SQL table | MEDIUM |
| Rate limit (multi-instance) | PARTIAL | ✔ CONFIRMED BROKEN | In-memory `Map` in both proxy and order route | MEDIUM |
| Discount code max-use | PARTIAL | ✔ CONFIRMED RACE | Non-atomic read-increment | MEDIUM |
| Receipt number uniqueness | PARTIAL | ✔ CONFIRMED RACE | `count(*)+1` in `next_receipt_no` | HIGH |
| Returns (sale-linked) | MISSING | ✔ CONFIRMED MISSING | No sale_id in StockOperation | HIGH |
| Refunds | MISSING | ✔ CONFIRMED MISSING | No refund entity, no payment reversal | HIGH |
| Warehouses | MISSING | ✔ CONFIRMED MISSING | No SQL table | — |
| MFA / OAuth | MISSING | ✔ CONFIRMED MISSING | Supabase Auth feature; not wired in app | HIGH for SaaS |
| SMS transport | MISSING | ✔ CONFIRMED MISSING | Templates only | — |
| Offline POS (IndexedDB) | MISSING | ✔ CONFIRMED MISSING | localStorage queue only | HIGH |
| Subscription billing engine | MISSING | ✔ CONFIRMED MISSING | Licence JSON only | — |
| Reseller portal | MISSING | ✔ CONFIRMED MISSING | View only; no partner accounts | — |

---

## Summary of downgrades from first audit

| Claim | Direction | Key finding |
|-------|-----------|-------------|
| Void sale "BROKEN" | ✔ CONFIRMED BROKEN | RLS denies UPDATE; no stock restore |
| Stocktake "PARTIAL" | → CONFIRMED BROKEN | `upsertOverride` ≠ `adjust_stock`; stock not updated in durable mode |
| Transfers "PARTIAL" | → CONFIRMED BROKEN | Blob store; `adjust_stock` never called; stock doesn't move |
| PO creation "PARTIAL" | → DOWNGRADED | `findById` reads local JSON only |
| Reporting "PARTIAL" | → DOWNGRADED/BROKEN | 200 cap + browser agg = wrong data |
| Audit "BROKEN" | ✔ CONFIRMED BROKEN | No auth + mutable + unlinked from SQL audit_events |
| Webhook idempotency "PARTIAL" | → RISK CONFIRMED | `clientUuid: null` in durable webhook completion |
| GMS `user_metadata` | → CONFIRMED CRITICAL | Privilege escalation confirmed |
| Register shifts | → CONFIRMED SQL unused | `shifts` table exists but not used |
| Rate limit | → CONFIRMED BROKEN in prod | In-memory; not multi-instance |
| Email order confirmation | → BUG CONFIRMED | UUID as product name |
| Discount code | → RACE CONFIRMED | Non-atomic max-use |
| Receipt number | → RACE CONFIRMED | `count(*)+1` not atomic |
| Migration replayability | → Revised slightly: names consistent; replay still UNVERIFIED | CI gap, not name drift |

---

*End of second-pass verification. No files were created or modified except this report.*

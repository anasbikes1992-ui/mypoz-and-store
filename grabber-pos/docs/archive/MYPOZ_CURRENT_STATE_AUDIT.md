# MYPOZ CURRENT STATE AUDIT

**Product:** Grabber POS / MyPoz Commerce Cloud (`mypoz-commerce-cloud`)  
**Repo:** `D:\MyPoz & Store\grabber-pos`  
**Audit date:** 2026-08-24  
**Method:** Read-only inspection of this repository (migrations, Next.js app, tests, docs). No code, schema, env, or deploy changes.  
**Live production DB/Vercel dashboard:** **UNVERIFIED in this session** (no remote SQL/Vercel API queries were run for this report). Prior ops knowledge is labelled **UNVERIFIED-LIVE** where used.

**Evidence rule:** A screen existing is not proof the feature works. Status is derived from UI → API/store → DB/RPC → auth → side effects.

---

## 1. Executive summary

MyPoz is a **single Next.js 16 application** that already contains three planes:

1. **Tenant back-office + POS** — `src/app/(app)/*`
2. **Public storefront** — `src/app/store/[slug]/*` + `/api/store/*`
3. **Platform operator HQ** — `src/app/hq/*` + `/api/hq/*` (GMS admin, not tenant owner)

It is **not** a monorepo of separate commerce-core / HQ / storefront services. It is **one App Router codebase** with a **dual backend**:

| Mode | When | Persistence |
|------|------|-------------|
| Durable | `NEXT_PUBLIC_SUPABASE_URL` + anon key set **and** a real session | Supabase Postgres + RLS + SECURITY DEFINER RPCs |
| Demo | Supabase unset; production blocked unless `POS_ALLOW_DEMO=true` | JSON files under `data/` + in-memory/local stores |

**What is actually strong (code-proven):**

- Multi-tenant spine in SQL: organization → branches → profiles → products → branch stock → sales via `create_sale`
- Storefront + WhatsApp + POS intended to post into the **same `sales` ledger** (storefront maps into `createSale` / `create_sale`)
- PayHere + Stripe adapters + webhook verification + pending gateway ledger
- Licence/plan gating (`starter` / `business` / `enterprise` + extras), not a Stripe-subscription engine
- Platform HQ tenant list via `reseller_licences` view (service role) with demo fallback
- WAF + IP rate limit in `src/proxy.ts`
- WhatsApp Cloud API webhook + inbox stores
- Resend email (fail-soft if key missing)

**What is not a Commerce OS yet:**

- Most “modules” (SMS, payroll, CRM, hire-purchase, rooms, etc.) are **generic `app_collections` CRUD**, not domain engines
- **No warehouse entity** (stock is branch-only)
- **No true offline POS** (localStorage retry queue + service worker only)
- **No SMS transport**, **no MFA**, **no OAuth**
- SaaS billing is **licence document + invoice/PayHere**, not subscriptions/dunning/usage
- Reseller is a **licence view + HQ UI**, not partner accounts/commissions/white-label portals
- Reporting is **client-side aggregation of `/api/sales` + `/api/products`**, not a warehouse/OLAP layer
- Audit UI writes a **mutable JSON/document log** (and the POST handler has **no session check in-file**)
- **Git migrations are internally inconsistent** (see §7): `0001` table names do not match `0002`/`0003`/`0004` or TypeScript. A clean replay of `supabase/migrations` from empty is **not proven**.

**Distance to target “MyPoz Commerce OS”:** a working **POS + storefront + operator HQ** product with a blob-store for extra modules — **not** a layered platform (Platform HQ → SaaS → tenant provision → commerce core → events). Closest to target: tenancy + sale RPC + storefront. Farthest: warehouses, true returns/refunds, reseller network, subscription billing, offline POS, immutable audit.

---

## 2. Current architecture (ACTUAL)

```
Browser
  ├─ Tenant UI  src/app/(app)     cookie: sb-* or pos_session
  ├─ Storefront src/app/store/[slug]
  └─ HQ UI      src/app/hq        requireGmsAdmin()
        │
        ▼
src/proxy.ts  (Next 16 middleware replacement)
  WAF → rate limit → cookie presence (NOT JWT validation)
        │
        ▼
Route handlers src/app/api/**
  ├─ getRepository()     → LocalRepository | SupabaseRepository
  ├─ recordStore/docStore → data/*.json | app_collections / app_documents
  ├─ storefront-repo      → storefront_* DEFINER RPCs / service role
  └─ requireGmsAdmin / requireTenantSession (some routes only)
        │
        ▼
Supabase Auth + Postgres
  RLS: org_id = current_org_id()
  Writes for stock/sales: SECURITY DEFINER RPCs (intended)
  Service role: HQ, webhooks, anonymous storefront persistence
```

**Not present as separate apps in this repo:** queues (Redis/SQS), workers, mobile app source, warehouse service, billing microservice.

ARCHITECTURE.md still describes a **Flutter offline POS**. This repository contains **zero `.dart` files**. Mobile: **MISSING here / UNVERIFIED elsewhere**.

---

## 3. Repository structure

### Stack (from `package.json`)

| Item | Actual |
|------|--------|
| Framework | Next.js **16.2.11** (App Router) |
| React | **19.2.4** |
| TypeScript | **^5** (`devDependencies`) |
| Package manager | **UNVERIFIED** (lockfile not opened this pass; scripts are npm-style) |
| Monorepo | **No** — single Next app |
| UI | Tailwind 4, Zustand, Framer Motion |
| DB client | `@supabase/supabase-js` + `@supabase/ssr` |
| Validation | Zod 4 |
| Email | Resend |
| Tests | Vitest + Playwright (`test:e2e`) |
| Deploy config | `vercel.json` = `{ "framework": "nextjs" }` only |

### Map (purpose in code, not marketing)

| Path | Actual purpose |
|------|----------------|
| `src/app/(app)/` | Authenticated tenant shell (POS, inventory, ~80 module pages) |
| `src/app/hq/` | Platform operator console |
| `src/app/store/[slug]/` | Public tenant storefront |
| `src/app/api/` | ~100 Route Handlers |
| `src/proxy.ts` | Edge auth/WAF/rate-limit (not JWT verify) |
| `src/lib/server/repositories/` | POS catalog/sales seam (Local vs Supabase) |
| `src/lib/server/persistence/` | Generic JSON/`app_collections` seam |
| `src/lib/server/*-store.ts` | Module stores (stock, WhatsApp, gateway payments, tenant licence, …) |
| `src/lib/payments/gateways/` | PayHere, Stripe, WebXPay, OnePay, LankaPay adapters |
| `src/lib/collections.ts` | Schema for generic CRUD modules |
| `src/lib/plans.ts` | Plan entitlements |
| `supabase/migrations/` | 0001–0023 SQL |
| `data/` | Local demo JSON (when Supabase off) |
| `docs/` | Mixed: useful (SECURITY_AND_AUTH) and **stale/wrong** (DATABASE_MAP names, PRODUCT-GAP claims “all gaps closed”) |
| `scripts/` | Seed, ops smoke, admin upsert |
| `e2e/` | Playwright smoke |
| `src/lib/__tests__/` | Unit/integration tests |

### Dead / duplicate / demo / conflicting

| Kind | Evidence |
|------|----------|
| **Demo backend** | `LocalRepository`, `POS_ALLOW_DEMO`, default demo login `admin`/`admin123` when Supabase off (`src/app/api/auth/login/route.ts`) |
| **Dual catalog UI** | SQL `categories` vs `app_collections` “categories” (recent `catalog-entity-store` direction in conversation — **UNVERIFIED-LIVE** whether deployed) |
| **Dual audit** | SQL `audit_events` (0001) vs `audit-logger` document store |
| **Dual stock naming** | 0001 `branch_stock`/`stock_movements` vs 0003/app `branch_stock`/`stock_movements` vs later `adjust_stock` |
| **Stale docs** | `docs/DATABASE_MAP.md` claims folder “ends at 0018”; repo has **0023**. PRODUCT-GAP claims every gap closed — **not supported by code** |
| **Experimental/verticals** | Restaurant, rooms, rent, play, hire-purchase, reloads — mostly collection/JSON engines, not 0001 tables |
| **Conflicting env names** | `.env.example` uses `NEXT_PUBLIC_SUPABASE_URL`, `GMS_ADMIN_EMAILS`, `WHATSAPP_TOKEN`; code uses `NEXT_PUBLIC_SUPABASE_URL`, `GMS_ADMIN_EMAILS`, `WHATSAPP_TOKEN` (see §29) |

---

## 4. Route inventory

**Auth column meaning:** `proxy` = cookie presence only. `session` = handler calls `getUser` / `getRepository` / `requireTenantSession`. `gms` = `requireGmsAdmin`. `public` = listed in `PUBLIC_PATHS` or storefront.

**Production ready:** only if UI + API + durable DB + auth + tenant isolation are all proven. Generic collection pages are **not** production-grade commerce features.

### Public

| Route | Purpose | Auth | Tenant scoped | Backend | Production ready |
|-------|---------|------|---------------|---------|------------------|
| `/welcome` | Marketing/overview | public | no | static | UI only |
| `/privacy-policy`, `/terms-of-service`, `/data-deletion` | Legal | public | no | static | yes (content) |
| `/display` | Customer display | public | **UNVERIFIED** | **UNVERIFIED** | no as POS accessory |
| `/store/[slug]` + products/cart/checkout/pay | Storefront | public | slug→org | storefront RPCs | **PARTIAL** (depends on Supabase + payments) |
| `/api/store/*` | Catalog, order, pay, feeds, events | public | slug | SQL RPCs | **PARTIAL** |
| `/api/health` | Health | public | no | env checks | yes as probe |
| `/api/payments/webhook/[provider]` | Gateway webhooks | public + signature | payment row → org | gateway store | **PARTIAL** |
| `/api/whatsapp/webhook` | Meta webhook | public + HMAC | phone_number_id | WA stores | **PARTIAL** |
| `/sitemap.xml`, `/robots.txt` | SEO | public | no | static | yes |
| POST `/api/observability/events` | UX beacon | public | **weak** | **UNVERIFIED** | not a product feature |

### Authentication

| Route | Purpose | Auth | Notes | Production ready |
|-------|---------|------|-------|------------------|
| `/login` | Supabase password or demo POST | public | `signInWithPassword` when enabled | **PARTIAL** (no MFA) |
| `/forgot-password` | Reset request | public | API exists (`/api/auth/forgot-password`) | **PARTIAL** (Resend) |
| `/update-password` | Recovery | public | Supabase recovery flow | **UNVERIFIED** E2E |
| `/api/auth/login` | Demo cookie mint | public | **Disabled when Supabase on**; default `admin`/`admin123` | demo-only |
| `/api/store/[slug]/auth` | Shopper auth | public | storefront customer | **PARTIAL** |

Signup as a first-class tenant self-serve flow: **not found as a dedicated production signup product**. HQ onboard exists. **MISSING** consumer SaaS signup.

### Client HQ (tenant `(app)` pages)

There are **88** `page.tsx` files under `src/app/(app)/`. They share `(app)/layout.tsx` (TopBar, licence banner). Proxy requires a session cookie. **Role enforcement is not per-page in layout** (permissions module is separate).

| Route | Purpose | Backend connected | Production ready |
|-------|---------|-------------------|------------------|
| `/` launcher | Module tiles from `src/lib/modules.ts` | tiles only | UI |
| `/pos` | POS terminal | `/api/sales`, `/api/products`, cart Zustand | **PARTIAL** (core path real) |
| `/products`, `/inventory` | Catalog / stock UI | repository + product-admin | **PARTIAL** |
| `/sales` | History | `listSales` | **PARTIAL** |
| `/reports` | Aggregates in browser | sales+products APIs | **PARTIAL** (not a reporting engine) |
| `/categories` `/brands` `/suppliers` | Collections **or** SQL (if catalog-entity-store wired) | mixed | **PARTIAL** |
| `/customers` `/employees` `/sms` `/vouchers` … | `CollectionManager` | `app_collections` / JSON | **NOT commerce-grade** |
| `/returns` | `StockOperation type="return"` | stock-store (GRN-like restock) | **NOT sales-return engine** |
| `/transfers` `/stocktake` `/grn` `/purchase-orders` | Dedicated APIs exist | stock RPCs / collections | **PARTIAL** |
| `/commerce/*` | Online store admin | commerce APIs + documents | **PARTIAL** |
| `/whatsapp` | WA settings + inbox | WA APIs | **PARTIAL** |
| `/billing` | Plan/licence | `/api/billing` | **PARTIAL** (not subscriptions) |
| `/audit` | Audit UI | `/api/audit` **no requireTenantSession in file** | **WEAK** |
| `/assistant` `/knowledge` | Jarvis | OpenAI + tenant KB | **PARTIAL** |
| `/restaurant` `/rooms` `/rent` `/repair` `/play` `/hire-purchase` `/reloads` `/kds` | Vertical UIs | mostly collections/JSON | **THIN** |
| `/admin` | Tenant admin | tenant document | **PARTIAL** (not Platform HQ) |
| `/register` | Shift open/close | `/api/register` | **PARTIAL** |

### POS

| Route | Purpose | Auth | Backend | Production ready |
|-------|---------|------|---------|------------------|
| `/pos` | Terminal | proxy | `create_sale` via `/api/sales` | **PARTIAL** |
| `/api/sales` GET/POST | List/create | `getRepository` → getUser | SQL or JSON | **PARTIAL** |
| `/api/sales/[id]/void` | Void | repository `voidSale` | **direct `sales` update** | **RISKY / possibly broken under RLS** |
| `/api/held-bills` | Parked bills | store | collections/JSON | **PARTIAL** |
| `/api/print` | Print | **auth census residual** | printer env | **UNVERIFIED** |

### Storefront

Covered above. Checkout → `/api/store/[slug]/order` → `placeStorefrontOrder` → same sale path when Supabase on (`assertNoLocalFallbackForPublicOrders`).

### Platform HQ

| Route | Purpose | Auth | Backend | Production ready |
|-------|---------|------|---------|------------------|
| `/hq` | Command center | `getGmsAdmin` in layout | `hq-repo` | **PARTIAL** |
| `/hq/tenants`, `/hq/tenants/[id]` | Fleet / tenant ops | gms | service role + view | **PARTIAL** |
| `/hq/onboard` | Provision | gms | HQ APIs | **PARTIAL** |
| `/hq/tickets` | Support tickets | gms | store | **PARTIAL** |
| `/hq/whatsapp` | Fleet WA | gms | `/api/hq/whatsapp` | **PARTIAL** |
| `/hq/jarvis` | HQ AI | gms | `/api/hq/ai/chat` | **PARTIAL** |
| `/hq/config` `/hq/backups` `/hq/licences` `/hq/docs` | Ops | gms | mixed | **PARTIAL** |
| `/api/hq/*` | All sampled handlers call `requireGmsAdmin` | gms | service role | better than tenant APIs |

### Reseller

**No** `/reseller` app. Reseller = HQ view `reseller_licences` + tenant branding document. **NOT a reseller portal.**

### Admin

`/admin` is **tenant** admin, not platform. Platform is `/hq`.

### API routes

~100 `route.ts` files. Auth census test (`src/lib/server/__tests__/api-auth-census.test.ts`) documents **residuals that do not import strong session helpers**, including:

- `audit/route.ts`
- `ai/settings/route.ts`
- `commerce/discounts/validate/route.ts` (name may differ vs file `commerce/discounts/validate`)
- `print/route.ts`
- `products/template/route.ts`
- `products/[id]/variants/route.ts`

Those rely on **proxy cookie presence**. That is **not** production-grade authorization.

---

## 5. Authentication

### ACTUAL IMPLEMENTATION

| Capability | Status | Evidence |
|------------|--------|----------|
| Login (Supabase) | **PARTIAL** | `src/app/login/page.tsx` → `supabase.auth.signInWithPassword` |
| Login (demo) | Demo-only | `POST /api/auth/login`; blocked if Supabase enabled; prod requires `POS_ALLOW_DEMO` |
| Signup | **MISSING** as productized tenant signup | HQ onboard only |
| Password reset | **PARTIAL** | `/forgot-password` + `/api/auth/forgot-password` (Resend path in later commits) |
| Email verification | **UNVERIFIED** | Depends on Supabase Auth settings, not app code |
| Session | Supabase SSR cookies `sb-*` | `src/lib/supabase/server.ts` |
| Demo session | HMAC cookie `pos_session` | `src/lib/server/session.ts`; **throws if `POS_SESSION_SECRET` missing** |
| Refresh tokens | Supabase SDK | **UNVERIFIED** app-level handling |
| Middleware | `src/proxy.ts` | Cookie **presence**, not `getUser()` |
| Protected UI | Redirect `/login` | Optimistic |
| Logout | **PARTIAL** | Demo DELETE on login route; Supabase signOut **UNVERIFIED** in this pass |
| Session revocation | **MISSING** in-app | Supabase dashboard only |
| Device/session mgmt | **MISSING** | |
| Rate limiting | **PARTIAL** | `apiRateLimit` in proxy; in-memory → **not multi-instance safe** |
| Brute-force | **PARTIAL** | WAF/ban in proxy; login has timing-safe compare for demo only |
| MFA | **MISSING** | |
| OAuth | **MISSING** | |

### Security problems (code-proven)

1. **Proxy does not validate JWT** — stolen/expired `sb-` cookies pass the edge until a handler calls `getUser()`. Documented in `docs/SECURITY_AND_AUTH.md`.
2. **`user_metadata.role = gms_admin` is trusted** in `getGmsAdmin()` (`src/lib/server/gms-auth.ts`). Users can often edit `user_metadata`; **app_metadata** is the safe place. This is a **privilege-escalation risk** if metadata is client-writable.
3. **Demo defaults** `POS_USER`/`POS_PASSWORD` default `admin`/`admin123` when demo login is enabled.
4. **`requireTenantSession` demo path** (`src/lib/server/auth-session.ts`) returns `role: "owner"` and `orgId: "demo"` when Supabase is off.
5. **`/api/audit` POST** accepts `actor` from the client and has **no `requireTenantSession`**.
6. **Branch selection** in `getRepository()`: first active branch in org — not an explicit register/terminal choice. Cashiers cannot pick branch in this seam (limits multi-branch POS).

### Files

- `src/proxy.ts`
- `src/app/login/page.tsx`
- `src/app/api/auth/login/route.ts`
- `src/lib/server/session.ts`
- `src/lib/server/gms-auth.ts`
- `src/lib/server/auth-session.ts`
- `src/lib/supabase/config.ts`, `server.ts`

---

## 6. Multi-tenancy

### ACTUAL

**Tenant identifier:** `organizations.id` (UUID), public key `organizations.slug`.  
**User↔tenant:** `profiles.org_id` + `profiles.role` (`owner` \| `manager` \| `cashier` in 0001).

**How org is determined (durable mode):**

- JWT `auth.uid()` → `profiles` → `current_org_id()` (0002) used by RLS.
- Storefront: **host + slug** → DEFINER RPCs (not shopper JWT).
- WhatsApp: `phone_number_id` resolver (types mention `whatsapp_resolve_org`).
- HQ: **service role** bypasses RLS; must filter by `org_id` in application code.

**Can the browser send `org_id`?** Many collection stores should use `current_org_id()` defaults. Any service-role query that takes org from the client is a stop-the-line risk. Storefront slug is client-visible by design (public catalog).

**RLS:** Enabled in `0003_rls.sql` on core tables. Later `0019`, `0023` harden. **Service role bypasses RLS** — HQ, webhooks, storefront persistence depend on correct org resolution in TS.

**Can tenant A read tenant B?**  
- Authenticated JWT + RLS: **designed no**.  
- Service role bug: **yes**.  
- Demo JSON: **single shared local store** — not multi-tenant.  
- HQ with service role: **yes, by design**.

**Platform vs client:** Tenant owner is **not** GMS admin unless email allowlist or `gms_admin` metadata. Empty `GMS_ADMIN_EMAILS` does **not** open HQ (good).

**Isolation verdict:** **PARTIAL / designed for SQL core; UNVERIFIED for every `app_collections` row and every service-role helper.** Blob modules inherit `org_id` if written through `recordStore` with RLS client — **not** if someone uses service role without filter.

---

## 7. Database forensic audit

### P0: migration set is not a single coherent schema

| Source | Tenant table names | Stock | Sale RPC |
|--------|-------------------|-------|----------|
| `0001_schema.sql` | `organizations`, `profiles` | `branch_stock`, `stock_movements` | tables `sales` / `sale_lines` |
| `0002_functions.sql` | `current_org_id()` reads **`profiles`** | uses `branch_stock`, `create_sale` | `create_sale(jsonb)` |
| `0003_rls.sql` | **`organizations`, `profiles`** | **`branch_stock`, `stock_movements`** | `sale_lines` |
| `0004_catalog_rpc.sql` | `current_org_id()`, `product_barcodes`, `sale_price` | `branch_stock` | `catalog(...)` |
| TypeScript (`database.types.ts`, repos) | **`organizations`, `profiles`, `branch_stock`** | | **`create_sale`** |
| `0023_launch_rls_hardening.sql` | revokes **`create_sale(jsonb)`**, `adjust_stock`, `catalog(...)` | | |

**0001 cannot be applied then 0003** if 0001 never created `organizations`. **0002 cannot compile against 0001** if 0001 has `selling_price` but 0002 reads `sale_price`.

**Implication:** Either production was created from a **different historical schema** (names matching the app), or migrations were edited in place. **Fresh migrate-from-zero: UNVERIFIED / likely FAIL.** Do not treat `supabase/migrations` as a replayable source of truth until reconciled.

### Tables that **do** exist in git (union of migrations)

**Core (0001 as written):** `organizations`, `branches`, `profiles`, `branch_members`, `suppliers`, `categories`, `products`, `product_barcodes`, `branch_stock`, `stock_movements`, `purchases`, `purchase_lines`, `registers`, `shifts`, `sales`, `sale_lines`, `payments`, `audit_events`.

**Module blob (0005/0006):** `app_collections`, `app_documents`, `stock_documents`; view `reseller_licences`; dropped `app_settings`, `restaurant_orders`.

**Commerce (0007–0013+):** `storefronts`, `store_collections`, `product_variants`, `variant_branch_stock`, media, platform_settings, WhatsApp-related functions, UX events, wholesale tiers (0022), receipt counters (0021).

### Per-table template (core)

| Table | Purpose | Tenant scoped | PK | RLS (0003 intent) | Risks |
|-------|---------|---------------|----|-------------------|-------|
| organizations | Tenant | self | uuid | select own | slug unique |
| branches | Locations | org_id | uuid | read all org; write owner/manager | **no warehouse** |
| profiles | Staff | org_id | auth.users | owner writes | 1 org per user |
| products | Catalog | org_id | uuid | manager write | unique (org, sku) in 0001 |
| branch_stock / branch_stock | Qty | via branch | composite | **read-only client** | name drift |
| stock_movements | Ledger | org | uuid | read-only | append-only intent |
| sales | Ledger | org | uuid | **read-only client** | voids via UPDATE in TS |
| app_collections | Catch-all modules | org_id default | record | policies in 0006 | **no FKs, weak integrity** |
| app_documents | Settings/licence | org+key | composite | RLS | licence is JSON not table |
| platform_settings | HQ config | **no tenant RLS** | | service role | cross-tenant by design |
| reseller_licences | View | all orgs | | revoked from authenticated | service role only |

**Missing vs Commerce OS:** `warehouses`, `reservations`, `refunds`, `return_orders`, `subscriptions`, `reseller_accounts`, `commissions`, `feature_flags` table, `immutable_audit` append-only with no UPDATE policy.

**Integrity issues:**

- `app_collections`: no FK to products/customers; orphan-by-design
- `create_sale` idempotency on `client_uuid` (0002) — good for retries
- `next_receipt_no` uses `count(*)+1` for daily seq — **race** under concurrency
- Void path does not go through DEFINER RPC
- Cascades: org delete cascades almost everything (dangerous for “suspend tenant”)

---

## 8. Product catalogue

| Capability | Status | Evidence |
|------------|--------|----------|
| Products | **PARTIAL** | SQL `products` + admin store + import |
| Variants | **PARTIAL** | `0011_product_variants.sql`, `/api/products/[id]/variants`, `/variants` page |
| SKU | **YES** | unique (org, sku) in 0001 |
| Barcode | **YES** | `product_barcodes` + `product_by_barcode` RPC |
| Categories | **PARTIAL** | SQL table **and** collection “categories” |
| Brands | **PARTIAL** | `products.brand` text; collection “brands”; not a brands table in 0001 |
| Attributes | **MISSING** as EAV | |
| Images | **PARTIAL** | media store / product image API |
| Descriptions | **PARTIAL** | commerce columns 0010 |
| Cost / sale / wholesale | **YES** | 0001 + wholesale 0022 |
| Customer-specific price | **MISSING** (tier field on collection customers only) | |
| Branch-specific price | **MISSING** | |
| Promotions / discount codes | **PARTIAL** | collection + `commerce/discounts/validate` |
| Bundles/kits | **PARTIAL** | packages collection + expand API |
| UOM | **MISSING** | |
| Status | **YES** | `is_active` |
| Reorder level | **YES** | `reorder_point` / `reorder_level` naming drift |

**POS vs storefront:** intended same `products` + `storefront_catalog` RPC. Duplicate **UI** collections vs SQL was a known Anaz bug.

---

## 9. Inventory

### ACTUAL flow (intended)

Purchase/GRN/adjustment → `adjust_stock` / `receive_purchase` DEFINER → `branch_stock` + movement rows.  
POS/online sale → `create_sale` → decrement + movement `reason = sale`.

`stock-store.ts` documents: durable path writes `stock_documents` + `adjust_stock`; **never client UPDATE on stock**.

| Topic | Status |
|-------|--------|
| True ledger | **PARTIAL** — designed append-only; void may skip ledger |
| Direct mutate | Forbidden by RLS on stock; **voidSale updates `sales` directly** |
| Transactional sale | **YES** if `create_sale` is the only writer |
| Reservation | **MISSING** |
| Oversell | `create_sale` fail-closed on qty (0002) |
| Concurrent POS | Relies on row locks inside RPC — **UNVERIFIED** `FOR UPDATE` |
| Transfers | API `transfers` + approve + audit log |
| Stocktake | API post + audit |
| Damages | stock-store type damage |
| Warehouses | **MISSING** |

**Returns page** restocks via stock operation — **not** linked to original `sale_id` as a first-class return entity.

---

## 10. POS

### ACTUAL (web)

UI: `src/app/(app)/pos/page.tsx` + `BillPanel` / `ProductGrid` + Zustand `cart-store`.

Flow: scan/search → cart → discount (capped `max_discount` in RPC) → payment cash/card/wholesale/mixed → `POST /api/sales` → `create_sale`.

| Feature | Status |
|---------|--------|
| Barcode | RPC `product_by_barcode` |
| Search | `catalog` RPC |
| Cart | client Zustand; **server recomputes prices** |
| Taxes | columns exist; **UNVERIFIED** full tax engine |
| Split tender | UI claimed in FEATURE-PLAN; RPC payload has `payments[]` optional |
| Receipt / reprint | print API + invoice route |
| Void | **WEAK** (direct update) |
| Refund | **MISSING** as payment reversal |
| Shifts | `registers`/`shifts` + `/register` |
| Cash drawer | audit action `drawer.manual_open`; hardware **UNVERIFIED** |
| Offline | **NOT IMPLEMENTED** as POS (see §11) |

**Production capable?** For a **single-branch online cashier** with Supabase: **conditionally yes**. For multi-register offline + fiscal + full tender: **no**.

---

## 11. Offline POS

**NOT IMPLEMENTED** as a durable local ledger.

What exists:

- `src/lib/offline-queue.ts` — **localStorage** queue of failed `POST /api/sales`, flush on online
- `OfflineSetup` registers `/sw.js`

What does **not** exist: IndexedDB product DB, outbox with conflict rules, device clock, background sync protocol.

localStorage is not an offline POS.

Flutter offline queue is documented only — **not in this repo**.

---

## 12. Orders

**There is no separate `orders` table in 0001.** Online checkout creates a **`sales` row** (plus storefront order documents / WhatsApp order tables in later migrations).

POS `sale_status`: `completed` \| `voided` (0001).

Storefront/commerce adds fulfillment/payment fields in later migrations (`0013`, gateway pending).

| Target state | Actual |
|--------------|--------|
| DRAFT → PAID → FULFILLED | **PARTIAL** — card pending then webhook `completePendingSale` |
| Server enforcement | DEFINER for create; fulfill APIs exist |
| Notifications | email on storefront order; WA optional |
| Audit | narrow |

Commerce UI `/commerce/orders` is an operator view over that hybrid — **PARTIAL**.

---

## 13. Payments

| Provider | Code | Secrets | Webhook verify | Idempotency | Refunds | Production ready |
|----------|------|---------|----------------|-------------|---------|------------------|
| PayHere | `payhere.ts` | `PAYHERE_MERCHANT_ID/SECRET` | yes (adapter) | pending row | **MISSING** in-app | **PARTIAL** |
| Stripe | `stripe.ts` | `STRIPE_SECRET_KEY`, webhook secret | signature | pending row | **MISSING** | **PARTIAL** |
| WebXPay | adapter | env | **UNVERIFIED** depth | | | **PARTIAL** |
| OnePay | adapter | | | | | **PARTIAL** |
| LankaPay | adapter | | | | | **PARTIAL** |
| Cash | POS | n/a | n/a | client_uuid | void only | **PARTIAL** |
| Card POS | pending not on `create_sale` | throws in `SupabaseRepository.createSale` if `status === pending` | | | **GAP** |

LankaPay / OnePay / WebXPay: **code exists**; live config **UNVERIFIED**.

Secrets: server `process.env` in gateway files — **not** `NEXT_PUBLIC_` for secrets (good). Merchant public IDs may be public by design.

---

## 14. Returns and refunds

| Need | Actual |
|------|--------|
| Full/partial return | **MISSING** as sale-linked entity |
| Exchange | **MISSING** |
| Store credit | collection customers `creditLimit` field only |
| Cash refund / original payment | **MISSING** |
| Approval workflow | **MISSING** |
| Inventory restore | **PARTIAL** via `/returns` stock op (unlinked) |
| Audit | stocktake/transfer only mostly |

**Verdict:** restock UI exists; **returns/refunds product does not**.

---

## 15. Client HQ

`(app)` **is** the client OS UI. Depth:

| Feature | UI | API | DB | Real data | Isolation | Production |
|---------|----|-----|-----|-----------|-----------|------------|
| Dashboard | yes | sales/products | SQL or JSON | if Supabase | RLS | PARTIAL |
| Products | yes | yes | SQL | yes | RLS | PARTIAL |
| Inventory | yes | stock APIs | SQL | yes | RLS | PARTIAL |
| Branches | **thin** | profiles/branches | SQL | | | PARTIAL |
| Warehouses | no | no | no | | | MISSING |
| POS | yes | sales | SQL | yes | | PARTIAL |
| Orders | commerce | yes | sales+docs | | | PARTIAL |
| Customers | CollectionManager | collections | blob | | org blob | NOT OS-grade |
| Suppliers | mixed | | SQL + blob | | | PARTIAL |
| Purchasing | PO + GRN | yes | SQL purchases + blob | | | PARTIAL |
| Payments | billing + manual | | | | | PARTIAL |
| Returns | stock op | stock | | | | WEAK |
| Reports | client agg | GET lists | | | | WEAK |
| Employees | collection | blob | | | | WEAK |
| Roles | permissions API | doc | | | | PARTIAL |
| Settings | yes | `/api/settings` | documents | | | PARTIAL |
| Storefront | commerce/* | yes | | | | PARTIAL |
| WhatsApp | yes | yes | blob+SQL | | | PARTIAL |
| Delivery | yes | delivery APIs | blob | | | PARTIAL |
| Marketing | page | | | | | THIN |
| Audit | yes | weak auth | mutable doc | | | WEAK |

---

## 16. Platform HQ

**EXISTS** as `/hq`, gated by `requireGmsAdmin`.

Has: tenant list, onboard, tickets, WhatsApp fleet, Jarvis HQ, config, backups, licences, docs.

Does **not** have a full: usage metering, feature-flag service, health SLOs, reseller hierarchy, Stripe Connect, impersonation audit trail (HQ password reset exists — high risk).

**Do not confuse** `/admin` (tenant) with `/hq` (platform).

---

## 17. SaaS

| Piece | Actual |
|-------|--------|
| Plans | `starter` / `business` / `enterprise` + `extras[]` in `src/lib/plans.ts` |
| Entitlements | `planEnabledKeys` + `/api/tenant` |
| Storage | `app_documents` key `tenant` (`tenant-store.ts`) |
| Billing UX | invoice email, PayHere licence payment, HQ upgrade request |
| Subscriptions table | **MISSING** |
| Dunning / trials as data model | **MISSING** (expiry date on licence JSON) |
| Feature flags | extras array, not LaunchDarkly |

---

## 18. Resellers

| Piece | Actual |
|-------|--------|
| `reseller_licences` view | **YES** (0006), service role |
| Reseller login / portal | **MISSING** |
| Commissions | **MISSING** |
| White-label | tenant `brand` document | **PARTIAL** |
| Provisioning | HQ tenants API | **PARTIAL** |

---

## 19. Storefront

Trace: `getStorefrontCatalog` → `storefront_catalog` RPC → cart page → `POST .../order` → `placeStorefrontOrder` → `createSale` / pending card → webhook.

**Same engine as POS:** intended **yes** for SKU/stock/sales. CMS/theme is `app_documents` / commerce publish — **parallel presentation layer**, not a second catalog table (0008 comment).

Duplicate logic: LocalRepository vs SQL; collection categories vs SQL categories.

---

## 20. WhatsApp

| Piece | Status |
|-------|--------|
| Cloud API send | `src/lib/server/whatsapp.ts` |
| Webhook verify | HMAC; demo unsigned if no secret and not `requireSupabase` |
| Inbox | `whatsapp-inbox-store` collections |
| Order via WA | `0014_whatsapp_orders.sql` + bot |
| Catalog CSV | `/api/store/[slug]/catalog` (Meta feed) |
| Campaigns / broadcast | **MISSING** as product |
| Abandoned cart | **MISSING** |
| AI assistant | Jarvis tools, not WA-native NLU platform |
| Inbox route auth | **review** — census/HQ agent flagged weaker than settings route |

---

## 21. Customers

No first-class `customers` table in 0001. Storefront has `storefront-customers-store`. POS uses name/mobile on `sales`. CRM/loyalty pages = collections + `loyalty` API.

Loyalty ledger tests exist (`loyalty-ledger.test.ts`) — **PARTIAL**.

Segmentation/marketing consent: **MISSING** as GDPR-grade.

---

## 22. Reporting

`src/app/(app)/reports/page.tsx` fetches `/api/sales` and `/api/products?pageSize=200` and computes in the browser.

| Metric | Real? |
|--------|--------|
| Sales totals | **YES** if repository is Supabase (capped 200 sales) |
| Profit | **UNVERIFIED** / likely incomplete (cost on products, not COGS engine) |
| Tax / cashier / purchasing reports | **MISSING** as dedicated queries |

**MOCK:** only when LocalRepository / demo JSON is active.

---

## 23. Audit logging

| Layer | Actual |
|-------|--------|
| SQL `audit_events` | 0001; `create_sale` writes (ARCHITECTURE.md) |
| App `audit-logger` | mutable array in `app_documents` / JSON; **last 500**; **GET/POST `/api/audit` unauthenticated in-handler** |
| Coverage | cart, discount, drawer, sale, register, stocktake, transfer, licence — **not** login, price list change, permission change |

Logs **can be modified** (document overwrite). **Not** WORM.

---

## 24. Security

| Check | Result | Location |
|-------|--------|----------|
| Secrets in repo | **NOT FOUND** in sampled source; `.env*` gitignored | |
| Hardcoded demo password | **FOUND** default `admin123` | `api/auth/login/route.ts` |
| Client-side authorization | **FOUND** pattern | proxy-only APIs |
| RLS | **FOUND** but migration name drift | 0003, 0019, 0023 |
| SQL injection | RPCs use parameters; **UNVERIFIED** all dynamic SQL | |
| XSS | React default escape; **UNVERIFIED** `dangerouslySetInnerHTML` | |
| CSRF | SameSite cookies; no CSRF tokens | **PARTIAL** |
| IDOR | slug-based storefront OK; HQ service role **HIGH** | |
| File upload | media routes — **UNVERIFIED** type/size | |
| Service role in client bundle | **NOT FOUND** (server-only imports) | |
| Webhook unsigned demo | **FOUND** | whatsapp webhook |
| GMS via user_metadata | **FOUND** | gms-auth.ts |

---

## 25. Performance

| Issue | Evidence |
|-------|----------|
| Reports load 200 products + 200 sales | `reports/page.tsx` |
| `salesStats` may load all sales totals | `SupabaseRepository.salesStats` `select("total")` without date range on allRes |
| Catalog pagination | POS catalog RPC paged; products page pagination added later (**UNVERIFIED-LIVE**) |
| Rate limit memory | not shared across Vercel instances |
| N+1 | blob collections **likely** |
| Images | Next image + media bucket **PARTIAL** |
| Realtime | commerce orders `live` route exists — **UNVERIFIED** scale |

---

## 26. Error handling

| Case | Actual |
|------|--------|
| Failed payment | webhook `verified: false` → 202; pending stays | **PARTIAL** |
| Duplicate sale retry | `client_uuid` idempotency | **GOOD** (if RPC deployed) |
| Expired session | proxy may still pass; handler 401 | **PARTIAL** |
| Insufficient stock | RPC exception | **GOOD** if used |
| Concurrent stock | **UNVERIFIED** locking |
| Webhook retry | depends on gateway; ledger should be idempotent | **UNVERIFIED** |
| Demo fallback in prod | blocked unless `POS_ALLOW_DEMO` | **GOOD** |

---

## 27. Testing

| Type | Actual |
|------|--------|
| Unit (Vitest) | plans, permissions, PayHere, WAF, collections, WhatsApp signature, money-path, etc. |
| Integration | `stores.integration.test.ts` |
| API auth census | snapshots weak routes |
| E2E Playwright | `e2e/smoke.spec.ts`, `app.spec.ts`; default baseURL production host |
| RLS tests | **MISSING** as automated Postgres tests |
| Payment tests | PayHere unit; **no** live webhook harness |
| POS tests | money-path / validation; **no** full RPC integration against local Postgres in this pass |

**Missing:** RLS suite, load test, migration replay CI.

---

## 28. Deployment

| Item | Actual |
|------|--------|
| Host | docs: `mypoz-and-store-ui.vercel.app` |
| Vercel | framework-only `vercel.json` |
| CI | **UNVERIFIED** this pass (`.github` not listed) |
| Staging | **UNVERIFIED** |
| Migrations | operator `supabase db push`; **replay broken** (name drift) |
| Monitoring | observability page + events API; **not** APM |
| Backups | HQ backup export API; **not** PITR proof in app |
| Preview env | Vercel default **UNVERIFIED** |

Production “safe”? **Only if** remote schema matches **app names** (`organizations`/`create_sale`), RLS 0023 applied, secrets set, demo off. Git folder alone is **not** a safe rebuild path.

---

## 29. Environment variables (NAMES ONLY)

### PUBLIC (`NEXT_PUBLIC_*`)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`

**.env.example also lists:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — **duplicate/conflicting naming vs code.**

### SERVER / AUTH / DEMO

`SUPABASE_SERVICE_ROLE_KEY`, `POS_ALLOW_DEMO`, `POS_USER`, `POS_PASSWORD`, `POS_SESSION_SECRET`, `GMS_ADMIN_EMAILS`, `GMS_ADMIN_USERS`

**.env.example:** `GMS_ADMIN_EMAILS`, `GMS_ADMIN_USERS`, `POS_ALLOW_DEMO`, `POS_SESSION_SECRET` — **does not match code names.**

### PAYMENT

`PAYHERE_MERCHANT_ID`, `PAYHERE_MERCHANT_SECRET`, `PAYHERE_SANDBOX`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYMENTS_LKR_PROVIDER`, plus WebXPay/OnePay/LankaPay vars in adapters (**UNVERIFIED** full list)

**.env.example** uses `PAYHERE_*`, `WEBXPAY_*`, `PAYMENTS_LKR_PROVIDER` — **partial mismatch**.

### WHATSAPP

Code: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_API_VERSION`  
Example file: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, … — **mismatch**.

### AI / EMAIL

`OPENAI_API_KEY`, `OPENAI_MODEL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO`  
Example: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` — **mismatch**.

### OTHER

`UPSERT_ADMIN_*` (scripts only), `PRINTER_*_IP`, `MYPOS_BANK_INSTRUCTIONS`, `POS_ALLOW_DEMO`

**Incorrectly exposed:** none of the secret keys should be `NEXT_PUBLIC_`. Anon key is public by design.

---

## 30. Integrations

| Integration | Code exists | Configured | Used | Production ready |
|-------------|-------------|------------|------|------------------|
| Supabase | yes | **UNVERIFIED-LIVE** | yes | PARTIAL (schema drift) |
| Vercel | yes | docs | yes | PARTIAL |
| PayHere | yes | env | billing + store | PARTIAL |
| Stripe | yes | env | USD path | PARTIAL |
| WebXPay/OnePay/LankaPay | yes | env | picker | UNVERIFIED |
| WhatsApp Cloud | yes | env | webhook+send | PARTIAL |
| Resend | yes | env | orders/licence | PARTIAL (noop without key) |
| OpenAI | yes | env | Jarvis | PARTIAL |
| SMS | templates only | no transport | no | MISSING |
| Maps | not found | | | MISSING |
| Shipping carriers | not found | | | MISSING |
| Accounting (Xero etc.) | not found | | | MISSING |

---

## 31. Feature matrix

Legend: ✅ COMPLETE · 🟡 PARTIAL · 🔴 MISSING · ⚠️ BROKEN · ❓ UNVERIFIED

| Feature | UI | API | DB | Auth | Tenant isolation | Real data | Tests | Status |
|---------|----|-----|-----|------|------------------|-----------|-------|--------|
| POS sale | ✅ | ✅ | ✅ RPC | 🟡 | 🟡 RLS | 🟡 | 🟡 | 🟡 |
| Offline POS | 🟡 SW | 🟡 queue | 🔴 | 🟡 | 🔴 | 🔴 | 🔴 | 🔴 |
| Catalog SQL | ✅ | ✅ | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 |
| Variants | ✅ | ✅ | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 |
| Inventory ledger | ✅ | ✅ | 🟡 name drift | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 |
| Warehouses | 🔴 | 🔴 | 🔴 | — | — | — | 🔴 | 🔴 |
| Storefront | ✅ | ✅ | ✅ | public | slug | 🟡 | 🟡 | 🟡 |
| WhatsApp | ✅ | ✅ | 🟡 | 🟡 | phone id | 🟡 | 🟡 | 🟡 |
| PayHere/Stripe | ✅ | ✅ | blob ledger | webhook | via ref | 🟡 | 🟡 | 🟡 |
| Refunds | 🔴 | 🔴 | 🔴 | — | — | — | 🔴 | 🔴 |
| Returns (sale-linked) | ⚠️ restock only | 🟡 | 🔴 | 🟡 | 🟡 | 🟡 | 🔴 | ⚠️ |
| Client HQ modules (SMS, payroll, …) | ✅ | collections | blob | 🟡 | 🟡 | 🟡 | 🔴 | 🟡 |
| Platform HQ | ✅ | ✅ | view+service | gms | bypass RLS | 🟡 | 🟡 | 🟡 |
| SaaS subscriptions | 🟡 licence | 🟡 | JSON | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 |
| Resellers | 🟡 HQ | 🟡 | view | gms | — | 🟡 | 🔴 | 🔴 |
| Reports | ✅ | list APIs | no cube | 🟡 | 🟡 | 🟡 | 🔴 | 🟡 |
| Audit WORM | ⚠️ | ⚠️ | dual | ⚠️ | 🟡 | 🟡 | 🔴 | ⚠️ |
| Jarvis | ✅ | ✅ | KB | 🟡 | plan gate | 🟡 | 🟡 | 🟡 |
| MFA | 🔴 | 🔴 | 🔴 | 🔴 | — | — | 🔴 | 🔴 |
| Flutter app | 🔴 this repo | | | | | | | 🔴 |

---

## 32. Architecture gap analysis

| Layer | CURRENT | TARGET | GAP | RISK | RECOMMENDATION |
|-------|---------|--------|-----|------|----------------|
| Platform HQ | Next `/hq` + service role | Control plane service | Same app, RLS bypass | Cross-tenant leak | Keep HQ; isolate service-role modules; never trust user_metadata |
| SaaS billing | Licence JSON + PayHere | Subscriptions | No recurring engine | Revenue leakage | Keep licence; add billing provider later |
| Provisioning | HQ onboard scripts | Automated tenant factory | Manual | Drift | Codify one provision RPC |
| Client MyPoz | `(app)` + dual store | One commerce core | Blob verticals | Fake features | Promote or hide modules |
| Commerce core | `create_sale` + stock RPC | Single engine | Void/refund/reserve missing | Integrity | RPC-only mutations |
| Events | thin observability | bus → WA/analytics | No bus | Dual writes | Outbox later |
| Schema | conflicting migrations | One linear history | Cannot rebuild | Outage | Baseline prod with `pg_dump`, archive git SQL |

---

## 33. KEEP / REFACTOR / REBUILD / REMOVE / MISSING

| Module | Class | Why |
|--------|-------|-----|
| `create_sale` + catalog RPCs | **KEEP** | Real money path |
| Storefront slug RPCs | **KEEP** | Public commerce |
| `proxy.ts` WAF/rate limit | **KEEP** + **REFACTOR** | Add real session verify on sensitive routes |
| `getRepository` seam | **KEEP** | Demo vs prod |
| Platform `/hq` + `requireGmsAdmin` | **KEEP** + **REFACTOR** | Drop `user_metadata` trust |
| PayHere/Stripe adapters | **KEEP** | |
| WhatsApp webhook + catalog feed | **KEEP** | |
| Licence/plans | **KEEP** | Good enough SaaS v1 |
| `app_collections` verticals | **REFACTOR** or **REMOVE** from sales | Honest “beta” or real tables |
| Audit document store | **REBUILD** | Use SQL append-only; fix `/api/audit` auth |
| Void sale | **REBUILD** | DEFINER + restock |
| Returns/refunds | **MISSING** | |
| Warehouses / transfers as 3PL | **MISSING** | |
| Offline POS | **MISSING** (queue is not it) | |
| Reseller network | **MISSING** | |
| Subscriptions | **MISSING** | |
| Flutter | **MISSING** in repo | |
| Stale docs (PRODUCT-GAP, DATABASE_MAP) | **REMOVE/REWRITE** | They contradict git |
| Duplicate env naming | **REFACTOR** | One contract |

---

## 34. P0 / P1 / P2 / P3

### P0 — must fix before calling this a production Commerce OS (integrity/security)

1. **Reconcile schema:** dump production, diff to git; stop pretending 0001–0023 is replayable.
2. **Authorize `/api/audit`** (and other census residuals); stop client-supplied actor.
3. **Void/refund via DEFINER RPC** with stock restore; ban direct `sales` UPDATE.
4. **GMS admin only from `app_metadata` or server allowlist**, not `user_metadata`.
5. **Confirm JWT validation** on every private mutating route (not proxy-only).
6. **WhatsApp webhook:** never accept unsigned bodies when `NODE_ENV=production`.
7. **Env contract:** `.env.example` vs actual `process.env` names (deploy footgun).

### P1 — before scale

1. Multi-instance rate limit (Redis/Upstash).
2. Pagination everywhere (reports currently cap 200).
3. Branch/register selection (not first branch).
4. Idempotent webhooks + payment unique constraints.
5. RLS automated tests.
6. Hide or label collection modules that are not ledgers.

### P2 — important

1. Sale-linked returns, partial refunds, store credit ledger.
2. Immutable audit + login events.
3. Real reporting SQL.
4. Customer table first-class.
5. Mage/campaigns WhatsApp.

### P3 — future OS

1. Warehouses, reservations, MRP.
2. Offline POS (IndexedDB + signed outbox).
3. Reseller commissions.
4. Subscription billing.
5. MFA, SCIM, SSO.
6. Accounting export.

---

## 35. Exact file references (selected)

**Tenant isolation / session**

- `src/lib/server/repositories/index.ts` — `getRepository()`: `getUser()` then first `branches` row. No client `org_id`.
- `src/lib/server/auth-session.ts` — `requireTenantSession()`: `profiles.org_id`; demo owner fallback.
- `src/proxy.ts` — `hasSupabaseSession` cookie name match only.

**Privilege**

- `src/lib/server/gms-auth.ts` — `hasGmsMetadata` on **app_metadata or user_metadata**.
- `src/app/api/auth/login/route.ts` — demo `admin`/`admin123`.

**Money path**

- `supabase/migrations/0002_functions.sql` — `create_sale(payload jsonb)`: server prices, stock fail-closed, `client_uuid` idempotency.
- `src/lib/server/repositories/supabase.ts` — `rpc("create_sale")`; **throws on pending card**.
- Same file `voidSale` — `.from("sales").update({ status: "voided" })` — **not RPC**.

**Storefront**

- `src/lib/server/storefront-repo.ts` — `placeStorefrontOrder`, `assertNoLocalFallbackForPublicOrders`.
- `src/app/api/store/[slug]/order/route.ts` — public order + email.

**Payments**

- `src/app/api/payments/webhook/[provider]/route.ts` — verify then `applyGatewayWebhook`.
- `src/lib/server/gateway-payments-store.ts` — PAID → licence or `completePendingSale`.

**Audit hole**

- `src/app/api/audit/route.ts` — GET/POST without session helper.
- `src/lib/server/audit-logger.ts` — overwriteable document, max 500.

**SaaS**

- `src/lib/plans.ts` — plan keys.
- `src/lib/server/tenant-store.ts` — licence in `app_documents`.
- `src/app/api/billing/route.ts` — invoice / PayHere / HQ request.

**HQ**

- `src/lib/server/hq-repo.ts` — `reseller_licences` or `demo_fallback`.
- `src/app/hq/layout.tsx` — redirect if not GMS.

**Fake depth**

- `src/app/(app)/returns/page.tsx` — `StockOperation type="return"`.
- `src/app/(app)/sms/page.tsx` — `CollectionManager name="sms"`.
- `src/lib/offline-queue.ts` — localStorage.

**Schema conflict**

- `supabase/migrations/0001_schema.sql` — `organizations`, `branch_stock`, `selling_price`.
- `supabase/migrations/0003_rls.sql` — `organizations`, `branch_stock`.
- `supabase/migrations/0023_launch_rls_hardening.sql` — `create_sale(jsonb)`, `catalog(...)`.

---

## 36. Recommended next steps (for the architect — not done here)

1. **Schema truth:** production `pg_dump --schema-only` vs git; produce one baseline migration.
2. **Security sprint:** P0 auth holes (audit, GMS metadata, unsigned WA, proxy-only POST).
3. **Money sprint:** void/refund/reserve RPCs; never UPDATE stock/sales from TS.
4. **Product honesty:** mark collection verticals as “records only” in UI; stop FEATURE-PLAN “all gaps closed”.
5. **Then** design warehouses, subscriptions, reseller portal — on a clean core.

---

## 32b. Final current-state summary (requested §32)

### What is actually built

- Next.js tenant POS + large module shell
- Supabase-oriented multi-tenant SQL core (sales, stock, catalog RPCs) **in later migrations + app types**
- Public storefront + Meta catalog export
- Platform HQ operator UI
- Licence/plan gating
- PayHere/Stripe webhook settlement
- WhatsApp Cloud API integration (settings, webhook, send)
- Jarvis (OpenAI) + tenant knowledge gating
- Resend email
- WAF/rate limit at proxy
- Vitest + Playwright smoke

### What is partially built

- Variants, GRN, transfers, stocktake, commerce CMS, delivery, loyalty, billing PayHere, HQ provisioning, reporting, permissions, register shifts

### What is mocked / demo-only

- `LocalRepository` + `data/*.json`
- Demo login
- HQ `demo_fallback` fleet
- Many “modules” that are empty CRUD forms
- Unsigned WhatsApp in demo
- Email noop without API key
- Offline “POS” as localStorage retry

### What is broken or unsafe

- Git migration history vs app schema names
- Void via table update under read-only RLS (likely **non-functional** in durable mode)
- `/api/audit` write without handler auth
- Proxy-only APIs
- `user_metadata` GMS role
- `.env.example` vs code env names
- Dual category stores (historical Anaz issue)

### What is insecure (highest)

- Service role misuse risk
- Optimistic edge auth
- Mutable audit log
- Demo credentials if `POS_ALLOW_DEMO` on production
- Unsigned webhooks in misconfigured prod

### What is duplicated

- Local JSON vs SQL
- SQL categories vs collection categories
- SQL audit_events vs document audit
- Docs vs code (DATABASE_MAP, PRODUCT-GAP)
- Env var aliases

### What is missing (OS-level)

- Warehouses, reservations, sale-linked returns/refunds, subscriptions, reseller portal, MFA, SMS gateway, Flutter in-repo, true offline POS, WORM audit, reporting warehouse

### Architecture that exists

Single Next app, dual persistence, org RLS, DEFINER sale/stock, public storefront RPCs, GMS HQ with service role.

### Architecture that needs to change

Treat SQL RPC as the only commerce kernel; demote blob modules; make HQ a hard-isolated control plane; freeze schema from production; do not build reseller/warehouse on top of `app_collections`.

---

*End of audit. No systems were modified.*

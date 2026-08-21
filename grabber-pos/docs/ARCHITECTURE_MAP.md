# MyPoz architecture map

Authoritative product/architecture map for **MyPoz Commerce Cloud** (`grabber-pos`).
Companion to [ARCHITECTURE.md](ARCHITECTURE.md) (seams detail) and
[DATA-MODEL.md](DATA-MODEL.md) (schema). Verified against code as of migrations
`0001`–`0018`.

---

## 1. Product purpose

MyPoz is a **multi-tenant commerce cloud**: one codebase serves:

1. **In-store POS** — barcode retail/wholesale, verticals (restaurant, delivery, repair, …), inventory, purchases, registers.
2. **Public storefront** — per-tenant shop at `/store/[slug]` (and custom domains), COD / bank-transfer first.
3. **WhatsApp commerce** — Meta Cloud API webhook → tenant bot → sales with `source = WHATSAPP`.
4. **GMS HQ** — fleet onboarding, licences, tenant monitor, WhatsApp number attach (`/hq`).

| | |
|--|--|
| Package | `mypoz-commerce-cloud` |
| Stack | Next.js 16 · React 19 · Supabase Postgres · Zustand · Zod |
| Supabase | `veavfkjgtkbnggukzjds` |
| **Live host only** | `https://mypoz-and-store-ui.vercel.app` |
| Vercel project root | `grabber-pos` (monorepo parent: `MyPoz & Store`) |

Do **not** treat the older `mypoz-and-store` Vercel project as production.

---

## 2. High-level system diagram

```
                    ┌─────────────────────────────────────────┐
                    │  mypoz-and-store-ui (Next.js on Vercel)  │
                    │  proxy.ts → WAF → rate limit → auth      │
                    └───────────┬───────────────┬─────────────┘
           authenticated        │               │ public
     ┌──────────────────────────┼───────────────┼──────────────────────┐
     ▼                          ▼               ▼                      ▼
 /(app) POS+BO            /hq GMS ops     /store/[slug]         webhooks
 /api/* (session)         /api/hq/*       /api/store/*          WA + payments
     │                          │               │                      │
     │ getRepository /          │ service       │ storefront           │ service
     │ recordStore/docStore     │ role +        │ DEFINER RPCs         │ role
     ▼                          ▼               ▼                      ▼
                    ┌─────────────────────────────────────────┐
                    │  Supabase Postgres (RLS + DEFINER RPCs)  │
                    │  org → branch → sales / stock / modules  │
                    └─────────────────────────────────────────┘
```

Optional: Flutter mobile POS talks to the same Supabase RPCs (see parent monorepo).

---

## 3. Roles

### Tenant (`profiles.role`)

| Role | Typical access |
|------|----------------|
| `owner` | Full org: users, catalog writes, settings, storefront publish. App permission map treats as `admin`. |
| `manager` | Branch admin: catalog/purchases, stock adjust (permission-gated), reports. |
| `cashier` | POS sell; limited void/discount/override unless permission overrides. |

Source: `supabase/migrations/0001_schema.sql` (`user_role` enum),
`src/lib/permissions.ts`, `src/lib/server/permissions-store.ts`.

### Platform (not a DB enum)

| Identity | Gate |
|----------|------|
| GMS HQ admin | `requireGmsAdmin()` — `GMS_ADMIN_EMAILS` allowlist **or** `app_metadata.role = gms_admin` / `gms_admin=true` |
| Demo HQ | `GMS_ADMIN_USERS` / default `POS_USER` when Supabase off |

Source: `src/lib/server/gms-auth.ts`.

---

## 4. Architecture layers

### Front door

`src/proxy.ts` (Next 16: middleware renamed to proxy):

1. Skip static assets.
2. Storefront slug aliases (308).
3. WAF (`inspectRequest`).
4. Adaptive API rate limit (except `/api/health`).
5. Public path allowlist **or** optimistic session cookies.
6. Stamp `x-mypoz-host` / `x-mypoz-slug` for anonymous shoppers.

### App Router surfaces

| Area | Path | Notes |
|------|------|-------|
| Authenticated shell | `src/app/(app)/` | Launcher, POS, inventory, verticals, settings |
| HQ | `src/app/hq/` | Fleet UI; APIs re-check GMS |
| Storefront | `src/app/store/` | Public shop UI |
| Auth / legal | `/login`, `/welcome`, privacy/terms | Public |
| API | `src/app/api/` | See [API_SURFACE.md](API_SURFACE.md) |

### Server libs

```
src/lib/server/
├── repositories/     # PosRepository seam (getRepository)
├── persistence/      # recordStore / docStore
├── *-store.ts        # vertical + module stores
├── gms-auth.ts       # HQ gate
├── storefront-repo.ts
├── hq-repo.ts / hq-monitor.ts / hq-password.ts
└── waf / rate-limit / licence-guard / …
src/lib/whatsapp/     # bot + signature
src/lib/supabase/     # browser / server / service clients
src/lib/store/        # Zustand cart (client)
```

---

## 5. Dependency patterns (the two seams)

### Seam A — `getRepository()`

- **Interface:** `PosRepository` (`repositories/types.ts`)
- **Impls:** `SupabaseRepository` · `LocalRepository`
- **Used for:** catalog list/barcode, create/list/void sales, inventory stats — the POS core ledger path.
- **Rule:** UI and most `/api/products` + `/api/sales` never branch on backend; only the seam does.

### Seam B — `recordStore` / `docStore`

- **Used for:** delivery, jobs, bookings, hire-purchase, play, reloads, restaurant live orders, collections CRUD, held bills, click-collect, loyalty ledger, WhatsApp inbox rows, settings/tenant/website/commerce docs, …
- **Durable tables:** `app_collections`, `app_documents` (plus specialized `stock_documents`).
- **Rule:** no store embeds `org_id` logic; Postgres default + RLS handle tenancy.

Stock quantities move via **DEFINER RPCs** (`create_sale`, `adjust_stock`, `receive_purchase`), not direct client writes.

---

## 6. Folder map (practical)

```
grabber-pos/
├── src/app/              # pages + 94 API route handlers
├── src/proxy.ts          # front-door auth / WAF
├── src/lib/              # server stores, supabase, plans, modules
├── src/components/       # UI
├── supabase/migrations/  # 0001_schema … 0018_ux_events
├── scripts/              # seed, provision, smokes, Meta sync
├── docs/                 # ops + this architecture set
├── graphify-out/         # local knowledge graph (gitignored)
└── .cursor/rules/        # graphify.mdc (alwaysApply)
```

Launcher modules catalog: `src/lib/modules.ts` (`MODULE_GROUPS`).

---

## 7. End-to-end flows

### A. POS sale (authenticated)

1. Cashier builds cart (Zustand) — discounts clamped to `max_discount` in UI.
2. Checkout → `POST /api/sales` → Zod `createSaleSchema`.
3. `getRepository().createSale` → Postgres `create_sale` (SECURITY DEFINER):
   - re-derives prices / discount caps; fail-closed on stock;
   - writes `sales` + `sale_lines` + `payments`;
   - decrements `branch_stock` + appends `stock_movements` + `audit_events`;
   - idempotent on `client_uuid`.
4. Optional: `POST /api/sales/[id]/whatsapp` to share receipt.

Licence guard blocks selling when tenant licence expired (`licence-guard` on create path).

### B. Storefront COD / bank transfer (public)

1. Shopper opens `/store/[slug]` (or custom domain → slug).
2. Catalog via `/api/store/[slug]/catalog` (DEFINER / public RPCs — no staff JWT).
3. Checkout → `POST /api/store/[slug]/order` (rate-limited) → `placeStorefrontOrder`:
   - validates payment/fulfilment modes from website CMS;
   - creates web order record + often posts through sale path with storefront source;
   - COD → cash-like settlement; card may stay pending until gateway webhook.
4. Staff fulfills via Click & collect / Delivery / commerce fulfill APIs.

### C. WhatsApp order (webhook)

1. Meta → `GET/POST /api/whatsapp/webhook` (public in proxy).
2. Verify hub token (GET) or `X-Hub-Signature-256` (POST) with `WHATSAPP_APP_SECRET`.
3. Resolve tenant by `phone_number_id` (HQ attach or org WhatsApp doc) — migration `0014`.
4. `handleInboundText` bot → may call `create_sale` / catalog with service-role context.
5. Staff inbox: `/api/whatsapp/inbox` + `/whatsapp` UI (authenticated).

Shared webhook URL on live host:
`https://mypoz-and-store-ui.vercel.app/api/whatsapp/webhook`.

---

## 8. FE / BE split

| Concern | Where |
|---------|--------|
| UI state (cart, modals) | Client components + Zustand |
| Auth session | Supabase SSR cookies; demo HMAC cookie |
| Business rules (price, stock, totals) | Postgres RPCs or LocalRepository mirrors |
| Module CRUD | Route handlers → `*-store.ts` → persistence seam |
| Cross-org HQ | Route handlers → `requireGmsAdmin` → service role where needed |
| Public commerce | Route handlers → storefront repo / DEFINER RPCs |

There is **no** separate Node API service — Next Route Handlers + Supabase are the backend.

---

## 9. Related docs

| Doc | Role |
|-----|------|
| [API_SURFACE.md](API_SURFACE.md) | Full `/api` inventory |
| [SECURITY_AND_AUTH.md](SECURITY_AND_AUTH.md) | Proxy, RLS, risks |
| [DATABASE_MAP.md](DATABASE_MAP.md) | Migrations 0001–0018 map |
| [DATA-MODEL.md](DATA-MODEL.md) | Tables, RPCs, RLS narrative |
| [WHATSAPP.md](WHATSAPP.md) | WA env + Meta ops |
| [GMS-OPERATIONS.md](GMS-OPERATIONS.md) | HQ playbook |
| [CUSTOMER-STOREFRONT.md](CUSTOMER-STOREFRONT.md) | CMS + shop |
| [PRODUCTION.md](PRODUCTION.md) | Go-live |
| [GO_TO_MARKET.md](GO_TO_MARKET.md) | Launch phases |

Graphify: local `graphify-out/graph.json` (~3k nodes). Agents should prefer
`graphify explain` / `path` before broad greps when the graph is present.

# API surface inventory

Filesystem inventory of Next.js Route Handlers under `src/app/api/`
(**94** `route.ts` files). Auth notes reflect `src/proxy.ts` public allowlist
plus handler-level checks (`getRepository`, `requireGmsAdmin`, webhook signatures).

**Legend**

| Tag | Meaning |
|-----|---------|
| **Public** | Listed in proxy `PUBLIC_PATHS` (or special-cased); no session cookie required at the edge |
| **Session** | Proxy requires Supabase auth cookie or demo session; handler usually needs real user |
| **GMS** | Must pass `requireGmsAdmin()` after login |
| **Webhook** | Public edge path; authenticity via signature / verify token |

---

## Auth & platform

| Route | Methods (typical) | Access |
|-------|-------------------|--------|
| `/api/auth/login` | POST | **Public** — demo / session mint |
| `/api/health` | GET | **Public** |
| `/api/waf-deny` | * | Internal WAF deny landing |
| `/api/observability/events` | POST | **Public** (POST only) — capped UX events |
| `/api/privacy/purge` | * | **Session** — data deletion ops |
| `/api/backup` | * | **Session** — tenant backup |
| `/api/billing` | * | **Session** — plan / billing snapshot |
| `/api/permissions` | * | **Session** — role permission matrix |
| `/api/settings` | * | **Session** — `docStore` settings |
| `/api/tenant` | * | **Session** — white-label / licence doc |
| `/api/register` | * | **Session** — register / shift |
| `/api/audit` | * | **Session** — audit feed |
| `/api/alerts` | * | **Session** | 
| `/api/email/send` | POST | **Session** |
| `/api/media` | * | **Session** — uploads |
| `/api/print` | * | **Session** — ESC/POS / tickets |

---

## Products & inventory

| Route | Access |
|-------|--------|
| `/api/products` | **Session** → `getRepository` |
| `/api/products/[id]` | **Session** |
| `/api/products/[id]/variants` | **Session** |
| `/api/products/import` · `export` · `template` · `image` | **Session** |
| `/api/packages/[id]/expand` | **Session** |
| `/api/stock/[type]` | **Session** — GRN / return / damage docs |
| `/api/stocktake` · `/api/stocktake/[id]/post` | **Session** |
| `/api/transfers` · `/api/transfers/[id]/approve` | **Session** |
| `/api/purchase-orders` · `/api/purchase-orders/[id]/receive` | **Session** |

---

## Sales & payments

| Route | Access |
|-------|--------|
| `/api/sales` | **Session** → `getRepository` create/list |
| `/api/sales/[id]/void` | **Session** |
| `/api/sales/[id]/invoice` | **Session** |
| `/api/sales/[id]/whatsapp` | **Session** — share sale on WA |
| `/api/held-bills` · `/api/held-bills/[id]` | **Session** |
| `/api/payments/webhook/[provider]` | **Webhook** / **Public** prefix |
| `/api/loyalty` | **Session** |

---

## Verticals & collections

| Route | Access |
|-------|--------|
| `/api/restaurant/orders` · `/api/restaurant/orders/[tableId]` | **Session** |
| `/api/delivery/orders` · `/api/delivery/orders/[id]` | **Session** |
| `/api/jobs` · `/api/jobs/[id]` | **Session** |
| `/api/bookings` · `/api/bookings/[id]` | **Session** |
| `/api/hire-purchase` · `/api/hire-purchase/[id]` | **Session** |
| `/api/layaway` · `/api/layaway/[id]` | **Session** |
| `/api/play` · `/api/play/[id]` | **Session** |
| `/api/reloads` | **Session** |
| `/api/click-collect` · `/api/click-collect/[id]` | **Session** |
| `/api/collections/[entity]` · `/api/collections/[entity]/[id]` | **Session** — generic CRUD |

---

## Commerce / website (merchant)

| Route | Access |
|-------|--------|
| `/api/website` · `/api/website/banners` | **Session** |
| `/api/commerce` · `publish` · `theme` · `orders/live` | **Session** |
| `/api/commerce/orders/[id]/fulfill` | **Session** |
| `/api/commerce/orders/[id]/payment-proof` | **Session** |
| `/api/commerce/discounts/validate` | **Session** (may also be called in shop flows — verify caller) |
| `/api/commerce/domains/verify` | **Session** |

---

## Public storefront

Prefix `/api/store` is **Public** at the proxy. Handlers resolve tenant by slug
and use DEFINER RPCs / service role carefully — never staff JWT.

| Route | Notes |
|-------|--------|
| `/api/store/[slug]/catalog` | Public catalog (+ CSV/JSON formats) |
| `/api/store/[slug]/order` | Place order (COD / bank / card modes); IP rate limit in handler |
| `/api/store/[slug]/orders` | Customer order lookup (cookie / auth helper) |
| `/api/store/[slug]/auth` | Storefront customer auth helpers |
| `/api/store/[slug]/pay` | Payment initiation |
| `/api/store/[slug]/events` | UX event ingest |
| `/api/store/[slug]/feed/meta` | Meta commerce feed |
| `/api/store/[slug]/feed/google` | Google feed |

---

## WhatsApp

| Route | Access |
|-------|--------|
| `/api/whatsapp/webhook` | **Webhook** — Meta verify + signed POST |
| `/api/whatsapp/status` | **Session** — connection health panel |
| `/api/whatsapp/settings` | **Session** — org WA doc |
| `/api/whatsapp/inbox` | **Session** — conversations |

---

## AI

| Route | Access |
|-------|--------|
| `/api/ai/chat` · `/api/ai/settings` | **Session** — owner retail tools |
| `/api/hq/ai/chat` | **GMS** — HQ tools |

---

## GMS HQ

All `/api/hq/*` require session **and** `requireGmsAdmin()`.

| Route | Purpose |
|-------|---------|
| `/api/hq/me` | Identity check |
| `/api/hq/summary` | Fleet pulse |
| `/api/hq/config` | Platform settings |
| `/api/hq/tenants` · `/api/hq/tenants/[id]` | List / provision / update |
| `/api/hq/tenants/[id]/monitor` | Per-tenant monitor |
| `/api/hq/tenants/[id]/ops` | Ops actions |
| `/api/hq/tenants/[id]/users/password` | Password reset (service role) |
| `/api/hq/whatsapp` | Attach phone numbers to orgs |
| `/api/hq/tickets` | Support tickets |
| `/api/hq/backup` | Cross-tenant backup ops |
| `/api/hq/ai/chat` | HQ AI |

---

## Grouping by top-level folder

```
ai/  alerts/  audit/  auth/  backup/  billing/  bookings/  click-collect/
collections/  commerce/  delivery/  email/  health/  held-bills/  hire-purchase/
hq/  jobs/  layaway/  loyalty/  media/  observability/  packages/  payments/
permissions/  play/  print/  privacy/  products/  purchase-orders/  register/
reloads/  restaurant/  sales/  settings/  stock/  stocktake/  store/  tenant/
transfers/  waf-deny/  website/  whatsapp/
```

Regenerate this list:

```powershell
Get-ChildItem -Path src\app\api -Recurse -Filter route.ts |
  ForEach-Object { $_.FullName -replace '.*\\api\\','' -replace '\\route\.ts$','' -replace '\\','/' }
```

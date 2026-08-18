# MyPoz System Discovery

**Workspace:** `D:\MyPoz & Store`  
**Original source:** `D:\Codebases\GrabberPoz-main`  
**Date:** 17 August 2026  
**Mode:** Discovery only. No application logic was changed for this report.

This workspace is the Grabber POS Studio product, being evolved as **MyPoz Commerce Cloud**. POS, storefront, and reseller HQ already share one Next.js app and one commerce engine.

---

## 1. Project structure

Relevant tree (excluding `node_modules`, `.next`, caches):

```
D:\MyPoz & Store\
├── MyPoz Commerce Cloud — Full Product Build Prompt.md
├── MyPoz Existing System Discovery & Gap Analysis Prompt.md
├── README.md                          # workspace intro (Commerce Cloud)
├── package.json                       # husky wrapper only
├── grabber-pos\                       # CANONICAL web app (POS + storefront + HQ)
│   ├── package.json                   # mypoz-commerce-cloud, Next.js 16
│   ├── next.config.ts
│   ├── vercel.json
│   ├── vitest.config.ts
│   ├── src\
│   │   ├── app\                       # App Router: (app) POS, store, hq, api
│   │   ├── components\
│   │   ├── lib\                       # domain, server stores, payments, commerce
│   │   ├── data\products.json         # demo catalog (~2,500 items)
│   │   └── proxy.ts                   # auth guard (Next 16 middleware rename)
│   ├── supabase\migrations\           # 0001–0008
│   ├── docs\                          # product/ops docs
│   ├── public\
│   └── scripts\
├── grabber-pos-mobile\                # Flutter handheld POS
│   ├── lib\
│   ├── android\  ios\
│   └── test\
├── assets\
├── references\
└── SKILL.md / CLIENT_*.md
```

**Not a monorepo of packages.** No shared npm workspace, no `packages/`. Two applications: Next.js web + Flutter mobile, one Supabase backend.

---

## 2. Applications

| App | Path | Purpose | Framework | Entry | Dev | Build | Port | Status |
|---|---|---|---|---|---|---|---|---|
| POS + back office + storefront + HQ | `grabber-pos/` | Merchant OS | Next.js 16.2.11, React 19, TS | `src/app/layout.tsx` | `next dev` | `next build` | 3000 | WORKING (demo mode) |
| Public storefront | same app `/store/[slug]` | Customer shop | same | `src/app/store/` | same | same | 3000 | WORKING / PARTIAL vs Commerce Cloud spec |
| Commerce admin | same app `/commerce` | Store builder, themes, online orders | same | `src/app/(app)/commerce/` | same | same | 3000 | PARTIAL (presentation layer on POS data) |
| Mobile POS | `grabber-pos-mobile/` | Offline-first terminal | Flutter 3, Riverpod | `lib/main.dart` | `flutter run` | `flutter build` | n/a | WORKING for core POS |
| API | Next Route Handlers `src/app/api/` | REST + RPC to Postgres | Next.js | `src/app/api/**/route.ts` | same | same | 3000 | WORKING |
| Shared packages | **NOT FOUND** | — | — | — | — | — | — | n/a |

Package name: `mypoz-commerce-cloud` (`grabber-pos/package.json`). Root `package.json` is husky-only.

Major web dependencies (from `package.json`): Next 16.2.11, React 19.2.4, Tailwind 4, Framer Motion, Zustand, Zod 4, Supabase JS, Vitest, xlsx, pdf-lib, jsbarcode, node-thermal-printer.

---

## 3. Technology stack (from files)

### Frontend

| Item | Evidence |
|---|---|
| Framework | Next.js 16 App Router (`grabber-pos/package.json`, `src/app/`) |
| Routing | App Router file routes; `src/proxy.ts` auth guard |
| State | Zustand POS cart (`src/lib/store/cart-store.ts`); React state for storefront cart (`src/app/store/[slug]/cart.tsx`) |
| UI library | Custom primitives, not shadcn/MUI (`src/components/ui/`: Button, EmptyState, StatCard) |
| CSS | Tailwind v4 + CSS design tokens in `src/app/globals.css` |
| Forms | Uncontrolled/controlled inputs + Zod at API (`src/lib/validation.ts`, collection schemas) |
| Motion | Framer Motion |

### Backend

| Item | Evidence |
|---|---|
| API | Next.js Route Handlers (REST JSON `{ success, data, error }`) |
| Server actions | **NOT FOUND** as primary pattern |
| GraphQL | **NOT FOUND** |
| RPC | Postgres SECURITY DEFINER functions (`create_sale`, `storefront_catalog`, …) |
| Dual backend | `getRepository()` → `SupabaseRepository` or `LocalRepository` (`src/lib/server/repositories/`) |

### Database

| Item | Evidence |
|---|---|
| Engine | PostgreSQL via Supabase |
| ORM | **NOT FOUND** (no Prisma). supabase-js + SQL migrations |
| Migrations | `grabber-pos/supabase/migrations/0001`–`0008` |
| Demo | Local JSON under `data/` + `src/data/products.json` |

### Infrastructure

| Item | Status |
|---|---|
| Auth | Supabase Auth (prod) + HMAC demo cookie (eval) |
| Storage | Local `public/uploads/` for product/banner images; product `image_url` column in 0005 |
| Caching | HTTP Cache-Control on feeds; no Redis **NOT FOUND** |
| Queues | Flutter offline queue only (`grabber-pos-mobile/lib/data/offline_queue.dart`). No Redis/Bull |
| Realtime | **NOT FOUND** in web app (no `supabase.channel` usage found as core path) |
| Deploy | Vercel (`vercel.json`, docs/DEPLOYMENT.md). Root directory must be `grabber-pos` |

### Payments

Adapters in `src/lib/payments/gateways/`: WebXPay, PayHere, OnePay, LankaPay, Stripe. Plus cash / bank transfer / COD-style cash on storefront. Secrets via env. See payments section in gap analysis.

---

## 4. Authentication (summary)

Two modes:

1. **Demo:** `POST /api/auth/login` with `POS_USER`/`POS_PASSWORD` (defaults `admin`/`admin123`). HMAC cookie `pos_session` (`src/lib/server/session.ts`). Fail-closed if secret missing except tests.
2. **Durable:** Supabase Auth. `profiles` 1:1 with `auth.users`, `org_id` + `user_role` enum `owner | manager | cashier`. `branch_members` for branch access.

Staff map:

```
auth.users → profiles (org_id, role) → branch_members → branches
```

Storefront shoppers: separate demo accounts in `app_collections` / `storefront-customers.json` (`src/lib/server/storefront-customers-store.ts`). Not the same table as POS `customers` collection.

GMS HQ: `GMS_ADMIN_EMAILS` / `GMS_ADMIN_USERS` (`src/lib/server/gms-auth.ts`), routes under `/hq`.

Frontend guard: `src/proxy.ts` public prefixes `/store`, `/api/store`, `/login`, `/welcome`, webhooks.

---

## 5. POS feature map

| Feature | Route | Service | DB | Status |
|---|---|---|---|---|
| Retail / wholesale / category POS | `/pos` | `/api/sales`, cart-store | `sales`, `sale_lines`, `create_sale` | WORKING |
| Products | `/products` | `/api/products` | `products` | WORKING |
| Categories / brands / suppliers | `/categories` etc. | collections API | `categories` + `app_collections` | WORKING |
| Inventory / stocktake / transfers | `/inventory`, `/stocktake`, `/transfers` | stock-store, RPCs | `branch_stock`, `stock_movements` | WORKING |
| Barcode | `/barcode`, `product_by_barcode` | RPC | `product_barcodes` | WORKING |
| Customers (POS) | `/customers` | collections | `app_collections['customers']` | WORKING |
| Discounts | cart line + `max_discount` | validation + RPC | product columns | PARTIAL (no promo codes table) |
| Returns / damages / GRN | `/returns`, `/damages`, `/grn` | stock-store | `stock_documents` + `adjust_stock` | WORKING |
| Staff / attendance / salary | `/employees` … | collections | `app_collections` | WORKING |
| Register / Z-report | `/register` | register-store | `registers`, `shifts` | WORKING |
| Reports / dashboard / alerts | `/reports`, `/dashboard`, `/alerts` | APIs | sales + stock RPCs | WORKING |
| Restaurant / KDS / rooms / rent / HP / play / reloads / repair / service / layaway | matching routes | module stores | `app_collections` | WORKING (verticals) |
| Delivery / click-collect | `/delivery`, `/click-collect` | delivery-store | `app_collections` | WORKING |
| Settings / website CMS | `/settings`, `/website` | docStore | `app_documents` | WORKING |
| Variants | `/variants` | CollectionManager | `app_collections['variants']` | PARTIAL — not wired into `create_sale` / storefront |
| Packages | `/packages` | collections | `app_collections` | PARTIAL |

---

## 6. Duplicate / legacy

| Item | Note |
|---|---|
| Root husky `package.json` + `grabber-pos/package.json` | Two lockfiles; Next warned about workspace root |
| `/website` CMS vs `/commerce` builder | Two admin UIs for storefront presentation |
| Legacy CSS themes `classic/minimal/bold/local` vs Commerce themes `minimal/fashion/market/food/luxury/local` | Mapped, not deleted |
| `app_settings` / `restaurant_orders` in 0005 | Consolidated in 0006; leftover names in old migration only |
| Branding strings | Mix of Grabber POS Studio and MyPoz |
| Storefront cart vs POS Zustand cart | Two carts by design (customer vs cashier) |
| POS customers vs storefront customers | Two identity stores |

Do not delete any of the above without an explicit decision.

---

## 7. Tests and build health (this discovery run)

| Command | Result |
|---|---|
| `tsc --noEmit` | **PASS** (exit 0) |
| `vitest run` | **PASS** 8 files, 65 tests |
| Full `eslint` | Not completed in this pass (slow on this machine) |
| `next build` | Not run in this discovery pass |

Test files: `src/**/*.test.ts` (Vitest, node env). Flutter: `grabber-pos-mobile/test/cart_totals_test.dart`. No Playwright/Cypress **NOT FOUND**.

---

## 8. Environment variable names (values not printed)

No `.env` / `.env.example` file is present in `grabber-pos/` in this copy. Names from code and `docs/PRODUCTION.md`:

| Name | Role | This copy |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Durable backend switch | NOT CONFIGURED (no env file) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key | NOT CONFIGURED |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Alias | NOT CONFIGURED |
| `SUPABASE_SERVICE_ROLE_KEY` | HQ, webhooks, seed | NOT CONFIGURED |
| `POS_SESSION_SECRET` | Demo cookie HMAC | UNKNOWN |
| `POS_USER` / `POS_PASSWORD` | Demo login | Defaults exist in code |
| `POS_ALLOW_DEMO` | Allow demo in production | NOT CONFIGURED |
| `GMS_ADMIN_EMAILS` / `GMS_ADMIN_USERS` | HQ | NOT CONFIGURED |
| `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | Cloud API | NOT CONFIGURED |
| `PRINTER_*_IP` | ESC/POS | NOT CONFIGURED |
| `PAYHERE_MERCHANT_ID` / `PAYHERE_MERCHANT_SECRET` / `PAYHERE_SANDBOX` | PayHere | NOT CONFIGURED |
| `WEBXPAY_SECRET_KEY` / `WEBXPAY_PUBLIC_KEY` | WebXPay | NOT CONFIGURED |
| `ONEPAY_APP_ID` / `ONEPAY_APP_TOKEN` / `ONEPAY_HASH_SALT` | OnePay | NOT CONFIGURED |
| `LANKAPAY_IPG_URL` / `LANKAPAY_MERCHANT_ID` / `LANKAPAY_SECRET` | LankaPay | NOT CONFIGURED |
| `STRIPE_SECRET_KEY` | Stripe | NOT CONFIGURED |
| `PAYMENTS_LKR_PROVIDER` | Preferred LKR gateway | NOT CONFIGURED |
| `NEXT_PUBLIC_APP_URL` | Webhook return URLs | UNKNOWN |

Without Supabase env, the app runs **demo JSON mode**. That is expected for local eval, not for paid multi-tenant production (`docs/PRODUCTION.md`).

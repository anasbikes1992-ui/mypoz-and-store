# GRABBER POS Studio — Web

**By Grabber Mobility Solutions (Pvt) Ltd**

Back-office + desktop POS terminal. Next.js 16 · React 19 · TypeScript ·
Tailwind v4 · Framer Motion · Zustand · Zod · Supabase.

Part of the [GRABBER POS Studio](../README.md) solution (web + Flutter + Supabase).

## Run

```bash
npm install
cp .env.example .env.local     # optional — runs in demo mode without it
npm run dev                    # http://localhost:3000
```

- **Demo mode** (no Supabase env): bundled JSON catalog + file sales store.
  Login `admin` / `admin123`.
- **Durable mode** (Supabase env set + seeded): multi-tenant Postgres backend.
  See [docs/SETUP.md](docs/SETUP.md).

## What's in it

**15 sale modes** — retail, wholesale, category, restaurant (tables + KOT/BOT),
delivery, repair, vehicle service, reloads, rooms, rent, hire purchase, play area.

**Full back-office** — products (with Excel import/export), categories, brands,
suppliers, inventory, purchase orders → GRN, returns, damages, barcode labels,
gift vouchers, customers with loyalty, employees, attendance, salary, expenses,
cash in/out, currency, quotations, appointments, SMS templates, reports, alerts,
settings.

**Reselling layer** — white-label branding, plan-based feature gating, licence
enforcement, client onboarding, tenant `/admin`, and GMS fleet `/hq`.

**Storefront** — per-tenant Website CMS (`/website`) and public shop
(`/store/[slug]`); web orders land on Click & collect / Delivery.

Key screens: `/` launcher · `/pos` terminal · `/dashboard` · `/sales` ·
`/admin` · `/hq` · `/website` · `/store/[slug]` · `/welcome` · `/api/health`.

## Key design points

- **Backend seam** — `getRepository()` returns a `SupabaseRepository` or
  `LocalRepository` behind one `PosRepository` interface; every other module uses
  the `recordStore` / `docStore` seam. Pages and API routes are backend-agnostic.
  See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- **Server-authoritative** — all prices, discount caps, stock checks and totals
  are computed server-side (Zod at the API boundary, then the `create_sale`
  Postgres RPC). The client cart is never trusted.
- **Licensing is enforced server-side** — an expired licence blocks selling at
  `createSale`, not just in the UI. See [docs/PRODUCTION.md](docs/PRODUCTION.md).
- **Framer Motion** — page transitions, layout-animated nav, staggered grids,
  spring modals; `prefers-reduced-motion` honored globally.

## Docs

| Doc | For |
|-----|-----|
| [PRODUCTION.md](docs/PRODUCTION.md) | **Going live** — migrations, env, go-live checklist, security |
| [CREDENTIALS.md](docs/CREDENTIALS.md) | What to paste into `.env.local` (no secrets in repo) |
| [SETUP.md](docs/SETUP.md) | Local development setup |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layers, the two seams, trust boundaries |
| [DATA-MODEL.md](docs/DATA-MODEL.md) | Schema, RPCs, RLS, legacy mapping |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel + mobile builds |
| [USER-GUIDE.md](docs/USER-GUIDE.md) | Day-to-day use, for staff |
| [RESELLER-GUIDE.md](docs/RESELLER-GUIDE.md) | Selling and delivering it to clients |
| [GMS-OPERATIONS.md](docs/GMS-OPERATIONS.md) | Grabber Mobility Solutions fleet ops (`/hq`) |
| [CUSTOMER-STOREFRONT.md](docs/CUSTOMER-STOREFRONT.md) | Tenant website CMS + public shop |
| [FEATURE-PLAN.md](docs/FEATURE-PLAN.md) | Module inventory + roadmap |
| [PRODUCT-GAP.md](docs/PRODUCT-GAP.md) | Gaps, missed ideas, sprint order |
| [PRODUCT.md](PRODUCT.md) | Product truth (users, principles) |
| [DESIGN.md](DESIGN.md) | Visual design system |

## Scripts

| Script | Does |
|--------|------|
| `npm run dev` / `build` / `start` | Next.js dev / production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run seed` | Load org + catalog into Supabase (`--env-file=.env.local`) |
| `npm run db:push` | Apply migrations via the Supabase CLI |

## Layout

```
src/
├── app/            # App Router (pages + api route handlers)
├── proxy.ts        # auth guard (Next 16: middleware → proxy)
├── lib/
│   ├── server/
│   │   ├── repositories/   # PosRepository: Supabase | Local
│   │   ├── persistence/    # recordStore / docStore seam for module data
│   │   └── *-store.ts      # per-module stores (jobs, bookings, delivery, …)
│   ├── supabase/   # clients, types, config
│   ├── store/      # Zustand cart
│   ├── plans.ts    # plan tiers + feature gating
│   └── validation.ts, types.ts, format.ts, receipt.ts
└── data/products.json   # demo catalog seed
supabase/migrations/     # 0001 schema → 0007 storefront
scripts/seed.mjs         # Supabase seeder
docs/                    # production, architecture, setup, data model, guides
```

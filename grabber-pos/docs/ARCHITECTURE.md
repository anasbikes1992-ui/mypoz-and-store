# Architecture

## Overview

GRABBER POS Studio is a two-client, one-backend system.

```
apps ───────────────────────────────────────────────────────────
  Web (Next.js 16, RSC + Route Handlers)     Mobile (Flutter + Riverpod)
        │                                            │
        │  getRepository()                           │  PosRepository
        │  ┌─ SupabaseRepository (prod)              │  (Supabase RPC + REST)
        │  └─ LocalRepository (demo/JSON)            │  + OfflineQueue
        ▼                                            ▼
backend ─────────────────────────────────────────────────────────
  Supabase Postgres
    · Tables (org → branch scoped)      · RLS (per-organization isolation)
    · create_sale() atomic RPC          · catalog()/product_by_barcode() RPCs
    · stock_movements (append-only)      · audit_events
```

## Web app layers

```
src/
├── app/                      # Next.js App Router
│   ├── (app)/                # authenticated shell (sidebar + page transitions)
│   │   ├── page.tsx          # launcher home
│   │   ├── pos/              # POS terminal
│   │   ├── inventory/        # product table
│   │   └── sales/            # sales history
│   ├── welcome/              # public product overview
│   ├── login/                # auth screen (Supabase or demo)
│   └── api/                  # Route Handlers (products, sales, print, health, auth)
├── proxy.ts                  # optimistic auth guard (Next 16 renamed middleware→proxy)
├── lib/
│   ├── server/
│   │   ├── repositories/     # PosRepository interface + Supabase & Local impls
│   │   ├── persistence/      # record-store / doc-store seam (all module stores)
│   │   ├── product-repo.ts   # local JSON catalog
│   │   ├── sales-repo.ts     # local JSON sales store
│   │   ├── licence-guard.ts  # blocks selling on an expired licence
│   │   └── ticket-printer.ts # KOT/BOT ESC/POS printing
│   ├── supabase/             # browser/server/service clients + types + config
│   ├── store/cart-store.ts   # Zustand cart
│   ├── validation.ts         # Zod schemas (API boundary)
│   └── types.ts / format.ts / receipt.ts
└── data/products.json        # seed catalog (demo backend)
```

### The repository seam

Every server read/write goes through `PosRepository` (`lib/server/repositories/types.ts`).
`getRepository()` picks the implementation per request:

- **Supabase configured + user authenticated** → `SupabaseRepository`
  (RLS-scoped, calls the `create_sale` / `catalog` RPCs).
- **Otherwise** → `LocalRepository` (bundled JSON, identical business rules).

This means the UI, API routes, and pages never change when you switch backends —
only the seam does. It also keeps the app runnable with zero configuration.

### The persistence seam

Products and sales go through `PosRepository`. Every *other* module (the verticals,
the generic CRUD collections, settings, licensing) goes through a second, smaller
seam in `lib/server/persistence/`:

| Helper | Shape | Local backend | Durable backend |
|---|---|---|---|
| `recordStore<T>()` | keyed records | one JSON array per module in `data/` | one `app_collections` row per record |
| `docStore<T>()` | single document | one JSON file | one `app_documents` row per key |

`resolveDb()` decides per request: a Supabase client when Supabase is configured
**and** the caller is authenticated, otherwise `null` → local files. Org scoping is
handled by the tables (`org_id default current_org_id()` + RLS), so no store
contains tenancy logic.

Why per-record rather than one blob per module: writing a single row means two
cashiers editing *different* orders never overwrite each other. The local backend
rewrites a whole file, so it serializes those cycles behind a per-file lock
(`withFileLock`) — same guarantee, single-node scope.

Stock is deliberately **not** on this seam. `stock-store.ts` pairs a document
header with real ledger movements, so in the durable backend it writes
`stock_documents` and moves quantities through the `adjust_stock` definer RPC.
Stock is never adjusted by a direct client write.

## Mobile app layers

```
lib/
├── core/            # config (dart-define), theme, money formatting
├── data/
│   ├── models/      # Product, CartLine, Sale (immutable, fromJson)
│   ├── pos_repository.dart   # Supabase RPC/REST + offline fallback
│   └── offline_queue.dart    # durable FIFO queue (shared_preferences)
├── state/           # Riverpod providers + CartController (Notifier)
├── features/        # login, pos, checkout, sales screens
└── router.dart      # go_router with auth redirect
```

## Data flow: a sale

1. Cashier adds items (web Zustand cart / mobile Riverpod cart). Discounts are
   clamped to each product's `max_discount` in the UI.
2. Checkout calls the repository's `createSale`.
3. **Web** → `POST /api/sales` → Zod validation → `SupabaseRepository.createSale`
   → `create_sale` RPC. **Mobile** → `create_sale` RPC directly (or the offline
   queue if the network fails).
4. `create_sale` (SECURITY DEFINER, one transaction):
   - resolves the caller's org, validates the branch,
   - re-derives every price and re-checks `max_discount` **server-side**,
   - fails closed if stock is insufficient,
   - inserts `sales` + `sale_lines` + `payments`,
   - decrements `branch_stock` and appends `stock_movements`,
   - writes an `audit_events` row,
   - is idempotent on `client_uuid` (safe offline retries).

## Trust boundaries

- The client cart is advisory only. Authoritative pricing, discount caps, stock
  checks, and totals are computed in the database (or `LocalRepository` in demo
  mode, which mirrors the same rules).
- RLS restricts every row to the caller's organization. Sale/stock **writes** are
  only possible through the definer RPCs, never direct table inserts.
- The Supabase service-role key is server-only (seeding / trusted jobs) and is
  never shipped to the browser or the device.

## Scalability

- **Multi-tenant**: organization → branches → registers. Stock is per branch, so
  each store scales independently.
- **Stateless apps**: both clients hold only session + cart state; all durable
  state is in Postgres, so the web app scales horizontally on Vercel and the
  mobile app works across any number of devices.
- **Indexes**: trigram index on product name, barcode lookup index, and
  time-ordered indexes on sales/movements/audit for fast history and reports.
- **Append-only ledgers**: `stock_movements` and `audit_events` give exact
  reconstruction of inventory and actions without mutating history.

## See also

- [ARCHITECTURE_MAP.md](ARCHITECTURE_MAP.md) — full product / E2E map
- [API_SURFACE.md](API_SURFACE.md) — `/api` inventory
- [SECURITY_AND_AUTH.md](SECURITY_AND_AUTH.md) — proxy, RLS, HQ risks
- [DATABASE_MAP.md](DATABASE_MAP.md) — migration index

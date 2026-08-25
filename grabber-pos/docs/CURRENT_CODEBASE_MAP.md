# Current Codebase Map

## Purpose
This document is the current-state implementation map for the MyPoz production transformation. It summarizes the live architecture, critical modules, storage paths, auth model, and known fallbacks that must be removed or hardened.

## Top-Level Architecture

```text
Next.js 16 App Router
  ├─ Tenant app         src/app/(app)/*
  ├─ Public storefront  src/app/store/[slug]/*
  ├─ Platform HQ        src/app/hq/*
  └─ API routes         src/app/api/*

Server data paths
  ├─ Supabase/Postgres + RLS + SECURITY DEFINER RPCs
  ├─ recordStore/docStore abstraction layer
  └─ Local JSON demo fallback under data/
```

## Major Directories

| Path | Purpose | Production status |
| --- | --- | --- |
| `src/app/(app)` | Tenant back-office, POS, inventory, reports, settings, operational modules | Mixed; some durable, many partial |
| `src/app/store/[slug]` | Public storefront, shopper auth, checkout, account pages | Partially durable |
| `src/app/hq` | Platform operator HQ and tenant oversight | Real, but auth hardening required |
| `src/app/api` | Route handlers for app, storefront, HQ, payments, WhatsApp, AI | Mixed auth quality |
| `src/lib/server/repositories` | POS catalog/sales repository seam | Durable for sales/catalog |
| `src/lib/server/persistence` | `recordStore` / `docStore` / backend selection | Major source of unsafe fallback behavior |
| `src/lib/server/*-store.ts` | Domain stores for stock, storefront orders, gateway payments, tenant docs, audit, WhatsApp, etc. | Mixed; many critical domains still blob-backed |
| `supabase/migrations` | Postgres schema, RLS, RPCs, later hardening migrations | Strong base, replay still needs proof |
| `data` | Demo JSON persistence | Must not remain source of truth for critical domains |
| `docs` | Architecture, security, launch, operating guidance | Mixed freshness |

## System Of Record By Domain

| Domain | Current source of truth | Key files | Notes |
| --- | --- | --- | --- |
| Organizations / profiles / branches | Postgres | `supabase/migrations/0001_schema.sql`, `0003_rls.sql` | Core tenant spine is durable |
| POS sales | Postgres RPC | `supabase/migrations/0002_functions.sql`, `src/lib/server/repositories/supabase.ts` | `create_sale` is the strongest existing transaction path |
| Inventory adjustments / GRN / damage | Postgres RPC + `stock_documents` | `src/lib/server/stock-store.ts`, `0005_app_data.sql`, `0002_functions.sql` | Durable when `adjust_stock` is used |
| Storefront pending orders | `app_collections` via service role | `src/lib/server/storefront-orders-store.ts` | Durable, but service-role validation is critical |
| Payment pending ledger | `app_collections` or local JSON | `src/lib/server/gateway-payments-store.ts` | Needs webhook idempotency hardening |
| Tenant settings / licence | `app_documents` | `src/lib/server/tenant-store.ts`, `src/lib/server/settings-store.ts`, `0006_app_documents.sql` | Durable document storage is acceptable here |
| Audit (application layer) | `app_documents`/JSON blob | `src/lib/server/audit-logger.ts` | Unsafe today; mutable and weakly protected |
| Stocktake | Local record/doc path | `src/lib/server/stocktake-store.ts` | Not durable for production stock |
| Transfers | Local doc/blob path | `src/lib/server/transfer-store.ts` | Not durable; no stock move |
| Purchase orders | Mixed | `src/lib/server/po-store.ts`, `0001_schema.sql` | Runtime path still tied to local product resolution |
| Registers / shifts | Mixed | `src/lib/server/register-store.ts`, `0001_schema.sql` | SQL tables exist; app still uses document storage |
| Returns / refunds | Incomplete | `src/app/(app)/returns/page.tsx`, `src/lib/server/stock-store.ts` | No real linked domain model yet |
| Reporting | Browser aggregation of API reads | `src/app/(app)/reports/page.tsx`, `src/app/api/sales/route.ts` | Truncated and inaccurate at scale |

## Authentication And Authorization Summary

| Layer | Current behavior | Risk |
| --- | --- | --- |
| `src/proxy.ts` | Cookie-presence gate, WAF, rate limit | Not a real auth boundary |
| `requireTenantSession()` | Real Supabase session + `profiles` lookup | Strong |
| `getRepository()` | Real Supabase session required when Supabase is enabled | Strong for routes that use it |
| `requireGmsAdmin()` | HQ auth helper | Must stop trusting `user_metadata` |
| `recordStore` / `docStore` | Can implicitly rely on `resolveDb()` | Produces weak/implicit route auth when handlers do not check explicitly |

## Critical Route Groups

| Route group | Current state | Immediate action |
| --- | --- | --- |
| `src/app/api/hq/*` | Explicit HQ guard in handlers | Harden platform auth source |
| `src/app/api/audit/route.ts` | Unauthenticated | Lock down immediately |
| `src/app/api/register/route.ts` | Implicit auth via downstream store | Add explicit tenant auth + role checks |
| `src/app/api/stocktake/route.ts` | Implicit auth via downstream store | Add explicit tenant auth + role checks |
| `src/app/api/transfers/route.ts` | Implicit auth via downstream store | Add explicit tenant auth + role checks |
| `src/app/api/purchase-orders/route.ts` | Implicit auth via downstream store | Add explicit tenant auth + role checks |
| `src/app/api/billing/route.ts` | Implicit auth via downstream store | Add explicit tenant auth |
| `src/app/api/commerce/orders/[id]/fulfill/route.ts` | Implicit auth via downstream store | Add explicit tenant auth + role checks |
| `src/app/api/payments/webhook/[provider]/route.ts` | Public by design + signature verification | Harden idempotency |
| `src/app/api/whatsapp/webhook/route.ts` | Public by design + signature verification | Harden tenant resolution and idempotency |

## Known Production-Critical Fallbacks

| Pattern | Evidence | Target |
| --- | --- | --- |
| Local JSON fallback for protected routes | `recordStore` / `docStore` / `resolveDb()` | Explicit 401/403 at route boundary |
| Local stock overrides for stocktake | `src/lib/server/stocktake-store.ts` | Postgres-backed stocktake workflow |
| Blob-backed transfers | `src/lib/server/transfer-store.ts` | Relational transfer tables + stock movements |
| Local product lookup for PO create | `src/lib/server/po-store.ts` | Durable catalog query |
| Browser-side reporting on capped reads | `src/app/(app)/reports/page.tsx` | Server-side reporting queries |

## Transformation Status (batch complete)

| Batch | Status | Evidence |
| --- | --- | --- |
| Foundation docs | Done | This file + `AUTHORIZATION_COVERAGE.md` + `RLS_MATRIX.md` |
| P0 auth + HQ | Done | `gms-auth.ts` app_metadata-only; route session gates |
| P0 audit | Done | `/api/audit` session + role; append-only `audit-logs` collection |
| P0 commerce | Done | `void_sale` RPC; webhook `clientUuid` + completedAt guards; receipt counters in `0021` |
| Durable inventory | Done | Migrations `0024`–`0026`; SQL-backed stocktake/transfer/PO/register paths |
| Returns + reporting | Done | `0025_returns_refunds.sql`, `/api/returns`, `/api/reports/summary` |
| Verification | Done | Migration/auth/RLS/webhook/gms tests under `src/lib/server/__tests__/` |

Offline POS remains deferred until online transaction path is proven in production.

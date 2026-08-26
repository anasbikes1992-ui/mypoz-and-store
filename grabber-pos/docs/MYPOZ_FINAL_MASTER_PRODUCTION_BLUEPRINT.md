# MyPoz Final Master Production Blueprint

**Status:** Living architecture authority — 2026-08-26 (COD-first Business OS overlay)  
**Freeze branch:** `production-hardening`  
**Execution branch:** `business-os-cod-first`  
**Immutable migrations:** `0001`–`0029` (forward-only; `0030` applied)  
**Infrastructure posture:** **Vercel + Supabase/Postgres + WebXPay (+ managed email/WhatsApp/storage/monitoring).**  
**Do not add:** aaPanel, Webuzo, self-managed VPS panels, second database, Kubernetes, or microservice sprawl at this stage.

This document is the **single source of truth** for architecture.  
**Execution order:** [`MYPOZ_BUSINESS_OS_NEXT_EXECUTION_ROADMAP.md`](./MYPOZ_BUSINESS_OS_NEXT_EXECUTION_ROADMAP.md) + [`docs/work/`](./work/).

> HQ → SaaS → Tenants → Branches → POS → Storefront → WhatsApp → Inventory → Purchasing → Payments → Returns → Refunds → Reporting → Security → Backups → Monitoring → Integrations → Client onboarding → Legacy removal → Production certification.

---

## 1. Non-negotiables

1. **Postgres is the system of record** for money, inventory, authz, orders, payments, audit, and tenant data.
2. **`production + Supabase` ⇒ zero silent JSON/localStorage fallback** for those domains.
3. **One payment ledger:** `payment_intents` + `payment_events` (+ refunds when certified).
4. **One audit ledger:** `audit_events` via `write_audit_event`.
5. **One inventory truth:** `branch_stock` + `stock_movements` (typed reasons).
6. **Card/online never decrements stock before verified payment.**
7. **A payment/event can never double-apply stock or double-create a sale.**
8. **Tenant A never sees or mutates Tenant B.** HQ platform roles are separately auditable.
9. **No catalog restore from corrupted Aug-24 JSON.** No mass legacy delete until Gate 4 + Gate 5 pass.
10. **Do not destructively rewrite migrations `0001`–`0029`.**

---

## 2. Frozen architecture (five layers)

```text
┌─────────────────────────────────────────────┐
│                MYPOZ HQ                     │
│ Platform / SaaS / Billing / Support / Ops  │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│             MULTI-TENANT CORE               │
│ Org / Branch / Users / RBAC / Audit        │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│             COMMERCE ENGINE                 │
│ POS / Store / Orders / Inventory / CRM     │
│ Purchasing / Returns / Refunds / Reports   │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│            INTEGRATION LAYER                │
│ Payments / WhatsApp / Email / SMS / Files  │
│ Webhooks / Notifications / APIs            │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│          INFRASTRUCTURE / DATA              │
│ Vercel / Supabase / PostgreSQL / Storage   │
│ Backups / Monitoring / DR / Security       │
└─────────────────────────────────────────────┘
```

### Runtime topology (keep)

```text
Internet → Vercel (Next.js + API) → Supabase Postgres (+ Auth, Storage)
                                  → WebXPay (first certified LKR provider)
                                  → Meta WhatsApp / Resend email
```

### Explicitly deferred

aaPanel / Webuzo / bare VPS · WebXPay live cards (after Business OS pilot) · Owner Portal IA redesign · agent approval center until Jarvis BI is reliable · catalog import from Aug-24 JSON · mass legacy deletion.

---

## 3. Domain model (target shape)

| Domain | Canonical objects |
|--------|-------------------|
| Identity | organizations, memberships/profiles, branches, registers, roles |
| Catalog | products, variants, categories, pricing, discounts |
| Inventory | branch_stock, stock_movements / ledger reasons, transfers, GRN, stocktakes |
| Commerce | sales, sale_lines, orders, customers, fulfillment |
| Payments | payment_intents, payment_events, refunds (merchant checkout ≠ SaaS billing) |
| Audit | audit_events |
| Platform | plans, subscriptions, invoices, usage, platform_settings |
| Comms | notifications, WhatsApp threads/messages |
| Storage | object storage for media/docs; Postgres holds metadata only |

**Ledger rule for inventory:**

```text
opening + receives + returns + transfers_in − sales − transfers_out ± adjustments = on-hand
```

---

## 4. Two payment ledgers (never mix)

```text
CLIENT'S CUSTOMER → POS/Storefront → WebXPay → CLIENT BUSINESS
MYPOZ CLIENT      → SaaS subscription billing → MYPOZ HQ
```

WebXPay is the **first certified** merchant provider behind a `PaymentProvider` adapter (`WEBXPAY` | `PAYHERE` | `ONEPAY` | `STRIPE`). Do not certify five gateways at once.

---

## 5. Execution phases (locked order)

| Phase | Name | Exit criteria |
|-------|------|----------------|
| 0 | Architecture freeze | Inventories + this blueprint |
| 1 | Database certification | UI→API→RPC→table→RLS→migration→test for production paths |
| 2 | HQ + multi-tenancy | Org/branch/user/RBAC/subscription boundaries |
| **3 / Gate 4** | **Commerce integrity** | POS, payments, webhook idempotency, inventory, returns, concurrency — certified |
| 4 | Storefront + WhatsApp | Order→pay→fulfill→stock |
| 5 | SaaS platform billing | Plans/limits separate from merchant payments |
| 6 / Gate 5 | Backup / DR / observability | Restore tested; RPO/RTO documented; alerts |
| 7 | Legacy elimination | KEEP/REPLACE/DEPRECATE/DELETE with proof |
| 8 | Load + security | k6 + Gate 3 re-smoke |
| 9 | Client pilot | **One** real tenant |
| 10 | Final production certification | CLIENT READY board |

**COD-first overlay:** see `MYPOZ_BUSINESS_OS_NEXT_EXECUTION_ROADMAP.md` — HQ Pilot #2 and COD soft-launch before WebXPay live cards.

---

## 6. Gate board (current)

| Gate | Status |
|------|--------|
| 2A Migration replay | PASS |
| 2B Completeness | PASS WITH remediation |
| 3 Security | PASS 79/79 |
| Phase 2 Durability | PASS WITH P1/P2 |
| **Gate 4 Commerce** | PASS WITH P1 (RSA deferred — WebXPay 442) |
| **Gate 5 DR** | PASS WITH P1 (export done; restore drill operator) |
| Final cert board | CLIENT READY still OPEN |
| Catalog | Anaz trusted import PASS (1518) |
| Legacy mass delete | BLOCKED |
| Client onboarding | HQ Pilot #2 is the proof point |

---

## 7. Provider strategy

| Concern | Choice |
|---------|--------|
| App hosting | Vercel (Local / Preview / Production env separation) |
| Database / Auth | Supabase Postgres + RLS |
| Merchant payments | WebXPay staging → live after E2E; adapter for others later; **cards last** |
| Rate limit (distributed) | Upstash Redis REST when configured; memory fallback only for single-isolate |
| Email | Resend |
| WhatsApp | Meta Cloud API |
| Observability (next) | Sentry + Vercel/Supabase logs + payment funnel metrics |
| Load tests (next) | k6 against staging |
| Object files | Supabase Storage (backed up separately from DB) |

**Secrets:** never in Git, docs, frontend bundles, or chat. Rotate Gate 3 test credentials after certification windows.

---

## 8. HQ control plane (target)

Platform roles (separate from tenant roles):

`PLATFORM_OWNER` · `PLATFORM_ADMIN` · `PLATFORM_SUPPORT` · `PLATFORM_FINANCE` · `PLATFORM_SECURITY`

Hierarchy:

```text
Platform → Organization → Branch → Register → User
```

HQ must not casually bypass tenant RLS; any break-glass path is explicit and audited.

---

## 9. Onboarding template (COD-first)

```text
CREATE ORG → OWNER → BRANCH → REGISTER → USERS → IMPORT PRODUCTS (validated)
→ OPEN REGISTER → COD / CASH SALE → VERIFY LEDGER → GO LIVE
→ (later) WebXPay card path
```

Throwaway proof: **HQ Pilot #2** (`docs/work/04-HQ-PILOT-02.md`).

---

## 10. Final CLIENT READY board (Gate 10)

```text
Architecture · Migration replay · DB completeness · RLS · AuthN/Z · Audit
Payments (DB) · Webhook idempotency · POS · Inventory · Returns/Refunds
Concurrency · Reporting · Backup/Restore · Monitoring · Tenant onboarding
Catalog (Anaz trusted) · Legacy removal · TypeScript · Tests · Production deploy
```

All must be **PASS** before paying clients at scale.  
**Cards / RSA** are P2 last — COD soft-launch may proceed earlier.

---

## 11. Related certification docs

| Doc | Role |
|-----|------|
| `MYPOZ_BUSINESS_OS_NEXT_EXECUTION_ROADMAP.md` | COD-first execution overlay |
| `docs/work/*` | Ordered sprint work packages |
| `MYPOZ_CERTIFICATION_ROADMAP.md` | Gate board |
| `PHASE2_DURABILITY_CERTIFICATION.md` | Durability closeout |
| `GATE3_SECURITY_CERTIFICATION_FINAL.md` | Security |
| `GATE4_COMMERCE_INTEGRITY_CERTIFICATION.md` | Commerce |
| `GATE5_BACKUP_DR_CERTIFICATION.md` | Backup / DR |
| `MYPOZ_FINAL_PRODUCTION_CERTIFICATION.md` | Final gateboard / CLIENT READY |
| `PRODUCTION_ENV_KEYS_CHECKLIST.md` | Env keys (names only) |
| `WEBXPAY_STAGING_SETUP.md` | Payment staging ops |
| `P1_CLOSURE_PROGRESS.md` | P1 tracking |
| `LEGACY_REMOVAL_PLAN.md` | Delete rules |
| `docs/archive/` | Superseded audits/plans (not SoT) |

---

## 12. Agent operating rules

When executing work against this blueprint:

1. Prefer certification and eliminating duplication over new features.
2. Every commerce claim needs `input → API → authz → RPC/SQL → DB state → audit` evidence.
3. HTTP 200 alone is never PASS.
4. Follow `docs/work/` top-to-bottom; do not skip to Jarvis/agents before HQ Pilot #2.
5. WebXPay/cards are last — do not block COD soft-launch or HQ pilot on staging 442.
6. On P0 failure: **STOP**, write remediation, do not thrash unrelated modules.
7. Update this blueprint only when architecture decisions change — not for routine test logs.

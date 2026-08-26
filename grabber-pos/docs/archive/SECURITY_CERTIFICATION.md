# MyPoz Security Certification — Gate 3

**Project:** `veavfkjgtkbnggukzjds`  
**App under test:** `https://mypoz-and-store-ui.vercel.app`  
**Date:** 2026-08-25  
**Runner:** `scripts/gate3-security-cert.mjs`  
**Evidence:** `data/backups/gate3-security-results.json` (gitignored)  
**Verdict:** **PASS** — see [`docs/GATE3_SECURITY_CERTIFICATION_FINAL.md`](./GATE3_SECURITY_CERTIFICATION_FINAL.md)  
**Superseded by:** Final Phase A certification on commit `530b65b` (2026-08-25).

> Do not restore catalog / production commerce data until this gate passes.

---

## Executive summary

| Area | Result |
|------|--------|
| Auth login (HQ / Tenant A owner / manager / cashier / Tenant B owner) | PASS |
| Forged `user_metadata.role=gms_admin` does **not** set `app_metadata` | PASS |
| HQ `app_metadata.role=gms_admin` present for HQ user | PASS |
| PostgREST RLS cross-tenant isolation (products, stock, orgs, WhatsApp docs, profiles, inserts) | PASS |
| Unauthenticated API access → 401 | PASS |
| Forged Bearer JWT → 401 | PASS |
| Cookie-session HQ denial for manager / cashier / Tenant B | PASS |
| Cookie-session HQ access for Tenant A owner | **FAIL (HIGH)** — likely `GMS_ADMIN_EMAILS` allowlist |
| Cashier `GET /api/audit` | **FAIL (HIGH)** — 200, expected 403 |
| `GET /api/reports/summary` (authenticated cookie) | **FAIL (CRITICAL)** — HTML 404 (route not on deploy) |
| `POST /api/returns` (authenticated cookie) | **FAIL (CRITICAL)** — HTML 404 (route not on deploy) |
| GMS code does not trust `user_metadata` | PASS (static) |

**Aggregate from last full run:** 79 tests, 70 pass, **9 fail**, all CRITICAL/HIGH.

---

## Identities used

| Identity | Email | Role | Notes |
|----------|-------|------|-------|
| HQ/GMS | `anasbikes1992@gmail.com` | owner + `app_metadata.gms_admin` | HQ workspace org |
| Tenant A owner | `anazazeez1992@gmail.com` | owner | `user_metadata.role=gms_admin` planted (must not elevate) |
| Tenant A manager | `tenant-a-manager@mypoz.test` | manager | |
| Tenant A cashier | `tenant-a-cashier@mypoz.test` | cashier | |
| Tenant B owner | `pilot2-owner@mypoz.test` | owner | |
| Unauthenticated | — | — | |
| Forged Bearer | invalid JWT | — | |

Minimal fixtures only (2 products, 3 orgs). **Not** a catalog restore.

Temporary Gate-3 passwords were set in Auth for these users for certification. **Rotate them after certification** (do not store production passwords in git or this document).

---

## Test matrix (condensed)

### A. Authentication

| ID | Request | Expected | Actual | Result | Severity |
|----|---------|----------|--------|--------|----------|
| auth_login_* | Password grant ×5 | 200 + token | 200 | PASS | — |
| auth_forged_user_metadata_not_app_metadata | Inspect Tenant A owner JWT | `app_metadata.role` ≠ gms_admin | `app_metadata.role=null`, `user_metadata.role=gms_admin` | PASS | — |
| auth_hq_app_metadata_gms_admin | Inspect HQ JWT | `app_metadata.role=gms_admin` | gms_admin | PASS | — |

### B. RLS (PostgREST + user JWT)

| ID | Expected | Actual | Result | Severity |
|----|----------|--------|--------|----------|
| rls_products_a_owner_sees_own | Only SEC-A-1 | SEC-A-1 | PASS | — |
| rls_products_a_cannot_see_b | Empty | `[]` | PASS | — |
| rls_products_b_owner_sees_own | Only SEC-B-1 | SEC-B-1 | PASS | — |
| rls_branch_stock_cross_tenant | Empty for B product | `[]` | PASS | — |
| rls_organizations_no_cross | Own org only | tenant-a-sec only | PASS | — |
| rls_app_documents_whatsapp_cross | Own WhatsApp doc | A-PHONE only | PASS | — |
| rls_unauth_products | 401 or empty | empty | PASS | — |
| rls_insert_cross_tenant_product_blocked | 4xx RLS | **403** `42501` | PASS | — |
| rls_platform_settings_tenant_denied | Denied | **403** | PASS | — |
| rls_profiles_no_cross_tenant | Only org A profiles | org A only | PASS | — |
| rls_sales / sale_returns / stocktakes / audit_events | Tenant scoped | empty own-scope arrays | PASS | — |

### C. Unauthenticated / forged API

All listed protected routes (`/api/audit`, `/api/reports/summary`, `/api/register`, `/api/returns`, `/api/stocktake`, `/api/transfers`, `/api/purchase-orders`, `/api/billing`, `/api/whatsapp/inbox`, `/api/ai/settings`, `/api/hq/*`) returned **401** without session. Forged Bearer → **401**.

### D. Cookie-session API (deployed app)

| ID | Expected | Actual | Result | Severity | Remediation |
|----|----------|--------|--------|----------|-------------|
| api_cookie_tenant_a_owner HQ | 401/403 | **200** | FAIL | HIGH | Remove tenant emails from `GMS_ADMIN_EMAILS` on Vercel; HQ elevation must be `app_metadata` only for operators |
| api_cookie_tenant_a_manager/cashier/B HQ | 403 | 403 | PASS | — | — |
| api_cookie_hq HQ | 200 | 200 | PASS | — | — |
| api_cookie_*_reports_summary | 200 | **HTML 404** | FAIL | CRITICAL | Production deploy missing `/api/reports/summary` (proxy 401 without cookie; App Router 404 with cookie) |
| api_cookie_*_returns_post | role-gated | **HTML 404** | FAIL | CRITICAL | Production deploy missing `/api/returns` |
| api_cookie_tenant_a_cashier_audit_get | 403 | **200** | FAIL | HIGH | Redeploy so `requireRoles(["owner","manager"])` on `GET /api/audit` is live; verify cashier cannot list audit |

**Note:** Bearer-only Authorization is ignored by the app (cookie SSR session). That is acceptable if intentional; document as cookie-session-only API auth.

---

## HQ authorization analysis

`src/lib/server/gms-auth.ts` correctly uses:

- `user.app_metadata` role / flags
- `GMS_ADMIN_EMAILS` allowlist

It does **not** read `user_metadata`.

Tenant A owner still received HQ **200** while JWT showed `app_metadata.role=null`. Conclusion: **email is on the production `GMS_ADMIN_EMAILS` allowlist** (or equivalent). That is a control-plane misconfiguration for multi-tenant SaaS: a tenant owner must not be a GMS operator.

Manager/cashier/Tenant B correctly received **403** on HQ — proving claim forgery via `user_metadata` alone does **not** open HQ.

---

## Service-role usage (code audit)

| Path | Why service role | Tenant identity source | Client `org_id` influence? |
|------|------------------|------------------------|----------------------------|
| Payment webhook completion | No user session | Payment ledger / order row in DB | No — must not trust body org |
| WhatsApp webhook / `whatsapp_create_order` | No user session | `phone_number_id` → `app_documents` / sole-org resolve | No |
| Storefront order RPCs | Public DEFINER RPCs | Host/slug → storefront row | No |
| HQ backup / tenant ops | GMS gate then service | Tenant id from HQ path after `requireGmsAdmin` | Path id only after HQ auth |
| `createServiceSupabase` callers | Background / admin | Must remain server-only | N/A |

No evidence in this Gate that service-role keys are exposed to the browser. **Do not put service-role values in docs or chat.**

---

## In-memory rate limiters (Vercel multi-instance)

| Location | Mechanism | Vercel-safe? | Replacement |
|----------|-----------|--------------|-------------|
| `src/lib/server/rate-limit.ts` + `proxy.ts` | In-memory `Map` | **No** (per isolate) | Edge/WAF (Cloudflare), Upstash Redis, or platform rate limits — see `docs/DDOS_AND_WAF.md` |
| `src/app/api/store/[slug]/order/route.ts` | In-memory | **No** | Shared store / WAF |
| `src/app/api/email/send/route.ts` | In-memory | **No** | Shared store |
| `src/app/api/auth/forgot-password/route.ts` | In-memory | **No** | Shared store + provider limits |

Severity: **MEDIUM** (not Gate-3 blocking alone, but required before scale).

---

## Severity roll-up

| Severity | Open issues |
|----------|-------------|
| CRITICAL | Production missing `/api/returns` and `/api/reports/summary` (authenticated → HTML 404) |
| HIGH | Cashier can `GET /api/audit` on production; Tenant A owner has HQ via allowlist |
| MEDIUM | In-memory rate limits unsuitable for multi-instance |

---

## Remediation checklist (must clear before Gate 3 PASS)

1. **Redeploy** `mypoz-and-store-ui` from current `main` so returns, reports summary, and audit role gates are live.
2. Re-run `node scripts/gate3-security-cert.mjs` — cookie tests for returns/reports must return JSON (200/400/403), never HTML 404.
3. Confirm cashier `GET /api/audit` → **403**.
4. Remove non-operator emails from Vercel `GMS_ADMIN_EMAILS`; keep HQ elevation on `app_metadata.role=gms_admin` for true operators only.
5. Rotate Gate-3 temporary Auth passwords.
6. Plan shared rate-limit backend before multi-region scale.

---

## Gate status

Authoritative sequence: [`docs/MYPOZ_CERTIFICATION_ROADMAP.md`](./MYPOZ_CERTIFICATION_ROADMAP.md)

| Gate | Status |
|------|--------|
| Gate 1 — DB reconstruction | PASS |
| Gate 2A — one-shot migration replay | PASS (`docs/GATE2A_MIGRATION_REPLAY_CERTIFICATION.md`) |
| Gate 2B — completeness | Pending (read-only; does not replace this gate) |
| **Gate 3 — security** | **FAIL** — redeploy + restrict `GMS_ADMIN_EMAILS`, then re-run |
| Gate 4 — commerce | BLOCKED until Gate 3 PASS |
| Catalog restore | BLOCKED |

---

## Reproduce

```bash
# Requires GATE3_ANON_KEY (publishable/anon) + GATE3_TEST_PASSWORD for seeded users
# On Windows TLS issues: NODE_OPTIONS=--use-system-ca
node scripts/gate3-security-cert.mjs
```

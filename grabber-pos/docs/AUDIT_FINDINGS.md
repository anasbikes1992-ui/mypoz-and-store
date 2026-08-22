# MyPoz Phase A — Audit findings

**Date:** 2026-08-21 (remediation update same day)  
**Scope:** Phase A forensic audit + controlled P1 remediation.  
**Live host:** `https://mypoz-and-store-ui.vercel.app`  

**Remediation status:** A-P1-02 / A-P1-03 / A-P1-05 fixed in code; A-P1-01 investigated (no blind proxy change); A-P1-04 accepted as test debris. Operator checks A-OP-01 / A-OP-02 still required before declaring Phase A complete.

---

## Executive summary

MyPoz soft-launch on **mypoz-and-store-ui** is **conditionally ready**. Core POS sales path is atomic via DEFINER `create_sale` / `create_sale_internal`. Storefront COD board persistence fix (`9f6d14a`) is present in code and **RUNTIME VERIFIED** (`GPS-MAIN-20260821-0007` + `DEL-4B98C749`). HQ APIs gate on `requireGmsAdmin`. WhatsApp webhook verifies Meta signatures when secret is set.

No **proven cross-tenant data leak** was demonstrated in this pass. Highest open engineering risks are **optimistic edge auth** (cookie presence) and **authenticated email send without role gate**. Migration **naming** in git vs production history is drifted (hardening exists remotely under different names). Auth Site URL allowlist and allowlisted WhatsApp `hi` remain **operator-only**.

---

## P0 findings

_None opened in this pass._

No stop-the-line cross-tenant leak was evidenced. Known COD board failure is **FIXED** (see historical).

---

## P1 findings

### A-P1-01 — Proxy authenticates on cookie *presence*, not JWT validity

| Field | Value |
|-------|--------|
| **Severity** | P1 |
| **Area** | Authentication / edge |
| **Status** | INVESTIGATED — no blind proxy JWT change |
| **Evidence** | `src/proxy.ts` cookie-presence gate remains. Census: POS core uses `getRepository()` → `auth.getUser()`. Email + permissions now use `requireTenantSession()`. `docStore.write` fails closed when `requireSupabase` and session missing. Vitest: `api-auth-census.test.ts`. |
| **Finding** | Most private APIs go through session-scoped stores / RLS; the dangerous gap was handlers that send mail or mutate permissions without `getUser`. **Do not** add full JWT validation in proxy until remaining store-only routes are inventoried for write paths. |
| **Next** | Optional follow-up: add `requireTenantSession` to residual routes (`ai/settings`, `audit`, `print`, `products/template`, variants, discount validate); then consider edge JWT. |

---

### A-P1-02 — `POST /api/email/send` has no role gate beyond session

| Field | Value |
|-------|--------|
| **Severity** | P1 |
| **Area** | API / abuse |
| **Status** | REMEDIATED |
| **Fix** | `requireTenantSession()`; cashier limited to `digital-delivery` + `order-confirmation`; owner/manager for other templates; 10/min per user rate limit. GET also requires session. |
| **Evidence** | `src/app/api/email/send/route.ts`, `src/lib/server/auth-session.ts` |

---

### A-P1-03 — Repo migrations end at `0018`; production has extra hardening under different names

| Field | Value |
|-------|--------|
| **Severity** | P1 |
| **Area** | Database / ops drift |
| **Status** | REMEDIATED (repo sync) |
| **Fix** | Checked-in SQL recovered from the SQL that was applied to production: `0019_rls_select_wrappers.sql`, `0020_collection_matches_stable.sql`, `0021_receipt_indexes_domain_stock.sql`. Remote history names remain `rls_select_wrappers` / etc.; content matches. **Do not re-apply** to prod (already in `schema_migrations`). |
| **Evidence** | Files under `supabase/migrations/`; prod versions `20260821055433`–`55512`. |

---

### A-P1-04 — Pre-fix COD smoke sales lack delivery boards (orphan ONLINE_STORE sales)

| Field | Value |
|-------|--------|
| **Severity** | P1 |
| **Area** | Data integrity / COD |
| **Status** | ACCEPTED AS TEST DEBRIS |
| **Evidence** | Sales `GPS-MAIN-20260821-0003`…`0006` from failed checkout smoke; not customer orders. |
| **Decision** | Leave ledger alone — **do not** recreate sales or re-deduct stock. Optional later: annotate in ops notes. No board backfill required for accounting. |

---

### A-P1-05 — Default manager PIN `"1234"` in code defaults

| Field | Value |
|-------|--------|
| **Severity** | P1 |
| **Area** | Authorization / POS |
| **Status** | REMEDIATED |
| **Fix** | Default PIN is empty (gates unavailable until owner configures). PINs stored as `scrypt$salt$hash`; legacy plaintext verified then upgraded. Only **owner** may change permissions/PIN. Void fails closed when PIN unset. |
| **Evidence** | `permissions-store.ts`, `manager-pin.ts`, `permissions/route.ts`, `sales/[id]/void/route.ts`, `manager-pin.test.ts` |

---

## Fixed historical issues

### A-HIST-01 — Anonymous COD board write / tenant slug

| Field | Value |
|-------|--------|
| **Severity** | Was P0 operational |
| **Status** | FIXED |
| **Evidence** | `src/proxy.ts` L43–50 stamps `x-mypoz-slug` for `/store` and `/api/store`. `placeStorefrontOrder` resolves `boardOrgId` via `storefront_by_host(host, slug)` (`storefront-repo.ts` L43–54, L781–820). `createOrderFromStorefront(..., orgId)` service-role upsert (`delivery-store.ts` L151–163). Commits `b043397`, `9f6d14a`. |
| **Tenant abuse check** | Org id is **not** taken from client body; it comes from published storefront RPC for the **URL slug**. Attacker can only create boards for a slug they already checkout against (same as placing a public order). Cross-org product IDs fail catalog resolution for that slug. |
| **RUNTIME** | `vc curl` POST `/api/store/anaz-store/order` → `success:true`, `receiptNo: GPS-MAIN-20260821-0007`, `boardId: DEL-4B98C749`. DB row status `new`. |

---

## Unknown / operator verification

| ID | Item | Status |
|----|------|--------|
| A-OP-01 | Supabase Auth Site URL + redirect allowlist for `mypoz-and-store-ui` / `/update-password` / localhost | **PENDING OPERATOR** — agent cannot read dashboard (login required). Checklist in `docs/RELEASE_GATE.md` |
| A-OP-02 | Allowlisted WhatsApp inbound `hi` → menu → inbox | **PENDING OPERATOR** — webhook/smoke PASS (`failed: 0`); live `hi` still needs your phone. Templates deferred until Meta Approved |
| A-OP-03 | Supabase PITR enabled | OPERATOR ACTION (budget) |
| A-OP-04 | Cloudflare in front of Vercel | OPERATOR ACTION (DNS) |
| A-OP-05 | Mobile viewport checkout UX | UNKNOWN — needs browser session (desktop COD HTTP verified) |

---

## Architecture discrepancies (docs vs code/DB)

| Claim | Actual |
|-------|--------|
| GTM: migrations “0019–0021” | Repo now has `0019`–`0021` SQL matching what was applied remotely (remote history names differ) |
| Graphify ~2959 nodes | Local graph ~3088 nodes (stale count in prompt OK) |
| Soft-launch “complete” | Engineering mostly yes; **Auth URL + WA `hi`** still operator |
| Roles ADMIN/STAFF | **Actual:** `profiles.role` ∈ `owner` \| `manager` \| `cashier`; HQ = `gms_admin` via `GMS_ADMIN_EMAILS` / metadata (`database.types.ts`, `gms-auth.ts`) |

Do **not** auto-rewrite maps in this phase; A-P1-03 SQL is now in git.

---

## Production risks (meaningful)

1. Edge auth optimism (A-P1-01) if any API skips `getUser` / `requireGmsAdmin`.
2. Email send abuse (A-P1-02) if Resend live.
3. Schema rebuild from git alone misses remote hardening (A-P1-03).
4. Operator Auth redirect misconfig → broken password reset (A-OP-01).
5. Vercel Hobby **CLI** deploy limit — **not** an app architecture failure; **git deploy works** (RUNTIME: recent READY deploys with `lambdaRuntimeStats: {"nodejs":4}`).

---

## Verified baseline (do not re-plan)

| Area | Evidence level |
|------|----------------|
| Live host `mypoz-and-store-ui` health | RUNTIME: `status=ok`, `backend=supabase`, `gatewayLedger=service-role`, `whatsapp=true` |
| Anaz ~1518 products | Prior SQL + catalog; not re-counted this pass |
| HQ `requireGmsAdmin` on HQ APIs | CODE: all `src/app/api/hq/**` sampled import gate |
| POS sale atomicity + `client_uuid` idempotency | CODE: `0002_functions.sql` / `create_sale_internal` |
| Storefront settle without double stock | CODE: `settleStorefrontDelivery` comment + implementation |
| WhatsApp webhook signature | CODE: `webhook/route.ts` L61–75 fail-closed when secret/requireSupabase |
| Payments webhook fail-closed | CODE: unverified → not applied |
| Password rotate artifacts | Local `scripts/*.local.json` **gitignored**; not in git history |
| `mypoz-and-store` project | Not touched (constraint respected) |

---

## Recommended next actions (max 10)

1. Operator: confirm Supabase Auth URL allowlist (A-OP-01).
2. Operator: allowlisted WhatsApp `hi` smoke (A-OP-02).
3. Export remote hardening SQL into repo migrations; fix GTM “0019–0021” naming (A-P1-03).
4. Gate `/api/email/send` by role + rate limit (A-P1-02).
5. Plan proxy JWT validation for private `/api/*` (A-P1-01).
6. Force/rotate default manager PIN (A-P1-05).
7. Decide backfill vs ignore orphan smoke sales 0003–0006 (A-P1-04).
8. Keep deploying via **git**, not Hobby CLI.
9. Leave `mypoz-and-store` undeployed; deletion only with explicit OK.
10. Proceed to Phase B only after A-OP-01 (and preferably A-OP-02).

---

## Phase A verdict

```text
CONDITIONALLY READY — OPERATOR VERIFICATION REQUIRED
```

**Blockers for “READY FOR PHASE B” (product/GTM audit):** A-OP-01 Auth URL; preferably A-OP-02 WhatsApp `hi`.  
**No P0 STOP THE LINE** opened from this forensic pass.

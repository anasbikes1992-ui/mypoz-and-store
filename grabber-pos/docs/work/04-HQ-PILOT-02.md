# 04 — HQ Pilot #2

**Status:** PASS WITH FOLLOW-UPS (2026-08-26)  
**Tenant:** `pilot-02` · org `0aba445f-94e6-4a64-aea9-883475f90d9d`  
**Owner:** `pilot-02-owner@mypoz.test`  
**Evidence:** `data/backups/hq-pilot-02-*.json`, `hq-pilot-02-ops-*.json`

## Preflight

- [x] P0 UI smoke Anaz `/commerce/orders` → `GPS-MAIN-20260826-0001` (**10/10** via `scripts/p0-ui-smoke.mjs`)
- [x] P0 UI smoke HQ tenants = licences (4 orgs, same API)
- [x] P0.1–P0.5 eng fixes on `business-os-cod-first`
- [ ] Operator: A-OP-01 / Gate 5 off-site (parallel)
- [ ] Deploy `business-os-cod-first` so idempotent provision + unknown-slug 404 are live

## What ran (through HQ product)

1. HQ `POST /api/hq/tenants` → org + MAIN branch + register + published storefront `pilot-02`
2. `scripts/provision-tenant-owner.mjs` attached owner (password never via HQ UI)
3. Owner created product **Pilot 02 Test Item**, stock via `/api/stock/grn`
4. Seeded CMS docs (`website`/`commerce`/`settings`) — **required**; HQ shell alone was not enough on live
5. Storefront COD → `GPS-MAIN-20260826-0002` · total 350 · isolated from Anaz
6. Attack: owner HQ **403** · overstock **STOCK blocked** · Anaz orders not visible

## Ops result

`scripts/hq-pilot-02-ops.mjs` → **10/10 PASS**

## Findings (do not redesign — patch & deploy)

| Finding | Severity | Action |
|---------|----------|--------|
| Production HQ provision not idempotent (created `pilot-02-1`, `pilot-02-2`) | P1 | Deploy idempotent `provisionDurableTenant` from this branch |
| HQ provision omitted website/commerce/settings → `/store/{slug}` 500 | P0 | Seeded live; code now upserts CMS on provision |
| Unknown slug returns HTTP 500 (not 404) on production | P0 | `getStorefrontInfo` fail-closed when slug miss — **needs deploy** |
| Receipt nos collide across orgs (`MAIN` branch code) | Info | Expected; scoped by `org_id` |

Duplicate throwaway storefronts `pilot-02-*` disabled (draft).

## Exit criterion

> HQ can create a tenant that can operate tomorrow (COD).

**Met** for `pilot-02` after CMS seed. Full green on production requires deploying this branch.

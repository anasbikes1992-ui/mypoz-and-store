# 04 — HQ Pilot #2

**Status:** PASS — production patches deployed & smoked (2026-08-27)  
**Tenant:** `pilot-02` · org `0aba445f-94e6-4a64-aea9-883475f90d9d`  
**Owner:** `pilot-02-owner@mypoz.test`  
**Evidence:** `data/backups/hq-pilot-02-*.json`, `hq-pilot-02-ops-*.json`  
**Deploy:** git → `production-hardening` → promote on `mypoz-and-store-ui` (CLI Hobby capped)

## Preflight

- [x] P0 UI smoke Anaz `/commerce/orders` → `GPS-MAIN-20260826-0001` (**10/10** via `scripts/p0-ui-smoke.mjs`)
- [x] P0 UI smoke HQ tenants = licences (same API)
- [x] P0.1–P0.5 eng fixes on `business-os-cod-first` / merged to `production-hardening`
- [ ] Operator: A-OP-01 / Gate 5 off-site (parallel — reply `A-OP-01: PASS`)
- [x] Deploy live: idempotent provision + CMS seed-if-missing + unknown-slug **404** + forgot-password public

## Production smoke (pre-card)

`node scripts/production-pre-card-smoke.mjs`

| Check | Result |
|-------|--------|
| `/api/health` | 200 ready |
| `/store/unknown-*` | **404** (was 500) |
| `/api/store/unknown-*/catalog` | **404** |
| `/store/anaz-store` | 200 Anaz |
| `/store/pilot-02` | 200 Pilot 02 |
| `/store/main-store` | 308 → `/store/anaz-store` |
| `POST /api/auth/forgot-password` | 200 (not 401) |
| `/forgot-password`, `/login` | 200 |

**WebXPay / cards:** not in this smoke — last (`docs/work/12`).

## What ran (through HQ product)

1. HQ `POST /api/hq/tenants` → org + MAIN branch + register + published storefront `pilot-02`
2. `scripts/provision-tenant-owner.mjs` attached owner
3. Owner product + stock + CMS (now also seeded by provision when missing)
4. Storefront COD → `GPS-MAIN-20260826-0002` · isolated from Anaz
5. Attack: owner HQ **403** · overstock blocked · Anaz orders not visible

## Ops result

`scripts/hq-pilot-02-ops.mjs` → **10/10 PASS**

## Findings closed on deploy

| Finding | Status |
|---------|--------|
| Non-idempotent provision (`pilot-02-1/2`) | Fixed — match slug/name + DB unique |
| Missing website/commerce/settings → 500 | Fixed — seed **if missing** only |
| Unknown slug → 500 | Fixed — fail-closed → **404** |
| Forgot-password → 401 | Fixed — `PUBLIC_PATHS` |

## Exit criterion

> HQ can create a tenant that can operate tomorrow (COD).

**Met.** Freeze Pilot #2 foundation. Next: `05-OWNER-COMPLETENESS.md` (no IA redesign).

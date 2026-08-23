# MyPoz & Store — product finalize status

**One codebase:** `grabber-pos` (package `mypoz-commerce-cloud`)  
**One production DB:** Supabase `veavfkjgtkbnggukzjds` (ap-northeast-1)  
**One live host:** https://mypoz-and-store-ui.vercel.app  

Leave `mypoz-and-store` undeployed.

**Launch remaining:** [LAUNCH_STATUS.md](LAUNCH_STATUS.md)

---

## Live tenants (durable)

| Org | Slug | Profiles | Products | Plan | Storefront |
|-----|------|----------|----------|------|------------|
| MyPoz HQ workspace | `mypoz-hq` | 1 (GMS) | 0 | — | — |
| Anaz Store | `anaz-store` | 1 owner | **1518** | **business** | published `/store/anaz-store` |
| Pilot 2 Test | `pilot-2-test` | 1 | — | — | provisioned |

Migrations on remote: through **`0023_launch_rls_hardening`** (git `0001`–`0023`).

---

## How HQ creates the next client

1. Sign in as GMS admin → `/hq/onboard`
2. **Create organization** is **on by default** (service role) → org + MAIN branch + register + tenant licence + **published storefront**
3. Owner password (never in the UI):

```bash
UPSERT_ADMIN_EMAIL=owner@client.com UPSERT_ADMIN_PASSWORD='…' \
UPSERT_ORG_SLUG=client-slug UPSERT_ORG_NAME='Client Name' \
node --env-file=.env.local scripts/provision-tenant-owner.mjs
```

4. Set plan / extras on `/hq/tenants/[id]` — Business+ unlocks **Shop knowledge**; or add extra `knowledge` on Starter.

Pipeline-only clients (checkbox off) do **not** appear on `/hq/tenants` when the live `reseller_licences` view is active.

---

## Seed / provision scripts (aligned)

| Script | Use |
|--------|-----|
| `scripts/provision-hq-admin.mjs` | HQ GMS admin |
| `scripts/provision-tenant-owner.mjs` | Client owner + org/storefront if missing |
| `scripts/seed.mjs` / `seed-catalog-only.mjs` | Demo catalog (not Anaz) |
| Anaz import / publish scripts | Already loaded — 1518 products live |

---

## Tests

```bash
npm test          # vitest unit
npm run ops:gate  # production health + WA + catalog
npm run test:e2e  # Playwright (needs PLAYWRIGHT_EMAIL / PASSWORD)
```

---

## Soft-launch smoke

See [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) — COD order, mobile cart, WhatsApp, shop knowledge harvest, Export Excel on `/products`.

# MyPoz & Store — product finalize status

**One codebase:** `grabber-pos` (package `mypoz-commerce-cloud`)  
**One production DB:** Supabase `veavfkjgtkbnggukzjds` (ap-northeast-1)  
**One live host:** https://mypoz-and-store-ui.vercel.app  

Leave `mypoz-and-store` undeployed.

---

## Live tenants (durable)

| Org | Slug | Profiles | Products | Storefront |
|-----|------|----------|----------|------------|
| MyPoz HQ workspace | `mypoz-hq` | 1 (GMS) | 0 | — |
| Anaz Store | `anaz-store` | 1 owner | **1518** | published `/store/anaz-store` |

Migrations on remote: **22** history rows (local `0001`–`0018` + companions).

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
npm run test:e2e  # Playwright (needs PLAYWRIGHT_EMAIL / PASSWORD)
```

---

## Soft-launch smoke

See [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) — COD order, mobile cart, WhatsApp webhook verify, Export Excel on `/products`.

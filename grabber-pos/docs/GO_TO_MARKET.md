# MyPoz — go-to-market plan

**Status:** Phase A soft-launch in progress (manual smokes remain). Phases B–C
code/docs/env hygiene largely done; Phase D is backlog.  
**Live host only:** https://mypoz-and-store-ui.vercel.app  
**Do not** send launch traffic to `mypoz-and-store`.

Companion visual: open the **MyPoz soft-launch review** canvas beside this chat.

---

## Verdict

| Layer | Score | Note |
|-------|------:|------|
| POS | 9/10 | Billing engine + retail/wholesale strong |
| Storefront | 8.5/10 | Anaz live; COD workflows; no live card APIs by design |
| HQ + licensing | 8/10 | Fleet + tiers + extras; tickets thin |
| Ops / smoke | 6.5/10 | Checklists still open; WA token gate |
| Security | 7.5/10 | RLS + WAF docs; Auth redirects / PITR to confirm |
| Docs | 8.5/10 | Broad; keep checklists in sync with reality |

**Overall ~7/10** until Phase A below is green.

---

## Already done (do not re-plan)

- One codebase + Supabase `veavfkjgtkbnggukzjds` + host **mypoz-and-store-ui**
- Migrations including 0019–0021 hardening (RLS wrappers, STABLE collections, atomic receipts, HQ provision RPC)
- Anaz: **1518** products, published `/store/anaz-store`
- HQ `mypoz-hq` + tenant owner provision path
- Product-gap **P1 closed**; FEATURE-PLAN P0–P4 / storefront P6b shipped
- License-gated launcher/nav; login show-password + forgot/reset (`/update-password`)

---

## What you sell (plans)

| Tier | LKR/mo | Unlocks |
|------|-------:|---------|
| **Starter** | 4,500 | Core POS + catalogue + inventory + full commerce suite + register |
| **Business** | 9,500 | All non-vertical modules; verticals via HQ **extras** |
| **Enterprise** | 18,500 | Everything |

**Extras bundles:** `restaurant` → KDS + tables; `delivery` → drivers.  
`whatsapp` is an HQ extra / platform attach — not implied by Starter alone.

Source: `src/lib/plans.ts`, `src/lib/billing.ts`, `src/lib/hq-config.ts`.

---

## Phase A — Anaz soft launch

Ordered. Stop and fix before marketing chat ordering.

1. Confirm Production URL = **mypoz-and-store-ui** only ([DEPLOYMENT.md](DEPLOYMENT.md)) — **done**
2. WhatsApp env on UI project → **done** (token valid; phone = GRABBER.LK `101779492851300` / +94 77 959 2288)
3. Anaz `app_documents.whatsapp` phone attach — **done**
4. Webhook verify — **passing**; Graph send with `appsecret_proof` — **passing**
5. Settings → WhatsApp status panel — **shipped**
6. Soft smokes: catalog / storefront / health / login / forgot-password — **HTTP 200**; Anaz products **1518**; `whatsapp-smoke.mjs` → **failed: 0**
7. Desktop COD + mobile checkout — **manual once** (place one COD order on `/store/anaz-store`)
8. Supabase Auth Site URL + `/update-password` allowlist — **confirm in dashboard** (see below)
9. Allowlisted WhatsApp `hi` to +94 77 959 2288 — **manual once** (Meta may still limit recipients until Business verification finishes)
10. Merchant `/whatsapp` automation graph + inbox staff reply — **shipped**; Anaz greeting / offers / location seeded
11. Meta Commerce catalog **Anaz Store MyPoz** synced (~1518) + linked to WABA — **done**; WhatsApp app may lag ≤24h
12. Anaz Settings phone + `socialWhatsapp` + storefront commerce WA = **+94779592288** — **done** (DB)

### Phase A — Auth allowlist (ops, do now)

Supabase Dashboard → project `veavfkjgtkbnggukzjds` → **Authentication → URL Configuration**:

- **Site URL:** `https://mypoz-and-store-ui.vercel.app`
- **Redirect URLs:**
  - `https://mypoz-and-store-ui.vercel.app/**`
  - `https://mypoz-and-store-ui.vercel.app/update-password`
  - `http://localhost:3000/**`

### Phase A — Merchant smokes (do now)

1. Open `/store/anaz-store` → place **one COD courier** order → Online orders / Delivery → settle (stock once).
2. Repeat checkout on phone width.
3. From an allowlisted Meta number, WhatsApp **hi** to **+94 77 959 2288** → menu → check `/whatsapp` inbox.
4. Optional: edit offers/location on `/whatsapp` graph if the seeded copy needs a real address.

**Security:** If this chat is shared, rotate the WA system-user token in Meta and update Vercel `WHATSAPP_TOKEN`.

Detail checklist: [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md).

---

## Phase B — Harden while soft-live

| Item | Status |
|------|--------|
| Scrub `UPSERT_ADMIN_*` / `GMS_ADMIN_PASSWORD` from Vercel `mypoz-and-store-ui` | **done** |
| App WAF + rate limit ([DDOS_AND_WAF.md](DDOS_AND_WAF.md)) | **shipped in code** — put Cloudflare DNS in front when ready |
| Meta catalog feed / sync ([META_CATALOG_FEED.md](META_CATALOG_FEED.md)) | **done** for Anaz |
| Printer Settings labels clarify `PRINTER_*_IP` env / local agent | **done** |
| CI (`tsc` + vitest) on `grabber-pos/**` | **done** — `.github/workflows/grabber-pos-ci.yml` |
| Staff walkthrough | Docs ready: [USER-GUIDE.md](USER-GUIDE.md), [CLIENT-PLAYBOOK.md](CLIENT-PLAYBOOK.md) |
| Rotate chat passwords | **manual** — `node --env-file=.env.vercel.pull scripts/rotate-chat-passwords.mjs` (prints new passwords once) |
| Supabase **PITR** | **manual** — Dashboard → Database → Backups → enable PITR |
| Cloudflare proxy in front of Vercel | **manual** when DNS is ready |

---

## Phase C — Open market (new tenants)

| Item | Status |
|------|--------|
| Sales one-pager | **done** — [SALES_ONE_PAGER.md](SALES_ONE_PAGER.md) |
| HQ onboard dry-run checklist | **done** — [HQ_ONBOARD_DRY_RUN.md](HQ_ONBOARD_DRY_RUN.md); RPC `hq_provision_tenant` live; fleet = `mypoz-hq` + `anaz-store` |
| WA allowlist promise until Meta Live | **documented** in sales one-pager + dry-run |
| POS invoice WA uses org token/phone override when set | **done** (falls back to platform env) |
| Execute second pilot provision | **manual** — follow HQ dry-run with a throwaway slug |
| Cross-tenant leak = stop-the-line | [GMS-OPERATIONS.md](GMS-OPERATIONS.md) |

---

## Phase D — Later (not launch blockers)

- Live PayHere / PickMe / Uber APIs
- Full courier ledger / HQ multi-tenant order search
- Thin vertical polish (repair, rooms, rent, …)
- WA **approved message templates** (outside 24h window)
- Wire Settings printer IPs → print API (today: env on local agent only)
- Delete unused `mypoz-and-store` Vercel project (only with explicit OK)

---

## Risks

| Risk | Action |
|------|--------|
| WA token exposed in chat | Rotate in Meta → Vercel `WHATSAPP_TOKEN` → redeploy |
| Meta Development mode | Allowlist only |
| Wrong Vercel project | Webhooks + bookmarks → UI host only |
| Cross-tenant leak | Escalate immediately |

---

## Suggested next action

1. **Finish Phase A manual:** Auth allowlist · COD + mobile · allowlisted `hi`.
2. **Phase B manual:** password rotate script · enable PITR · Cloudflare when DNS ready.
3. **Phase C manual:** run [HQ_ONBOARD_DRY_RUN.md](HQ_ONBOARD_DRY_RUN.md) for a second pilot when Anaz is stable.
4. Market **commerce + WhatsApp bot** on allowlisted numbers; Meta phone catalog is optional.

# MyPoz — go-to-market plan

**Status:** Soft-launch ready for Anaz commerce. WhatsApp Cloud API + automation
graph are live; native Meta phone catalog is **connected** (Anaz Store MyPoz) and
may take up to 24h to populate. Remaining Phase A items are mostly **manual
smokes**.  
**Live host only:** https://mypoz-and-store-ui.vercel.app  
**Do not** send launch traffic to `mypoz-and-store`.

Companion visual: open the **MyPoz go-to-market** canvas beside this chat.

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

## Phase A — Anaz soft launch (this week)

Ordered. Stop and fix before marketing chat ordering.

1. Confirm Production URL = **mypoz-and-store-ui** only ([DEPLOYMENT.md](DEPLOYMENT.md)) — **done**
2. WhatsApp env on UI project → **done** (token valid; phone = GRABBER.LK `101779492851300` / +94 77 959 2288)
3. Anaz `app_documents.whatsapp` phone attach — **done**
4. Webhook verify — **passing**; Graph send with `appsecret_proof` — **passing**
5. Settings → WhatsApp status panel — **shipped**
6. Soft smokes: catalog / storefront / health / login / forgot-password — **HTTP 200**; Anaz products **1518**
7. Desktop COD + mobile checkout — **manual once** (place one COD order on `/store/anaz-store`)
8. Supabase Auth Site URL + `/update-password` allowlist — **confirm in dashboard**
9. Allowlisted WhatsApp `hi` to +94 77 959 2288 — **manual once** (Meta may still limit recipients until Business verification finishes)
10. Merchant `/whatsapp` automation graph + inbox staff reply — **shipped**
11. Meta Commerce catalog **Anaz Store MyPoz** synced (~1518) + linked to WABA — **done**; WhatsApp app may lag ≤24h

**Security:** If this chat is shared, rotate the WA system-user token in Meta and update Vercel `WHATSAPP_TOKEN`.

Detail checklist: [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md).

---

## Phase B — Week-1 hardening

- Rotate passwords shared in chat (`scripts/rotate-chat-passwords.mjs` after `vercel env pull`)
- Staff walkthrough: [USER-GUIDE.md](USER-GUIDE.md), [CLIENT-PLAYBOOK.md](CLIENT-PLAYBOOK.md)
- Anaz receipt / tax / printer settings
- Supabase **PITR**; scrub leftover upsert/password env on Vercel
- Cloudflare / WAF per [DDOS_AND_WAF.md](DDOS_AND_WAF.md)
- Tick completed boxes in [SUPABASE_PRODUCTION.md](SUPABASE_PRODUCTION.md) and [PRODUCTION.md](PRODUCTION.md)
- Meta catalog CSV if ads/WA catalog needed ([META_CATALOG_FEED.md](META_CATALOG_FEED.md))

---

## Phase C — Open market (new tenants)

1. HQ onboard dry-run: provision org → owner Auth → publish storefront
2. Sales one-pager: Starter / Business / Enterprise + which extras to sell
3. Promise WhatsApp only to **allowlisted** numbers until Meta **Live** + Business verification
4. Onboard a **second pilot** tenant before broad ads
5. Support rule: cross-tenant data leak = **stop-the-line** ([GMS-OPERATIONS.md](GMS-OPERATIONS.md))

---

## Explicitly later (not launch blockers)

- Live PayHere / PickMe / Uber APIs
- Full courier ledger / HQ multi-tenant order search
- Thin vertical polish (repair, rooms, rent, …)
- WA **approved message templates** (outside 24h window)
- Delete unused `mypoz-and-store` Vercel project (only with explicit OK)

---

## Risks

| Risk | Action |
|------|--------|
| WA token missing | Block WA marketing until smoke green |
| Meta Development mode | Allowlist only |
| Wrong Vercel project | Webhooks + bookmarks → UI host only |
| Cross-tenant leak | Escalate immediately |

---

## Suggested next action

1. **Manual:** one COD order on `/store/anaz-store`; Auth `/update-password` allowlist; allowlisted `hi` smoke.
2. **Wait ≤24h** for Meta to mirror Anaz products into WhatsApp Catalog manager (already connected).
3. Then start **Phase B** (password rotation, PITR, WAF) or market **commerce + WhatsApp bot** while the native shop icon catches up.

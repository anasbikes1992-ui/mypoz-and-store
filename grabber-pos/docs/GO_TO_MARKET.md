# MyPoz — go-to-market plan

**Status:** Soft-launch **CONDITIONALLY READY** (2026-08-23). Engineering gates green;
operator must confirm **A-OP-01** Auth URLs. See [LAUNCH_STATUS.md](LAUNCH_STATUS.md).  
**Live host only:** https://mypoz-and-store-ui.vercel.app  
**Do not** send launch traffic to `mypoz-and-store`.

Architecture reference: [ARCHITECTURE_MAP.md](ARCHITECTURE_MAP.md) ·
[API_SURFACE.md](API_SURFACE.md) · [SECURITY_AND_AUTH.md](SECURITY_AND_AUTH.md) ·
[DATABASE_MAP.md](DATABASE_MAP.md).

---

## Verdict

| Layer | Score | Note |
|-------|------:|------|
| POS | 9/10 | Billing engine + retail/wholesale + Wave 1–4 verticals |
| Storefront | 8.5/10 | Anaz live; COD workflows; no live card APIs by design |
| HQ + licensing | 8.5/10 | Fleet + tiers + extras incl. `knowledge` |
| Ops / smoke | 8.5/10 | `npm run ops:gate` AUTOMATED_PASS; A-OP-01 operator |
| Security | 8/10 | RLS + `0023` anon RPC revoke; Auth URLs / PITR to confirm |
| Docs | 9/10 | Launch status + gate + playbooks aligned |
| Jarvis | 8/10 | Persona + KB + Business+ shop knowledge |

**Overall ~8.5/10** — Phase A–C soft-launch gates cleared for controlled selling after A-OP-01.

---

## Already done (do not re-plan)

- One codebase + Supabase `veavfkjgtkbnggukzjds` + host **mypoz-and-store-ui**
- Migrations through `0023` (RLS remediations, wholesale tiers, launch hardening)
- Anaz: **1518** products, published `/store/anaz-store`, plan **business**
- HQ `mypoz-hq` + tenant owner provision path + pilot-2
- Product-gap **P1 closed**; FEATURE-PLAN P0–P4 / storefront P6b shipped
- Verticals Wave 1–4 hardened
- Jarvis persona + platform KB + shop knowledge (`/knowledge`)
- License-gated launcher/nav; login show-password + forgot/reset (`/update-password`)

---

## What you sell (plans)

| Tier | LKR/mo | Unlocks |
|------|-------:|---------|
| **Starter** | 4,500 | Core POS + catalogue + inventory + full commerce suite + register |
| **Business** | 9,500 | All non-vertical modules + **custom Jarvis knowledge base**; verticals via HQ **extras** |
| **Enterprise** | 18,500 | Everything |

**Extras:** `restaurant` → KDS + tables; `delivery` → drivers; `knowledge` → shop KB on Starter; `whatsapp` → Cloud API attach.  
`whatsapp` is not implied by Starter alone.

Source: `src/lib/plans.ts`, `src/lib/billing.ts`, `src/lib/hq-config.ts`.

---

## Phase A — Anaz soft launch

1. Production URL = **mypoz-and-store-ui** — **done**
2. WhatsApp env + Anaz phone attach — **done**
3. Webhook + Graph send — **passing**
4. Catalog / storefront / health / WA smoke — **PASS** (1518 products)
5. COD + delivery board — **done** (confirm mobile once)
6. Auth Site URL allowlist — **A-OP-01 operator confirm**
7. WhatsApp `hi` → menu — **PASS (DB)**
8. Meta catalog sync — **done**
9. Shop knowledge `/knowledge` — **shipped** (Anaz = business)

Auth URL config and merchant smokes: [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) · [RELEASE_GATE.md](RELEASE_GATE.md).

---

## Phase B — Harden while soft-live

| Item | Status |
|------|--------|
| Scrub provisioning secrets from Vercel | **done** |
| App WAF + rate limit | **shipped** — Cloudflare when DNS ready |
| Meta catalog feed | **done** for Anaz |
| CI on `grabber-pos/**` | **done** |
| Launch RLS hardening (`0023`) | **done** |
| PITR | **manual** when budget allows |
| Cloudflare proxy | **manual** when DNS ready |

---

## Phase C — Open market (new tenants)

Sales one-pager, HQ onboard dry-run, pilot-2, and Business upsell for shop knowledge are documented. Cross-tenant leak = stop-the-line ([GMS-OPERATIONS.md](GMS-OPERATIONS.md)).

---

## Phase D — Later (not launch blockers)

- Live PayHere / PickMe / Uber APIs
- Full courier ledger / HQ multi-tenant order search
- PDF/DOC upload + embeddings for shop KB
- Live Jarvis metrics for open tables / deliveries / overdue HP
- WA approved message templates
- Delete unused `mypoz-and-store` Vercel project (explicit OK only)

---

## Suggested next action

1. Confirm Supabase Auth Site URL → reply `A-OP-01: PASS`.
2. Run Anaz smokes (COD + knowledge harvest).
3. Market commerce + WhatsApp + Business Jarvis knowledge on allowlisted numbers.

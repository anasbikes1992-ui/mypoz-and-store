# 11 — Real client pilot

**Status:** COD SOFT-LAUNCH READY (Anaz) — 2026-08-27  
**Rule:** One real business on the frozen foundation. Temporary credentials → forced password reset when onboarding new staff.  
**Email/WebXPay:** still **LAST** (`12`) — do not block COD soft-launch.  
**Excluded for now:** PayHere · courier APIs.

## Chosen client: Anaz Store

| Field | Value |
|-------|--------|
| Name | Anaz Store |
| Slug | `anaz-store` |
| Org id | `304adc33-7279-4547-a73d-a2240333e814` |
| Owner login | `anazazeez1992@gmail.com` |
| Plan | Business |
| Catalogue | **1518** products (POS = storefront) |
| Storefront | `/store/anaz-store` |
| Jarvis | Orders & COD + Storefront + Retail; Approvals for drafts |
| Knowledge | Seeded COD + storefront policy articles |

## Pilot checklist

| # | Check | Status |
|---|--------|--------|
| 1 | Login as Anaz owner | ✅ |
| 2 | POS + catalogue truth | ✅ 1518 |
| 3 | COD / online orders path | ✅ `/commerce/orders` |
| 4 | Storefront live | ✅ `/store/anaz-store` |
| 5 | Knowledge + Approvals | ✅ |
| 6 | Jarvis agents | ✅ `/assistant` |
| 7 | Phase A hardening | ✅ `docs/work/13` |
| 7b | Order via WhatsApp cart CTA | ✅ cart drawer + `/cart` + checkout (primary when WA number set) |
| 8 | WhatsApp Meta Live | ⏸ optional for COD soft-launch |
| 9 | Forced password reset for new staff | ⏸ when adding users (Change password works) |
| 10 | Branded email + WebXPay | ⏸ LAST (`12`) |
| 11 | Promote `f87e227` to Vercel Production | ✅ promoted (`dpl_HuaMJRB…`, SHA `f87e227`) — confirm READY in dashboard |

## COD soft-launch waiver

Anaz is cleared for **COD-only** merchant traffic without cards, PayHere, or courier automation.  
**Order via WhatsApp** is the preferred high-conversion path when the shop WhatsApp number is configured (Website settings / store social).  
CLIENT READY (COD) may be marked when operator confirms a live Anaz COD week; cards remain LAST.

## Operator notes

- Work **as Anaz** — do not mix Pilot 02 data into Anaz decisions.
- HQ monitors via `/hq` / Jarvis `hq-ops` (`nameHint: Anaz`).
- Rooms / Hire / Repair / Rent are quarantined from the launcher (`13`).

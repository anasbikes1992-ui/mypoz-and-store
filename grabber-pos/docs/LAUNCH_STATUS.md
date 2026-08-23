# MyPoz soft-launch status

**As of:** 2026-08-23  
**Commit baseline:** `a4e16c1` (+ docs/hardening follow-ups)  
**Live host:** https://mypoz-and-store-ui.vercel.app  
**DB:** Supabase `veavfkjgtkbnggukzjds`  

This is the single “what’s left” page. Detail lives in [RELEASE_GATE.md](RELEASE_GATE.md) and [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md).

---

## Engineering: DONE

| Area | Status |
|------|--------|
| Product P1 gaps / FEATURE-PLAN P0–P4 | Closed |
| Verticals Wave 1–4 (wholesale, rooms, repair, restaurant seat, delivery, HP, play, reloads, alerts) | Shipped |
| Ops gate `npm run ops:gate` | Automated PASS (health, WA smoke, catalog 1518) |
| Migrations through `0022` wholesale + `0023` launch RLS hardening | On remote |
| WhatsApp webhook + Anaz attach + DB `hi` → menu | Working |
| Jarvis persona + platform KB + `list_verticals` | Shipped |
| **Shop knowledge** (`/knowledge`) Business+ / HQ extra `knowledge` | Shipped — Anaz plan = **business** |
| CI (`tsc` + vitest) | On `grabber-pos/**` |
| HQ onboard + pilot-2 | Done |

---

## Operator: remaining for READY (you must click)

| ID | Action | Blocks READY? |
|----|--------|---------------|
| **A-OP-01** | Confirm Supabase Auth **Site URL** + redirects (see RELEASE_GATE) and reply `A-OP-01: PASS` | Yes — agent cannot see dashboard |
| Manager PIN | Set non-default PIN on live tenants | Soft — security checklist |
| PITR | Enable Supabase PITR when budget allows | No — Phase B deferral |
| Cloudflare | Proxy DNS when ready | No — Phase B deferral |
| WA templates | Wait Meta **Approved** | No — deferred |
| Vercel Hobby | Prefer Git auto-deploy; CLI can hit 12-function cap | No if Git deploy Ready |

---

## Soft-launch smoke (owner / GMS)

1. `npm run ops:gate` → AUTOMATED_PASS  
2. `/store/anaz-store` → one COD courier → Delivery board → settle (stock once)  
3. Phone-width cart checkout  
4. Allowlisted WhatsApp `hi` → menu → `/whatsapp` inbox reply  
5. Business owner: `/knowledge` → Collect from organisation → ask Jarvis a shop FAQ  

---

## Explicit post-launch backlog (not blockers)

- Live PayHere / PickMe / Uber APIs  
- PDF/DOC upload → KB (today: harvest + manual articles)  
- Vector/RAG embeddings for shop KB  
- Live vertical metric tools in Jarvis (open tables / deliveries / overdue HP)  
- CRM mass-send · HQ multi-tenant order search · delete unused `mypoz-and-store` Vercel project  

---

## Verdict

**CONDITIONALLY READY** for controlled Anaz selling once **A-OP-01** is confirmed.  
Core commerce, WhatsApp path, verticals, and Business+ shop knowledge are in production code.

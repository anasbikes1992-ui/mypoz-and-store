# CLIENT_READINESS_REPORT — MyPoz / Grabber POS

**Path:** `D:\MyPoz` (product in `grabber-pos/` + `grabber-pos-mobile/`)  
**Role:** Grabber POS Studio — multi-vertical POS for shops  
**Stack:** Next.js 16 · React 19 · Flutter · Supabase (own migrations) · demo JSON fallback  
**Audited:** 2 Aug 2026  
**Priority:** P3 — after Jarvis pilots; parallel-capable with Pearl harden  
**Related:** `grabber-pos/docs/PRODUCT-GAP.md` · `PRODUCTION.md` · `CREDENTIALS.md`

---

## Verdict

**Widest POS feature surface** in the Grabber family and the correct POS to ship (prefer over monorepo `apps/pos`). **Pilot-possible with provisos** — not “zero-failure production” until org/tenant bugs are fixed, production checklist executed, thin modes kept out of the sales pitch, and paid features (if any) use proven payment rails.

MyPoz stays **standalone** (ADR-007); not forced onto `grabber-shared` until wiring is intentional.

---

## What is built (complete enough)

| Area | Status |
|------|--------|
| Web POS terminal + back-office modules | Broad (products, stock, GRN, sales, restaurant, etc.) |
| Flutter companion | Present (offline-oriented) |
| Supabase migrations + RPCs (e.g. `create_sale`) | In-repo under `grabber-pos/supabase/` |
| Demo mode (no backend) | JSON store — good for demos, dangerous if sold as prod |
| Ops docs | Strong: FEATURE-PLAN, PRODUCT-GAP, USER/RESELLER/GMS, DEPLOYMENT, PRODUCTION |
| Pearl product code | None (shared payments AppKey may list `pearlhub` only) |

---

## Gaps

| Gap | Severity |
|-----|----------|
| `org_id` bug noted in shared STATUS (migrations) | High |
| Not on shared Pearl Supabase project | Medium (by design) |
| Thin modes: repair / rooms / rent / digital (per PRODUCT-GAP history) | Medium — sales risk |
| Checkout not wired to `grabber-shared` payments | Medium until paid storefront sold |
| Dual demo vs prod — silent JSON if env missing | High if misconfigured in “prod” |
| Monorepo `apps/pos` still exists (archive) — confusion | Medium |

---

## What can improve

- Execute existing `docs/PRODUCTION.md` + `CREDENTIALS.md` rather than rewriting process.
- Quarantine thin verticals from marketing until PRODUCT-GAP marks them ready.
- When charging for storefront/subscriptions, vendor shared payments client.
- Keep Flutter and web on the same Supabase project; never demo monorepo POS.

---

## Client-readiness scorecard

| Criterion | Pass? |
|-----------|-------|
| Feature breadth for a shop pilot | Yes (core retail) |
| Multi-tenant safety proven | Needs org_id / RLS verification |
| Prod deploy checklist done | Owner must execute |
| Safe without demo fallback in prod | Must enforce env |
| Ready for shop clients | **After** launch plan P0–P3 |

See root [README.md](README.md) and [grabber-pos/docs/](grabber-pos/docs/).

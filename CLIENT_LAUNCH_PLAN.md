# CLIENT_LAUNCH_PLAN — MyPoz / Grabber POS

**Priority:** P3 — begin after Jarvis consultant pilots are stable (can overlap Pearl P1–P2)  
**Paths:** `D:\MyPoz\grabber-pos` · `D:\MyPoz\grabber-pos-mobile`  
**Do not ship from:** `D:\Grabber-Business-OS\apps\pos` or `D:\Jarvis & Pos\apps\pos`

---

## P0 — Fix known data/tenant defects

- [ ] Reproduce and fix `org_id` / migration issues called out in `D:\grabber-shared\docs\STATUS.md`.
- [ ] Verify RLS: org A cannot read org B (web + Flutter).
- [ ] Confirm `create_sale` (or equivalent) is the only write path for sales in prod mode.

**Exit:** Written proof of cross-tenant isolation test.

---

## P1 — Execute existing production docs (don’t rewrite)

- [ ] Walk `grabber-pos/docs/PRODUCTION.md` checklist end-to-end.
- [ ] Fill secrets per `grabber-pos/docs/CREDENTIALS.md` (status only in git).
- [ ] Deploy web (Vercel or chosen host) with **required** Supabase env — fail hard if missing (no silent JSON “prod”).
- [ ] Apply Supabase migrations to the POS project; backup before apply.

**Exit:** Staging shop URL uses real DB only.

---

## P2 — Sales-pitch quarantine

Do **not** sell as production-ready until PRODUCT-GAP says so:

- [ ] Repair  
- [ ] Rooms / rent  
- [ ] Other modes marked thin in `PRODUCT-GAP.md`

**Exit:** Sales one-pager lists only verified modes (e.g. retail / restaurant as applicable).

---

## P3 — Payments (when needed)

- [ ] If charging for storefront, subscriptions, or licensing: wire to `grabber-shared` `create-checkout` / `payments-webhook` via sync script.
- [ ] Sandbox E2E before production keys.
- [ ] If POS keeps its own billing, document why and keep signature verification fail-closed.

**Exit:** Money path named and proven, or explicitly “no in-app payments yet.”

---

## P4 — Pilot shops (1–2)

- [ ] Onboard one friendly shop on staging → promote to prod.
- [ ] Train on USER-GUIDE; define support contact.
- [ ] Daily backup confirmation for first week.
- [ ] Second shop only after one week without data-loss or auth incidents.

**Exit:** Two successful pilot weeks → open limited reseller path (see RESELLER-GUIDE).

---

## Demo rules

- Demo `D:\MyPoz\grabber-pos` only.  
- If running demo/JSON mode, say “demo — not your live stock.”  
- Never present monorepo POS as the product.

---

## References

- [CLIENT_READINESS_REPORT.md](CLIENT_READINESS_REPORT.md)  
- [grabber-pos/docs/PRODUCTION.md](grabber-pos/docs/PRODUCTION.md)  
- [grabber-pos/docs/PRODUCT-GAP.md](grabber-pos/docs/PRODUCT-GAP.md)  
- [D:\grabber-shared\docs\ECOSYSTEM_AUDIT_2026-08-02.md](D:\grabber-shared\docs\ECOSYSTEM_AUDIT_2026-08-02.md)  

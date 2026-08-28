# MyPoz soft-launch status

**As of:** 2026-08-28  
**Branch:** `production-hardening` / `business-os-cod-first` @ `697ed0a`  
**Live host:** https://mypoz-and-store-ui.vercel.app  
**DB:** Supabase `veavfkjgtkbnggukzjds`

Detail: [RELEASE_GATE.md](RELEASE_GATE.md) · [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) · [work/LAUNCH_READINESS.md](work/LAUNCH_READINESS.md) · [P1_CLOSURE_PROGRESS.md](P1_CLOSURE_PROGRESS.md)

---

## Current truth

| Area | Status |
|------|--------|
| Gates 2A / 2B / 3 / Phase 2 | ✅ |
| Gate 4 commerce (auto) | ✅ PASS WITH P1 — WebXPay RSA deferred (`442`) |
| Gate 5 DR + logical export | ✅ export 2026-08-26; restore drill still operator |
| Revision 2 phases A–M (code) | ✅ `697ed0a` — customer profile, branding, DLQ, dashboard |
| Anaz trusted rebuild | ✅ **1518** products, published `/store/anaz-store` |
| Ops gate catalog | ✅ `total=1518` · verdict `AUTOMATED_PASS` (2026-08-28) |
| Vitest | ✅ **241/241** pass |
| **COD courier smoke** | ✅ receipt `GPS-MAIN-20260826-0001` · board `DEL-7A6C74A9` |
| Card / WebXPay | ⏸ capturePay `442` deferred |

Do **not** restore `data/backups/mypoz-full-2026-08-24.json`.

---

## Operator: remaining for READY

| ID | Action | Blocks READY? |
|----|--------|---------------|
| **A-OP-03** | Post-deploy: POS → Invoice PDF → optional WA | Soft — regression |
| **A-OP-04** | Mobile-width COD checkout | Soft |
| **B-OP-01** | Manager PIN on `/permissions` | Soft — returns/override |
| **B-OP-02** | Transfer dispatch/receive smoke | Soft |
| **D-OP-01** | Customer profile (mobile match) smoke | Soft |
| G5-P1-2/3/4 | PITR note + restore drill + off-site export | CLIENT READY at scale |
| WebXPay 442 | Merchant/MID / support | Card path only |

---

## Soft-launch smoke

1. ✅ Catalog ≈ 1518; `/store/anaz-store` loads  
2. ✅ One **COD courier** → Delivery board (`DEL-7A6C74A9`)  
3. ⏳ Phone-width cart — owner check  
4. ✅ WhatsApp ops gate (automated); live `hi` on allowlist — merchant check  
5. ⏳ POS cash + invoice PDF post-`697ed0a` deploy  

---

## Verdict

**READY for Anaz soft launch** (POS + COD storefront + WA bot on allowlisted numbers).  
Card payments deferred on WebXPay 442. Scale **CLIENT READY** still needs Gate 5 restore drill + second pilot tenant.

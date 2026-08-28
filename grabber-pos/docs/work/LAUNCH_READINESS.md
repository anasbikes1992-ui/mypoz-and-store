# Launch readiness — Revision 2 (2026-08-28)

**Commit:** `697ed0a` · **Branches:** `business-os-cod-first`, `production-hardening`  
**Host:** https://mypoz-and-store-ui.vercel.app  
**Pilot:** Anaz Store (`anaz-store`, 1518 SKUs)

## Verdict

| Audience | Ready? | Notes |
|----------|--------|-------|
| **Anaz COD + POS + WA bot** | **YES (conditional)** | Code + automated gate PASS; operator smokes below |
| **Card / WebXPay live** | **NO** | WebXPay `442` deferred — sell COD/bank |
| **Multi-tenant GTM** | **SOFT** | Second pilot + HQ dry-run before ads |
| **Offline POS prod** | **NO** | Flag off (`NEXT_PUBLIC_ALLOW_OFFLINE_POS`) |
| **Lending / take-rate** | **N/A** | Phase M deferred by design |

**Bottom line:** Safe to **soft-launch Anaz** for in-store POS, online COD, and WhatsApp bot on allowlisted numbers. Not ready for card-first GTM or scale certification without Gate 5 restore drill.

---

## Automated evidence (2026-08-28)

| Check | Result |
|-------|--------|
| `node scripts/release-gate-ops.mjs` | **AUTOMATED_PASS** (8/8) |
| Vitest | **241/241** pass |
| `tsc --noEmit` | green |
| Storefront catalog | **1518** products |
| COD smoke (prior) | `GPS-MAIN-20260826-0001` · `DEL-7A6C74A9` |
| Phase A gate doc | PASS |
| Phases B–M (code) | Shipped `697ed0a` |

---

## Operator smokes still open

These are **not** code blockers but **launch evidence** gaps:

| ID | Action | Blocks |
|----|--------|--------|
| **B-OP-01** | Manager PIN set on `/permissions` | Returns / discount override audit |
| **B-OP-02** | Transfer create → Dispatch → Receive | Inter-branch stock proof |
| **D-OP-01** | Customer profile with matching mobile | Phase D evidence |
| **C-OP-01** | Product share + Business footer (no Powered by) | Phase C visual |
| **A-OP-03** | Post-deploy POS → Invoice PDF → WA send | Invoice regression |
| **A-OP-04** | Mobile-width COD checkout | LAUNCH_CHECKLIST §3 |
| **G5-P1** | PITR note + restore drill + off-site export | CLIENT READY at scale |
| **WebXPay** | Merchant MID / RSA promotion | Card path only |

---

## Test / CI caveats

- No GitHub Actions in `grabber-pos` — rely on Vercel build + local `vitest` / `tsc`.
- Windows path `MyPoz & Store` breaks `npm` scripts — use `node node_modules/vitest/vitest.mjs` and `node node_modules/typescript/bin/tsc`.
- `payments/status` is intentionally unauthenticated (staging probe) — documented in auth census.

---

## Deferred (do not block launch)

- WebXPay live cards
- Offline POS in production
- WA approved templates (24h window only)
- Rooms / rent / hire verticals (still `soon`)
- Payment take-rate engineering
- Merchant lending (Phase M)

---

## References

- [LAUNCH_STATUS.md](../LAUNCH_STATUS.md) — operator table
- [LAUNCH_CHECKLIST.md](../LAUNCH_CHECKLIST.md) — Anaz step-by-step
- [PHASE0_COMMERCIALIZATION_BASELINE.md](PHASE0_COMMERCIALIZATION_BASELINE.md) — feature map
- [RELEASE_GATE.md](../RELEASE_GATE.md) — gate history

# MYPOZ — FINAL PRODUCTION HARDENING, DATABASE RECONCILIATION & CERTIFICATION PLAN

Version: 1.0  
Date: 2026-08-25  
Companion: `docs/MYPOZ_FINAL_DURABLE_ARCHITECTURE_AND_MIGRATION_PLAN.md`  
Freeze: branch `production-hardening` · tag `mypoz-pre-final-hardening`

---

## ROLE

Combined CEO / CTO / Principal Architect / DB / Security / Payments / SRE / Next.js / Supabase / QA.

This is **not** feature expansion. Objective: one authoritative implementation per production feature; Postgres as SoT; tenant isolation; idempotent payments; transactional inventory; correct returns/refunds; trustworthy reporting; immutable audit; restorable backups; zero production JSON fallbacks; offline deferred or disabled; legacy removed only after certification.

---

## CURRENT CERTIFICATION

| Gate | Status |
|------|--------|
| 2A Database replay | PASS |
| 3 Security 79/79 | PASS (commit `530b65b`) |
| 2B Completeness | PASS WITH P0/P1 REMEDIATION |
| 4 Commerce | BLOCKED — do not run yet |
| 5 Backup/DR | NOT STARTED |

### Immediate P0 order (do not reorder)

1. Audit → one DB ledger (`audit_events`)
2. Payment domain → make payments/events authoritative
3. POS card lifecycle (pending → paid → stock once)
4. Inventory ledger consistency (movement reasons / refs)
5. Reporting server-side correctness
6. Disable/defer fake offline POS
7. Remove production JSON/docStore paths **after** proof

---

## PRIMARY ARCHITECTURAL DECISION

**Supabase Postgres is the source of truth.**

Production MUST NOT depend on JSON files, localStorage, in-memory Maps, demo documents, or `app_documents`/`app_collections` for **core transactional** entities (sales, payments, inventory, returns, refunds, POs, transfers, stocktakes, registers/shifts, audit).

Browser state allowed only for temporary UI (e.g. cart before checkout).

---

## EXECUTION ORDER (EXACT)

1. Freeze ✅  
2. Inventory ✅ Phase 1  
3. Database/domain matrix ✅ Phase 1  
4. Audit consolidation  
5. Payment architecture  
6. POS card flow  
7. Inventory consistency  
8. Returns/refunds hardening  
9. PO  
10. Stocktake  
11. Transfers  
12. Reporting  
13. Discounts atomicity  
14. Rate limiting (distributed)  
15. Auth census cleanup  
16. Offline disable/defer  
17. Performance  
18. Constraints  
19. Migration replay (0027+)  
20. Test suite expansion  
21. Backup/restore  
22. Production deploy  
23. Security re-gate (must not regress Gate 3)  
24. Commerce Gate 4  
25. Legacy deletion  
26. Final certification  

At every step: inspect → propose → implement → migrate → test → verify → document → continue.

---

## PHASE DETAIL (CONDENSED)

### Phase 0 — Freeze

- Branch `production-hardening`
- Tag `mypoz-pre-final-hardening`
- No unrelated features; no premature deletes

### Phase 1 — Discovery (THIS PHASE)

Docs only. See:

- `FINAL_ARCHITECTURE_INVENTORY.md`
- `DATABASE_DOMAIN_MATRIX.md`
- `DATABASE_FINAL_MODEL.md`
- `RLS_MATRIX.md`
- `AUDIT_ARCHITECTURE.md`
- `PAYMENT_STATE_MACHINE.md`
- `SERVICE_ROLE_AUDIT.md`
- `LEGACY_REMOVAL_PLAN.md`
- `PHASE1_DISCOVERY_STATUS.md`

### Phase 2+ — Implementation

Forward migrations only. Canonical services:

`sales-service`, `payment-service`, `inventory-service`, `returns-service`, `refund-service`, `transfer-service`, `stocktake-service`, `purchase-order-service`, `audit-service`, `reporting-service`, `billing-service`

API pattern: auth → authorization → validation → domain service → response.

### Offline

**DEFERRED.** Disable production offline enqueue / label unsupported until IndexedDB sync architecture exists.

### Rate limiting

Replace in-memory `rate-limit.ts` Map with distributed store (e.g. Upstash Redis) before scale.

### Backup

Do **not** trust `data/backups/mypoz-full-2026-08-24.json`. Real Postgres backup + restore certification required for Gate 5.

### Catalog

Do **not** restore damaged Aug-24 JSON. Find authoritative source after durable architecture certified.

---

## FINAL CERTIFICATION GATES

| Gate | Requirement |
|------|-------------|
| 2A | Empty replay PASS |
| 2B | No unresolved P0 |
| 3 | Zero critical/high security failures |
| 4 | POS cash/card, void, return, refund, stock, stocktake, transfer, PO, webhook, discount, concurrency, storefront |
| 5 | Real backup restore |
| Final | Monitoring, env validation, deploy, rollback, onboarding |

Definition of done: not “tsc passes” — every critical op proven through UI→API→auth→service→DB→RLS→txn→audit→test→backup→restore→production.

---

## FINAL EXECUTIVE PRINCIPLE

Optimize for: CORRECTNESS, SECURITY, DATA INTEGRITY, TENANT ISOLATION, PAYMENT SAFETY, INVENTORY ACCURACY, OBSERVABILITY, RECOVERABILITY, SIMPLICITY — before new features.

Target end state:

```text
ONE DATABASE
ONE SOURCE OF TRUTH PER DOMAIN
ONE AUTHORIZATION MODEL
ONE AUDIT LEDGER
ONE PAYMENT STATE MACHINE
ONE INVENTORY LEDGER
ONE REPORTING CONTRACT
ONE MIGRATION HISTORY (0001→latest)
ZERO PRODUCTION JSON FALLBACKS
ZERO CRITICAL SECURITY FINDINGS
ZERO UNTESTED FINANCIAL FLOWS
```

**END**

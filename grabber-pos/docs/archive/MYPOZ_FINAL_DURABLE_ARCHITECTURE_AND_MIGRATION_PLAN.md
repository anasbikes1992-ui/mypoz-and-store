# MYPOZ — FINAL DURABLE ARCHITECTURE, DATABASE & MIGRATION EXECUTION PLAN

Version: 1.0  
Date: 2026-08-25  
Role: CEO + CTO Production Certification  
Product: MyPoz Commerce Cloud  
Platform: Next.js + Supabase/PostgreSQL + Vercel  
Current migration range: **0001 → 0026** (immutable history)  
Freeze: branch `production-hardening`, tag `mypoz-pre-final-hardening`  
Repo HEAD at freeze: `ff4c45e` (includes production deploy commit `530b65b` + Gate 3 cert docs)

---

# 0. MISSION

Transform MyPoz into a professionally structured, production-grade, multi-tenant commerce platform.

**NOT** the objective: add features, restore catalog, rewrite UI, delete historical migrations.

**IS** the objective: database-first, durable, multi-tenant safe, transactionally correct, payment-safe, inventory-safe, auditable, recoverable, testable, deployable, maintainable.

Every business domain must have **one** authoritative source of truth.  
No UI may appear operational while using unreliable local JSON/document fallbacks for production business data.

---

# 1. CURRENT CERTIFICATION STATUS

| Gate | Status | Evidence |
|------|--------|----------|
| Gate 2A — migration replay | **PASS** | `docs/GATE2A_MIGRATION_REPLAY_CERTIFICATION.md` |
| Gate 3 — security | **PASS 79/79** | `docs/GATE3_SECURITY_CERTIFICATION_FINAL.md`, commit `530b65b` |
| Gate 2B — code↔DB completeness | **PASS WITH P0/P1 REMEDIATION** | `docs/GATE2B_DATABASE_CODE_COMPLETENESS_CERTIFICATION.md` |
| Gate 4 — commerce | **BLOCKED** | Do not start until P0 closed |
| Gate 5 — operations/DR | **NOT STARTED** | |

Live schema (re-verified 2026-08-25): 37 tables, 1 view (`reseller_licences`), 38 policies, 79 FKs, 85 indexes, 7 triggers, 62 public functions, 27 migrations, latest `0026_register_shift_summaries`.

---

# 2. GATE 2B P0 / P1 (MUST CLOSE)

## P0

1. Audit system split (`audit_events` SQL vs `app_collections` audit docs)
2. Durable POS rejects pending card sales (`SupabaseRepository.createSale`)
3. Reporting incomplete (Node aggregation; sales list limit 200; no COGS/margin/tax)
4. Offline localStorage queue is not production-safe

## P1

5. Dual JSON/`docStore`/`recordStore` fallbacks remain
6. Gateway payments outside canonical `payments` model (`app_collections` `gateway-payments`)
7. Backup/export paths need professionalization

---

# 3. NON-NEGOTIABLE ARCHITECTURE

```text
UI → API → Authentication → Authorization → Domain Service → Repository/RPC
  → PostgreSQL → RLS / Constraints / Transactions → Audit
```

**Forbidden for production business data:**

```text
UI → JSON file
UI → docStore → local JSON
DB unavailable → silent local JSON
```

Local JSON allowed only for: tests, fixtures, explicit `POS_ALLOW_DEMO=true`, migration tooling, local-only utilities.

Production DB unavailable → **503 Dependency Unavailable**, never silent fallback.

---

# 4. SOURCE-OF-TRUTH POLICY

| Domain | Source of Truth |
|--------|-----------------|
| Organizations, profiles, branches, stock, sales, sale_lines | PostgreSQL |
| Payments (canonical) | PostgreSQL (target: intents/attempts/events + payments) |
| Returns, refunds, POs, transfers, stocktakes, registers, shifts | PostgreSQL |
| Audit | PostgreSQL `audit_events` only |
| Reporting | PostgreSQL views/functions/aggregation |
| Licences (current) | `app_documents` key `tenant` + view `reseller_licences` → migrate to SQL licences later |
| Vertical modules (restaurant, HP, layaway, …) | Currently `app_collections` — classify DOCUMENT vs MUST REPLACE |
| Platform settings | PostgreSQL `platform_settings` |
| Auth | Supabase Auth |

---

# 5. PHASE ORDER (MANDATORY)

| Phase | Name | Modify code? | Output |
|-------|------|--------------|--------|
| **0** | Freeze | No (branch/tag only) | `production-hardening`, `mypoz-pre-final-hardening` |
| **1** | Discovery | Docs only | Inventory, matrices, maps |
| **2** | Database foundation | Forward migrations **0027+** only | Audit, payment, reporting, inventory invariants |
| **3** | Domain services | Yes | Canonical services |
| **4** | API cleanup | Yes | Explicit auth on every route |
| **5** | UI rewire | Minimal | Canonical APIs only |
| **6** | Remove legacy | Yes, after proof | Delete dual paths |
| Gate 4 | Commerce E2E + concurrency | Tests | `GATE4_COMMERCE_CERTIFICATION.md` |
| Gate 5 | Backup/DR | Ops | Restore proof |
| Final | Certification | — | `FINAL_PRODUCTION_CERTIFICATION.md` |

**Do not reverse:** SECURITY → DATA INTEGRITY → PAYMENT → INVENTORY → AUDIT → RECOVERY → PERFORMANCE → UX → NEW FEATURES.

---

# 6. MIGRATION RULES

- **Never rewrite or delete** migrations `0001`–`0026`.
- All new schema via **forward-only** `0027+`.
- Example sequence (adjust after Phase 1 gap analysis):

```text
0027_audit_unification.sql
0028_payment_domain.sql
0029_pos_payment_state_machine.sql
0030_reporting_domain.sql
0031_inventory_hardening.sql
0032_remove_legacy_business_documents.sql   # schema only if needed; code removal later
0033_backup_and_recovery.sql                # if DB objects required
```

Each migration release must pass: empty replay, incremental apply, app start, tsc, unit, integration, RLS/security.

---

# 7. DOMAIN REQUIREMENTS (SUMMARY)

Full detail in companion docs produced in Phase 1+.

| Topic | Rule |
|-------|------|
| Audit | Single ledger `audit_events`; append-only; no client actor trust |
| Payments | Intent → attempt → event (unique provider+event_id) → payment → sale; idempotent webhooks |
| Card POS | PENDING_PAYMENT without stock decrement; stock on PAID only |
| Inventory | Ledger `stock_movements` + `branch_stock`; no arbitrary UI stock writes |
| Stocktake / transfer / returns | Durable tables already exist — harden reasons, idempotency, state machines |
| Receipts | `receipt_counters` only; never `count(*)+1` |
| Discounts | Atomic usage increment |
| Reporting | Server SQL aggregation; no 200-row browser math |
| Offline | **DEFERRED** — disable or label unsupported in production |
| AuthZ | Explicit `requireTenantSession` / role / permission; not proxy-only |
| Service role | Documented per call; minimize |
| Secrets | Never in git/docs/client; names-only `.env.example` |

---

# 8. DOCUMENTATION SET (TARGET)

See also `docs/MYPOZ_FINAL_PRODUCTION_HARDENING_AND_DATABASE_RECONCILIATION.md`.

Phase 1 produces:

- `FINAL_ARCHITECTURE_INVENTORY.md`
- `DATABASE_FINAL_MODEL.md`
- `DATABASE_DOMAIN_MATRIX.md`
- `RLS_MATRIX.md`
- `AUDIT_ARCHITECTURE.md`
- `PAYMENT_STATE_MACHINE.md`
- `SERVICE_ROLE_AUDIT.md`
- `LEGACY_REMOVAL_PLAN.md`
- `PHASE1_DISCOVERY_STATUS.md`

Later phases produce remaining contracts (API, reporting, backup DR, Gate 4/5, final cert).

---

# 9. AGENT RULES

1. Do not guess — inspect repo, migrations, live schema.
2. Do not create duplicate tables/services.
3. Do not restore damaged Aug-24 JSON backup.
4. Do not start Gate 4 until P0 closed and documented.
5. Do not delete legacy until replacement proven.
6. Do not add product features during hardening.
7. Preserve Gate 3 security guarantees.
8. Prefer PostgreSQL transactions over app-level coordination.
9. Mark UNVERIFIED when evidence is incomplete.
10. After each phase: Changed / Database / Removed / Tests / Verification / Risks / Gate status / Next phase.

---

# 10. FINAL CEO/CTO DECISION

Treat MyPoz as a **real multi-tenant Commerce SaaS**, not a demo POS.

Priority:

```text
SECURITY → DATA INTEGRITY → PAYMENT CORRECTNESS → INVENTORY CORRECTNESS
→ AUDITABILITY → RECOVERY → PERFORMANCE → UX → NEW FEATURES
```

When complete: one database, one path per domain, zero production JSON fallbacks, certified gates 2A–5.

**END OF PLAN**

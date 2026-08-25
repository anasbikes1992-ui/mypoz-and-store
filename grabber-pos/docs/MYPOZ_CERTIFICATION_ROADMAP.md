# MyPoz Production Certification Roadmap (FINAL)

**Status date:** 2026-08-25  
**Stage:** Production certification + architecture cleanup — **not** feature expansion  
**Freeze:** branch `production-hardening` · tag `mypoz-pre-final-hardening`  
**Master plans:**  
- `docs/MYPOZ_FINAL_MASTER_PRODUCTION_BLUEPRINT.md` ← **authority**  
- `docs/MYPOZ_FINAL_DURABLE_ARCHITECTURE_AND_MIGRATION_PLAN.md`  
- `docs/MYPOZ_FINAL_PRODUCTION_HARDENING_AND_DATABASE_RECONCILIATION.md`

**Rule:** Do not restore catalog / Aug-24 JSON. Do not rewrite migrations 0001–0029 destructively. No aaPanel/Webuzo. No mass legacy delete until Gate 4 P1 + Gate 5 pass.

---

## Current gate board

| Gate / Phase | Name | Status |
|--------------|------|--------|
| 1 | Initial DB reconstruction | ✅ PASS |
| 2A | Clean migration replay `0001→0026` | ✅ PASS |
| 2B | Code ↔ DB completeness | ✅ PASS WITH P0/P1 REMEDIATION |
| 3 | Security (deployed `530b65b`) | ✅ PASS 79/79 |
| **Phase 0** | Freeze branch/tag | ✅ DONE |
| **Phase 1** | Architecture inventory + matrices | ✅ DONE — see `PHASE1_DISCOVERY_STATUS.md` |
| **Phase 2** | Durability + reconciliation (audit/payments/POS pending/inventory/reporting/offline) | ✅ **PASS WITH P1/P2** — see `PHASE2_DURABILITY_CERTIFICATION.md` |
| Phase 3–6 | Services polish, API, UI, legacy removal | 🔒 After Gate 4 proof |
| 4 | Commerce E2E + concurrency | 🔒 Next after deploy + go-ahead |
| 5 | Backup / restore / DR | ⏳ After Gate 4 |
| Final | Production certification | ⏳ Last |

---

## Authoritative sequence

```text
2A ✅ → 3 ✅ → 2B remediation (Phase 1 ✅ → Phase 2…) → Gate 4 → Gate 5 → catalog/clients → legacy delete
```

### Immediate P0 order (Phase 2)

1. Audit → one ledger (`audit_events`)  
2. Payment domain canonical + webhook idempotency  
3. POS card pending lifecycle  
4. Inventory movement consistency  
5. Reporting server-side  
6. Disable/defer offline POS  
7. Remove production JSON fallbacks **after** proof  

---

## Non-negotiables

- Postgres = production source of truth  
- `audit_events` = only audit truth (target)  
- Canonical payment/event model = only payment truth (target)  
- `stock_movements` + `branch_stock` = only inventory truth  
- DB down → 503, never silent JSON  
- Forward migrations only (`0027+`)  
- No feature work during hardening  

---

## Evidence index

| Doc | Role |
|-----|------|
| `GATE2A_MIGRATION_REPLAY_CERTIFICATION.md` | Replay PASS |
| `GATE2B_DATABASE_CODE_COMPLETENESS_CERTIFICATION.md` | Completeness gaps |
| `GATE3_SECURITY_CERTIFICATION_FINAL.md` | Security PASS |
| `FINAL_ARCHITECTURE_INVENTORY.md` | Classified inventory |
| `DATABASE_DOMAIN_MATRIX.md` | Domain matrix |
| `DATABASE_FINAL_MODEL.md` | Model AS-IS/target |
| `RLS_MATRIX.md` | RLS |
| `AUDIT_ARCHITECTURE.md` | Audit plan |
| `PAYMENT_STATE_MACHINE.md` | Payment plan |
| `SERVICE_ROLE_AUDIT.md` | Service role |
| `LEGACY_REMOVAL_PLAN.md` | Removal rules |
| `BACKUP_RESTORE_ANALYSIS.md` | Bad backup warning |
| `PHASE1_DISCOVERY_STATUS.md` | Phase 1 closeout |

---

## Definition of “ready for clients”

Not: tsc / vitest / Vercel green alone.  
Yes: Gates 2A, 2B (no open P0), 3, 4, 5 + final cert — then catalog from a **trusted** source and onboarding.

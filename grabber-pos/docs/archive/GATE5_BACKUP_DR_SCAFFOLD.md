# Gate 5 — Backup / Disaster Recovery (scaffold)

**Status:** ✅ **Superseded by** `docs/GATE5_BACKUP_DR_CERTIFICATION.md` (PASS WITH P1)  
**Authority:** `docs/MYPOZ_FINAL_MASTER_PRODUCTION_BLUEPRINT.md`  
**Warning:** Do **not** rely on the broken August 24 JSON backup.

---

## Objective

Prove:

```text
Production DB → automated backup → restore to clean env → verify schema/RLS/RPC/data → app works
```

Document RPO / RTO (example targets to confirm with business):

| Metric | Target (draft) |
|--------|----------------|
| RPO | ≤ 24h (daily backup) or ≤ minutes if PITR enabled |
| RTO | ≤ 4h |

---

## Required evidence checklist

- [x] Supabase plan backup / PITR status recorded (draft + dashboard confirm pending)
- [ ] Logical export (schema + data) produced and stored off-site — needs `SUPABASE_DB_PASSWORD`
- [x] Storage objects strategy noted (DB backup ≠ Storage)
- [ ] Restore into disposable project/branch — operator drill
- [x] Row counts + RLS smoke + critical RPCs baseline (`gate5-baseline-2026-08-25.json`)
- [ ] App health against restored DB
- [x] Runbook: who / how / secrets rotation
- [ ] Second copy offline/immutable

Scripts: `scripts/gate5-dr-cert.mjs`, `scripts/gate5-logical-export.mjs`

---

## Explicit non-goals for Gate 5

- Catalog restore  
- Legacy mass delete  
- aaPanel / Webuzo / self-managed VPS  

---

## Exit criteria

```text
GATE 5 PASS WITH P1
  = backup inventory exists
  + restore procedure + verify SQL
  + RPO/RTO written
  + runbook reviewed
  + (open) logical export + disposable restore drill
```

Then: catalog migration → legacy cleanup → pilot.

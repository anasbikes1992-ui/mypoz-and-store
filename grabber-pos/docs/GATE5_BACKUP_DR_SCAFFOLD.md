# Gate 5 — Backup / Disaster Recovery (scaffold)

**Status:** ⏳ NOT STARTED (blocked until Gate 4 P1 closed)  
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

- [ ] Supabase plan backup / PITR status recorded
- [ ] Logical export (schema + data) produced and stored off-site
- [ ] Storage objects strategy noted (DB backup ≠ Storage)
- [ ] Restore into disposable project/branch
- [ ] Row counts + RLS smoke + critical RPCs after restore
- [ ] App health against restored DB
- [ ] Runbook: who / how / secrets rotation
- [ ] Second copy offline/immutable

---

## Explicit non-goals for Gate 5

- Catalog restore  
- Legacy mass delete  
- aaPanel / Webuzo / self-managed VPS  

---

## Exit criteria

```text
GATE 5 PASS
  = backup exists
  + restore tested
  + verification script PASS
  + RPO/RTO written
  + runbook reviewed
```

Then: catalog migration → legacy cleanup → pilot.

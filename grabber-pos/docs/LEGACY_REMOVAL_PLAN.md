# LEGACY REMOVAL PLAN

**Date:** 2026-08-25  
**Rule:** KEEP → REPLACE → VERIFY → DELETE. Never delete on “looks unused.”  
**Do not delete** migrations 0001–0026.

---

## KEEP (canonical)

- SupabaseRepository + sale/void RPCs  
- returns-store SQL path  
- Relational stocktake/transfer/PO **when resolveDb present**  
- storefront DEFINER RPCs  
- Gate 3 auth helpers (`gms-auth` app_metadata)  
- `requireSupabase` fail-closed production guard  

---

## REPLACE (before delete)

| Legacy | Replacement | Phase |
|--------|-------------|-------|
| audit-logger / audit-store collections | `audit_events` + API | 2 |
| gateway-payments collection + JSON | payment_intents/events tables | 2 |
| register docStore keys | shifts + shift_summaries only | 3 |
| po/transfer/stocktake JSON fallbacks | SQL only; 503 if DB down | 3 |
| offline-queue localStorage | Disable production / DEFERRED | 2 (quick win) |
| LocalRepository / sales.json | Demo-only under POS_ALLOW_DEMO | 6 |
| upsertOverride stock for local pending | Durable completePendingSale only | 3 |
| Dual writeAudit paths | Single audit service | 2 |

---

## DEFER (document stores OK for now)

Vertical modules on `app_collections`: restaurant, HP, layaway, play, bookings, jobs, delivery, click-collect, held-bills, reloads, tenant-knowledge, ux-events — **not Gate 4 blockers** unless sold as core.

Licence remaining in `app_documents` until billing SQL phase.

---

## MUST NOT DELETE

- Historical migrations 0001–0026  
- `reseller_licences` view  
- SQL `audit_events` / `payments` / `stock_movements`  
- Damaged Aug-24 backup file may be retained as evidence of failure but **never restored**  

---

## DELETE checklist (Phase 6 only)

For each candidate:

1. Durable replacement merged  
2. All callers switched  
3. tsc + vitest + build  
4. Grep shows zero imports  
5. Production smoke  
6. Then delete file  

### Candidate delete list (not approved yet)

- `src/lib/offline-queue.ts` production wiring (or feature-flag off)  
- Local JSON branches inside dual-path stores  
- `audit-store.ts` after merge into logger→SQL  
- Orphan DB function `gate3_as_user` via **0027+ DROP** (not history rewrite)  

---

## Grep watchlist

```text
docStore|recordStore|readJsonFile|writeJsonFile|upsertOverride|offline-queue|LocalRepository|sales\.json|gateway-payments\.json
```

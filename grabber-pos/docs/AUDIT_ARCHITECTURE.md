# AUDIT ARCHITECTURE

**Date:** 2026-08-25  
**Status:** AS-IS documented · TARGET mandated · **implementation NOT started** (Phase 2)

---

## AS-IS (verified)

### A. SQL ledger — `public.audit_events`

| Field (live) | Notes |
|--------------|-------|
| id, org_id, actor_id, action, entity, entity_id, metadata, created_at | From 0001 |

- RLS: **SELECT only** (`audit_read`)
- Writers: SECURITY DEFINER RPCs (`create_sale` path, `void_sale`, storefront commerce, etc.)
- UI `/api/audit` does **not** read this table

### B. Application collection — `audit-logger.ts`

- Collection: `audit-logs` / file `audit_logs.json`
- Used by: `api/audit`, stocktake post, transfer approve
- Mutable document store (update possible via recordStore)

### C. Application collection — `audit-store.ts`

- Collection: `audit-events` / file `audit-events.json`
- Used by: `writeAudit` (complete-pending-sale, local sales-repo, fiscal-stub, privacy purge)

**Flag:** DUPLICATE — three writers, two storage models, one SQL table under-consumed by API.

---

## TARGET (P0 — mandatory)

**Single truth:** `audit_events`

### Required properties

- Append-only (no tenant UPDATE/DELETE)
- Actor from session / service principal — **never** client body
- org_id from `current_org_id()` or trusted service mapping
- Prefer transactional write inside critical RPCs
- HQ actions distinguishable (metadata.platform = true or null org for platform-wide)

### Minimum event set (implementation checklist)

login, logout, failed login (where practical), org create, member invite, role/permission change, product create/update/price, stock adjustment, stocktake, transfer, PO, sale, void, return, refund, discount override, register open/close, payment created/completed/failed, webhook received, licence change, settings change, WhatsApp config, AI config, HQ actions.

### Column extensions (0027 candidate)

Add if missing after inventory of RPC payloads: `actor_role`, `before`, `after`, `correlation_id`, `ip`, `user_agent` (nullable).

### Cutover plan

1. Migration 0027: extend table + `audit_write(...)` DEFINER helper + grants  
2. Wire `logAuditEvent` / `writeAudit` → SQL only  
3. Point `GET /api/audit` at SQL SELECT  
4. Backfill optional (collections → SQL) or leave historical docs read-only  
5. Delete collection writers after tests  
6. Gate 3 re-smoke: cashier still 403 on audit GET  

---

## Non-negotiable

Clients must not supply: actor identity, org_id, timestamp, privileged metadata as authority.

# Phase B — Counter control & inventory

**Status:** IN PROGRESS — 2026-08-28  
**Depends on:** Phase A PASS

## B1 — Manager authorization guard

| Item | Status | Evidence |
|------|--------|----------|
| scrypt PIN storage | PASS | `manager-pin.ts` |
| Void requires PIN + permission | PASS | `sales/[id]/void` |
| POS discount/price override PIN | PASS | BillPanel + `/api/permissions` verify |
| Configurable discount threshold | PASS | `permissions.policy` (not hard-coded 20%) |
| Manager approval audit | PASS | `manager-authorization.ts` → `audit_events` |
| Returns require manager PIN | PASS | `POST /api/returns` |

### Owner action

Set a non-default manager PIN on `/permissions` before pilot cashiers use void/override.

## B2 — Inter-branch transfers

| Item | Status | Evidence |
|------|--------|----------|
| Durable tables | PASS | `stock_transfers`, `stock_transfer_lines` |
| Branch picker (UUID) | PASS | `GET /api/branches`, transfers UI |
| Lifecycle: request | PASS | `pending_dispatch` on create |
| Lifecycle: dispatch | PASS | `POST /api/transfers/[id]/dispatch` → `in_transit`, source stock − |
| Lifecycle: receive | PASS | `POST /api/transfers/[id]/approve` → target stock + |
| Migration `in_transit` status | READY | `0032_stock_transfer_in_transit.sql` |

### Operator smoke

1. Create transfer between two branches
2. Dispatch — verify source stock decreases
3. Receive — verify target stock increases

## Next phase

**Phase C** — Digital receipts + storefront CTA (partial: invoice PDF + WA caption)

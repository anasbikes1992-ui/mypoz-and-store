# 08 — Jarvis BI

**Status:** PASS WITH NOTES — 2026-08-27  
**Rule:** Read-only BI over canonical ledgers. No separate Jarvis DB.

## Shipped

- Owner chat **`requireTenantSession`** (`/api/ai/chat`)
- HQ chat still **`requireGmsAdmin`**; supports **hq-ops** + **hq-support**
- Thin **TenantContext** (`src/lib/ai/tenant-context.ts`) — reserved for approvals (`10`)
- **`kpi_snapshot`** ties BI answers to KPI canon (`07`)

## Notes

- Still chat+tools (OpenAI), not a separate BI warehouse
- Write tools / Approval Center remain deferred to `09`/`10`

# 09 — Jarvis tools & agents

**Status:** PASS WITH NOTES — 2026-08-27 (expanded)  
**Rule:** Tools + agents under TenantContext. Approvals before side-effects.  
**Reference tenant:** Anaz Store (`anaz-store`).

## Agents (7)

| Agent | Plane | Focus |
|-------|-------|--------|
| `owner-retail` | owner | KPI + sales + invent + propose KB/WA |
| `owner-inventory` | owner | Stock / slow movers |
| `owner-orders` | owner | COD / ONLINE_STORE / WHATSAPP open queue |
| `owner-storefront` | owner | Publish slug + storefront snapshot |
| `owner-whatsapp` | owner | Bot coach + WA draft propose |
| `hq-ops` | hq | Fleet / monitor (Anaz as healthy retail example) |
| `hq-support` | hq | Tickets triage |

## Propose → approve

- `propose_kb_article` / `propose_wa_message` → `/approvals`
- See `10-KNOWLEDGE-APPROVAL.md`

## Notes

- Read tools still dominate; only approved proposals write
- Autonomous agents deferred post–CLIENT READY

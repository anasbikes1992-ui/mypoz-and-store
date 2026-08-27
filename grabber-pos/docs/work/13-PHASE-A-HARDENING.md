# Phase A — Technical hardening (COD path)

**Status:** PASS WITH NOTES — 2026-08-27  
**Excluded (by operator):** PayHere · courier dispatch · WebXPay (still LAST `12`) · Redis stock lock

## Done

| Item | Evidence |
|------|----------|
| Production env fail-closed | `next.config.ts` throws on `VERCEL_ENV=production` if Supabase URL/anon/service missing (unless `POS_ALLOW_DEMO=true`); `src/instrumentation.ts` runtime gate; existing `requireSupabase` request path |
| RLS verification | Live: `sales`, `products`, `branch_stock`, `profiles` have `rowsecurity=true` + policies. Isolation (2026-08-27): Anaz **1518** products / 1 sale vs Pilot 02 **1** product / 2 sales. Script: `npm run ops:rls`. No migration reopen. |
| Quarantine thin verticals | Launcher tiles **Rooms / Rent / Hire purchase / Repair** → `soon`. Also stripped from `planEnabledKeys` unless `POS_SHOW_QUARANTINED_VERTICALS=true`. |

## Explicitly not in this packet

- PayHere / dual gateway  
- PickMe / Domex courier  
- Transient checkout stock lock  
- WebXPay live cards (`12`)  
- Broad 3-merchant GTM launch  

## Next

Anaz COD soft-launch checklist (`11`) → CLIENT READY → then `12`.

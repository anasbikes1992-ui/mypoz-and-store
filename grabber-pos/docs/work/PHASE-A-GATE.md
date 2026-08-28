# Phase A — Core commerce loop gate

**Status:** PASS (code + pilot evidence) — 2026-08-28  
**Host:** https://mypoz-and-store-ui.vercel.app  
**Pilot:** Anaz Store (`anaz-store`)

## Loop

```text
POS → STOCK → STORE → WHATSAPP → ORDER → COD → FULFILLMENT → WA STATUS → OWNER VIEW
```

## Evidence

| Step | Implementation | Status | Evidence |
|------|----------------|--------|----------|
| A1 POS sale | `create_sale` via BillPanel | PASS | Gate 4, Anaz pilot |
| A1 Stock decrement | RPC atomic | PASS | Gate 4 |
| A2 Storefront | `/store/anaz-store` | PASS | 1518 SKUs, COD smoke |
| A3 WhatsApp | org-scoped bot + menu | PASS | hi menu, track receipt |
| A4 Fulfillment | commerce orders board | PASS | DEL board smoke |
| A5 Owner strip | `TodayChannelStrip` | PASS | unit test |
| Invoice PDF / WA | `getRepository().findSaleById` | PASS | commit `e69b91c` |
| Auth Site URL | Supabase dashboard | PASS | A-OP-01 |

## Operator re-smoke (post-deploy)

1. POS cash sale → receipt `GPS-MAIN-…`
2. Invoice PDF opens (not JSON error)
3. WhatsApp invoice send (if mobile configured)
4. Track receipt in WhatsApp bot
5. `/dashboard` TODAY strip updates

## Deferred from Phase A

- WebXPay live cards (LAST)
- NLP free-form WA ordering
- Mobile COD polish (optional)

## Next phase

**Phase B** — Counter control & inventory (`docs/work/PHASE-B-COUNTER-INVENTORY.md`)

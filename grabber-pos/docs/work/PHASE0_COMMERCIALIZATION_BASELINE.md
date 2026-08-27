# Phase 0 — Current-state implementation map

**Generated for:** MYPOZ Commercialization Master Prompt  
**Branch tip:** `business-os-cod-first` (Phase A in progress)  
**Host:** https://mypoz-and-store-ui.vercel.app  
**DB:** `veavfkjgtkbnggukzjds` · Pilot: `anaz-store`

Status legend: `WORKING | PARTIAL | MISSING | BROKEN | DUPLICATED | UNSAFE | UNPROVEN`

| FEATURE | CURRENT IMPLEMENTATION | SOURCE OF TRUTH | STATUS | GAP | REQUIRED CHANGE | TEST/EVIDENCE |
|---------|------------------------|-----------------|--------|-----|-----------------|---------------|
| Canonical commerce | `create_sale` / internals | Supabase RPC + `sales` | WORKING | — | Preserve | Gate 4 |
| Sale sources | POS · ONLINE_STORE · WHATSAPP | `schema.ts` | WORKING | — | Preserve | channel-report tests |
| POS → stock | BillPanel → create_sale | POS + RPC | WORKING | — | Preserve | Operator POS |
| Storefront + COD | `/store/anaz-store` | storefront RPCs | WORKING | — | Preserve | GPS / DEL smokes |
| WhatsApp bot | Cloud API + org resolve | webhook + bot | WORKING | — | Preserve | hi menu works |
| WA org scoping | `whatsapp_resolve_org` + unique attach | `0031` + durable | WORKING | — | Preserve | Anaz phone only |
| Invoice PDF / WA send | `findSaleById` durable | sales-repo | WORKING | Deploy smoke | Confirm after promote | Was broken → fixed `abfa271` |
| WA track receipt | hyphen-safe receipt lookup | findWhatsAppSale | WORKING | Deploy smoke | Re-test GPS-MAIN-… | Sale exists Anaz |
| Owner TODAY strip (A7) | `/dashboard` TodayChannelStrip | channel-report | WORKING | — | Preserve | unit test todayChannelSnapshot |
| Auth Site URL (A8) | Supabase URL config | Auth dashboard | WORKING | — | Preserve | Site URL = mypoz-and-store-ui |
| Mobile cart/POS (A9) | sticky CTAs + ticket-first | CartPageView + pos page | PARTIAL | Owner phone COD confirm | Optional polish | Layout shipped |
| Customers / Loyalty OS | collections | — | PARTIAL | Phase B | After A gate | — |
| WA inbox depth | `/whatsapp` | — | PARTIAL | Phase C | After A gate | — |
| Jarvis briefing | tools + KB | — | PARTIAL | Phase D | After A gate | — |
| WebXPay live | staging / 442 | — | PARTIAL | LAST | Deferred | — |

## Phase status

| Phase | Status |
|-------|--------|
| 0 Discovery | PASS |
| A Core loop | IN PROGRESS → near PASS (A9 phone COD confirm remaining) |
| B–F | NOT STARTED |

## Loop evidence

```text
POS → STOCK → WEB → WA → COD SALE → STOCK → DELIVERY → WA STATUS → OWNER CHANNEL VIEW
```

Owner channel view: `/dashboard` **Today** strip (POS / WEB / WHATSAPP / TOTAL).

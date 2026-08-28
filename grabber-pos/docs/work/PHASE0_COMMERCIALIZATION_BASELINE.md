# Phase 0 — Current-state implementation map (Revision 2)

**Master prompt:** `docs/MYPOZ_COMMERCIALIZATION_MASTER_PROMPT_V2.md`  
**Branch tip:** `business-os-cod-first`  
**Host:** https://mypoz-and-store-ui.vercel.app  
**DB:** `veavfkjgtkbnggukzjds` · Pilot: `anaz-store`

Status: `WORKING | PARTIAL | MISSING | BROKEN | DUPLICATED | UNPROVEN`

## Commerce core (Phase A)

| FEATURE | IMPLEMENTATION | STATUS | EVIDENCE |
|---------|----------------|--------|----------|
| Canonical commerce | `create_sale` RPC | WORKING | Gate 4 |
| POS → stock | BillPanel → repository | WORKING | Anaz pilot |
| Storefront + COD | `/store/anaz-store` | WORKING | GPS/DEL smokes |
| WhatsApp bot | org-scoped webhook + bot | WORKING | hi menu |
| Invoice PDF / WA | tenant `findSaleById` | WORKING | `e69b91c` |
| Owner TODAY strip | `/dashboard` | WORKING | channel-report test |
| Phase A gate | loop evidence | PASS | `PHASE-A-GATE.md` |

## Counter & inventory (Phase B)

| FEATURE | IMPLEMENTATION | STATUS | GAP |
|---------|----------------|--------|-----|
| Manager PIN (scrypt) | permissions-store | WORKING | Owner must set PIN |
| Configurable discount policy | `permissions.policy` | WORKING | — |
| Manager audit trail | `manager-authorization.ts` | WORKING | — |
| Returns PIN gate | `POST /api/returns` | WORKING | — |
| Inter-branch transfers | `stock_transfers` + UI | PARTIAL | Operator dispatch/receive smoke |
| `in_transit` status | migration 0032 | READY | Apply on Supabase |

## Customer experience (Phase C)

| FEATURE | STATUS | GAP |
|---------|--------|-----|
| E-receipt PDF footer CTA | PARTIAL | `storefront-url` on invoice |
| WA invoice caption CTA | PARTIAL | deployed with B/C batch |
| Referral footer (plan-aware) | PARTIAL | white-label rules |
| Product share UX | PARTIAL | links exist, no share UI |

## Platform & intelligence (Phases D–M)

| FEATURE | STATUS |
|---------|--------|
| Customer profile OS | PARTIAL (collections) |
| Loyalty ledger | PARTIAL (app_collections) |
| WA inbox ops | PARTIAL |
| Webhook DLQ | PARTIAL (`payment_events` schema) |
| Offline POS | DEFERRED (`NEXT_PUBLIC_ALLOW_OFFLINE_POS`) |
| Jarvis briefing OS | PARTIAL (tools + approvals) |
| Monetization / lending | DEFERRED (business strategy only) |

## Phase status

| Phase | Status |
|-------|--------|
| 0 Discovery | PASS |
| A Core loop | PASS |
| B Counter + inventory | IN PROGRESS |
| C Customer experience | STARTED (receipt CTA) |
| D–M | NOT STARTED / DEFERRED |

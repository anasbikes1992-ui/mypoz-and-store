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

| Inter-branch transfers | `stock_transfers` + UI | WORKING | Operator dispatch/receive smoke |

| `in_transit` status | migration 0032 | WORKING | Applied on Supabase |



## Customer experience (Phase C)



| FEATURE | IMPLEMENTATION | STATUS | GAP |

|---------|----------------|--------|-----|

| E-receipt PDF footer CTA | `storefront-cta.ts` | WORKING | — |

| WA invoice caption CTA | whatsapp route | WORKING | — |

| Plan-aware storefront footer | `plan-branding.ts` | WORKING | — |

| Product share UX | `ProductShareButtons` | WORKING | — |



## Customer & loyalty (Phase D)



| FEATURE | IMPLEMENTATION | STATUS | GAP |

|---------|----------------|--------|-----|

| Customer collections | `/customers` | WORKING | — |

| Profile + channel history | `customer-profile.ts` | WORKING | Operator smoke |

| Loyalty ledger | `loyalty-ledger.ts` | WORKING | — |

| Sales linkage | mobile match on `sales` | WORKING | 500-sale scan cap |



## WhatsApp ops (Phase E)



| FEATURE | STATUS | GAP |

|---------|--------|-----|

| Inbox + staff reply | WORKING | — |

| WA → `create_sale` | WORKING | — |

| Thread sale link + polling | WORKING | — |



## Platform resilience (Phases F–G)



| FEATURE | STATUS | GAP |

|---------|--------|-----|

| `payment_events` DLQ + replay | WORKING | Owner replay smoke |

| Offline POS IndexedDB | WORKING | Flag off in prod |



## Intelligence & owner (Phases H–I)



| FEATURE | STATUS |

|---------|--------|

| Jarvis agents + dashboard prompts | WORKING |

| Needs attention card | WORKING |



## Verticals & GTM (Phases J–M)



| FEATURE | STATUS |

|---------|--------|

| Repair vertical active | WORKING |

| GTM / launch gate docs | WORKING |

| SaaS billing + expiry banner | WORKING |

| Lending / take-rate | DEFERRED |



## Phase status



| Phase | Status |

|-------|--------|

| 0 Discovery | PASS |

| A Core loop | PASS |

| B Counter + inventory | PASS (code) |

| C Customer experience | PASS (code) |

| D Customer + loyalty | PASS (code) |

| E WhatsApp ops | PASS (code) |

| F Webhook DLQ | PASS (code) |

| G Offline POS | PASS (flagged pilot) |

| H Jarvis | PASS (code) |

| I Owner surface | PASS (code) |

| J Verticals | PASS (repair shipped) |

| K GTM | DOCS |

| L Monetization | PASS (tiers only) |

| M Financial ecosystem | DEFERRED |



## Launch readiness (2026-08-28)

| CHECK | RESULT |
|-------|--------|
| Vitest | **241/241** PASS |
| `release-gate-ops.mjs` | **AUTOMATED_PASS** |
| Anaz COD smoke | PASS (prior) |
| Operator smokes (B/D/C post-deploy) | OPEN |
| Card / WebXPay | DEFERRED |

**Verdict:** READY for Anaz soft launch (POS + COD + WA). See `docs/work/LAUNCH_READINESS.md`.


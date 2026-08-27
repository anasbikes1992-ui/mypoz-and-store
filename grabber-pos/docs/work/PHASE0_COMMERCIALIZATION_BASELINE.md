# Phase 0 — Current-state implementation map

**Generated for:** MYPOZ Commercialization Master Prompt  
**Branch tip:** `business-os-cod-first` @ `29f5ad4` (+ uncommitted WA org-scope)  
**Host:** https://mypoz-and-store-ui.vercel.app  
**DB:** `veavfkjgtkbnggukzjds` · Pilot: `anaz-store`

Status legend: `WORKING | PARTIAL | MISSING | BROKEN | DUPLICATED | UNSAFE | UNPROVEN`

| FEATURE | CURRENT IMPLEMENTATION | SOURCE OF TRUTH | STATUS | GAP | REQUIRED CHANGE | TEST/EVIDENCE |
|---------|------------------------|-----------------|--------|-----|-----------------|---------------|
| Canonical commerce | `create_sale` / `create_sale_internal` + repos | Supabase RPC + `sales` | WORKING | — | Preserve | Gate 4 PASS; money-path tests |
| Sale sources | `SALE_SOURCES`: POS, ONLINE_STORE, WHATSAPP | `src/lib/commerce/schema.ts` | WORKING | — | Preserve | channel-report tests |
| Multi-tenant RLS | Migrations through launch hardening + later | `supabase/migrations/*` | WORKING | Confirm remote has `0031` applied | Ship `0031` if not on all envs | ops RLS checks; Gate 2/3 |
| POS → stock | BillPanel → create_sale | POS + RPC | WORKING | — | Preserve | Gate 3; POS cash smoke |
| Storefront catalog/stock | `/store/[slug]` + storefront RPCs | Same products/stock | WORKING | — | Preserve | Anaz 1518; ops:gate catalog |
| Storefront COD | Checkout → pending → delivery board | `storefront_*` + delivery | WORKING | Mobile smoke owner confirm | A9 evidence | GPS-MAIN-20260826-0001 / DEL-7A6C74A9 |
| WhatsApp Cloud bot | Webhook → bot → menu/cart → sale | `src/lib/whatsapp/*`, `/api/whatsapp/webhook` | WORKING | Uncommitted org-strict routing not on all aliases | Commit/deploy WA org-scope | Operator: hi works; WABA subscribed |
| WA org scoping | `whatsapp` doc phone → org; RPC `whatsapp_resolve_org` | `app_documents` + `0031` | PARTIAL | Code on disk uncommitted; HQ must not own Anaz line | Ship durable attach uniqueness + bot early-return | SQL resolve → Anaz only |
| WA inbox | `/whatsapp` conversations/messages | Org collections/docs | PARTIAL | Not full C1 state machine | Phase C | Manual inbox after hi |
| WA status alerts | Event automations + toggles | WA settings `enabledEvents` | PARTIAL | Template/policy compliance ongoing | Harden A6 evidence | Status toggle UI shipped |
| WA NLP order detect | — | — | MISSING | Deferred | Do not build in A–C | — |
| Channel report lib | `channel-report.ts` groups by source | Sales ledger | WORKING | Thin **owner TODAY UI (A7)** not productized | Add minimal owner surface | Unit tests exist |
| Owner TODAY strip (A7) | Reports APIs exist; no dedicated thin strip | reports/summary + channel-report | MISSING | Phase A requirement | Small UI on home/dashboard | After build: smoke counts |
| Customers | `/customers` collection UI | Customers collection | PARTIAL | No rich profile B1–B4 | Phase B | Manual |
| Loyalty | `/loyalty` + POS redeem/earn | `loyalty-ledger` | PARTIAL | Not embedded in customer profile | Phase B3 | loyalty-ledger tests |
| Delivery board | `/delivery` + statuses | delivery-store | WORKING | Tie WA notifications evidence | A5/A6 | DEL board smoke |
| Payments COD | Soft-launch path | Pending sale + settle | WORKING | — | Preserve | COD smoke |
| WebXPay live | Staging/env; capture 442 | payments gateways | PARTIAL | Deferred LAST | Do not expand A–C | Gate 4 P1 |
| HQ | `/hq` onboard, tenants, WA fleet | HQ + licences | WORKING | Copy updated uncommitted | Ship fleet copy | Manual HQ |
| Jarvis | Agents + tools + KB + approvals | `src/lib/ai/*` | PARTIAL | No daily briefing D1 | Phase D | jarvis-kb tests |
| Auth Site URL | Supabase dashboard config | Auth settings | UNPROVEN | **A-OP-01** operator | Confirm redirects for ui host | Operator checklist |
| Deploy | `mypoz-and-store-ui` only | Vercel | WORKING | Keep branches in sync | Promote after commit | vercel ls |
| Tests/smoke | vitest + ops:gate + whatsapp-smoke | scripts + CI | WORKING | Re-run after ship | `npm test` / `ops:gate` | AUTOMATED_PASS historical |
| Health score / win-back / campaigns | — | — | MISSING | Explicitly deferred | Phase E/F only when justified | — |

## Loop evidence (Phase A target)

```text
POS SALE → STOCK → WEB PRODUCT → WA ORDER → CANONICAL COD
  → STOCK → DELIVERY → WA STATUS → OWNER CHANNEL VIEW
```

Most of the loop is **WORKING** on Anaz; gaps for Phase A **PASS**: A7 owner strip, A8 Auth confirm, A9 mobile confirm, ship uncommitted WA org-scope, refresh smoke evidence after deploy.

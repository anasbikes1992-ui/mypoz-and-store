# MYPOZ — COMMERCIALIZATION + ROBUSTNESS MASTER PROMPT (Revision 2)

**Supersedes:** `docs/MYPOZ_COMMERCIALIZATION_MASTER_PROMPT.md` (v1 phase letters differ)  
**Codebase:** `grabber-pos` · **Host:** https://mypoz-and-store-ui.vercel.app  
**DB:** Supabase `veavfkjgtkbnggukzjds` · **Pilot:** Anaz (`anaz-store`)

## North star

> Sell in-store. Sell online. Sell on WhatsApp. One stock. One customer. One business.

## Architecture freeze (non-negotiable)

- One canonical commerce engine (`create_sale` / internals)
- No second order ledger, inventory DB, customer DB, or loyalty ledger
- RLS + org scope on every tenant path
- Jarvis reads trusted data — never a second commerce engine

Before coding: `graphify query` → read `docs/work/PHASE0_COMMERCIALIZATION_BASELINE.md` → inspect existing implementation.

## Execution contract (agent)

```text
CURRENT ALLOWED: next open phase only
EVIDENCE: IMPLEMENTED → TESTED → VERIFIED → GAP
DEFERRED: NLP, campaigns, health score, lending, offline (until Phase G), WebXPay live
```

## Build order (strategic priority)

| # | Phase | Focus |
|---|-------|-------|
| — | **A** | Core commerce loop (POS→stock→web→WA→fulfill→owner) |
| 1 | **B** | Manager auth + inter-branch transfers |
| 2 | **C** | E-receipts + storefront referral CTA + product share |
| 3 | **D** | Customer + loyalty engine (existing ledger) |
| 4 | **E** | WhatsApp ops depth (inbox, structured orders) |
| 5 | **F** | Webhook resilience / DLQ (`payment_events`) |
| 6 | **G** | Offline POS (IndexedDB queue — not localStorage prod) |
| 7 | **H** | Jarvis intelligence on trusted data |
| 8 | **I** | Owner operating surface |
| 9 | **J** | Vertical workflows (one engine) |
| 10 | **K** | Commercialization / GTM |
| 11 | **L** | Monetization (no hard-coded take rates) |
| 12 | **M** | Financial ecosystem — partner/regulated only |

## Phase status (live map)

| Phase | Doc | Status |
|-------|-----|--------|
| 0 | `docs/work/PHASE0_COMMERCIALIZATION_BASELINE.md` | PASS |
| A | `docs/work/PHASE-A-GATE.md` | PASS |
| B | `docs/work/PHASE-B-COUNTER-INVENTORY.md` | PASS (code) |
| C | `docs/work/PHASE-C-CUSTOMER-EXPERIENCE.md` | PASS (code) |
| D | `docs/work/PHASE-D-CUSTOMER-LOYALTY.md` | PASS (code) |
| E | `docs/work/PHASE-E-WHATSAPP-OPS.md` | PASS (code) |
| F | `docs/work/PHASE-F-WEBHOOK-DLQ.md` | PASS (code) |
| G | `docs/work/PHASE-G-OFFLINE-POS.md` | PASS (flagged) |
| H | `docs/work/PHASE-H-JARVIS.md` | PASS (code) |
| I | `docs/work/PHASE-I-OWNER-SURFACE.md` | PASS (code) |
| J | `docs/work/PHASE-J-VERTICALS.md` | PASS (repair) |
| K | `docs/work/PHASE-K-GTM.md` | DOCS |
| L | `docs/work/PHASE-L-MONETIZATION.md` | PASS |
| M | `docs/work/PHASE-M-FINANCIAL.md` | DEFERRED |
| — | `docs/work/LAUNCH_READINESS.md` | **READY (Anaz COD)** |

## Phase A gate (complete before B)

Verify on Anaz pilot:

1. POS cash sale → `GPS-MAIN-…`
2. Invoice PDF + optional WA send
3. Storefront COD order → delivery board
4. WhatsApp hi / track receipt
5. `/dashboard` TODAY strip

## Phase B (current)

### B1 Manager authorization

- Configurable policy in `/permissions` (discount threshold, near-max ratio)
- PIN + RBAC on void, override, returns
- Audit: `manager.*` actions in `audit_events`
- Never store plaintext PINs (scrypt)

### B2 Inter-branch transfers

- `pending_dispatch` → `in_transit` (dispatch, source −) → `received_approved` (receive, target +)
- Real branch UUIDs via `GET /api/branches`

## Phase C (next after B)

- Digital receipt content (PDF + WA) with storefront CTA from `storeSlug`
- Plan-aware branding (no forced “Powered by” on white-label)
- Product share links (org-safe)

## Explicitly deferred

- Payment take-rate (0.5–1%) as engineering requirement
- Polim Capital / merchant lending in core app
- NLP WA ordering, mass campaigns, business health score vanity metrics
- WebXPay live until operator promotes card path

## Testing standard

Feature complete only when: UI + auth + API + canonical data path + RLS + test + evidence doc updated.

## Branches

Ship on: `business-os-cod-first` · sync `production-hardening`

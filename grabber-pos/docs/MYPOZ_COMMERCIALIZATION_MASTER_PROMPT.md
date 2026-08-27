# MYPOZ — COMMERCIALIZATION MASTER PROMPT
## Paste this entire document into a coding agent session

**Source of truth:** Operator revision `MYPOZ — COMMERCIALIZATION & SUCCESS BLUEPRINT.md` (foundation-preserving).  
**Codebase:** `grabber-pos` (package `mypoz-commerce-cloud`)  
**Live host only:** `https://mypoz-and-store-ui.vercel.app`  
**DB:** Supabase `veavfkjgtkbnggukzjds`  
**Pilot tenant:** Anaz Store (`anaz-store` / org `304adc33-7279-4547-a73d-a2240333e814`)  
**Branches in sync when shipping:** `business-os-cod-first` · `production-hardening`

**No calendar estimates.** Work is gated by **phases** and **evidence**, not days or weeks.

---

You are working on **MyPoz Commerce Cloud**, an existing production-oriented product.

MyPoz is **not a greenfield project**.

Do NOT redesign the architecture, replace the database, create parallel commerce ledgers, create a second order system, replace the existing authentication model, or reorganize the application simply to implement this blueprint.

The objective is to **finish, harden, productize, and commercialize the existing MyPoz foundation**.

Before exploring code with Read/Grep/Glob/Bash at scale, use the project graphify knowledge graph (`graphify query` / `path` / `explain`). After code edits, run `graphify update .`.

Before writing Next.js code, read relevant guides under `node_modules/next/dist/docs/` — this Next.js version may differ from training data.

---

# 1. PRODUCT NORTH STAR

MyPoz should become:

> **The operating system for small and medium businesses.**

Commercial promise:

> **Sell in-store. Sell online. Sell on WhatsApp. One stock. One customer. One business.**

Deeper vision:

> **Take the order wherever it arrives, keep inventory accurate, collect payment, communicate automatically, fulfill the order, and bring the customer back.**

Stack (same foundation — not separate products):

```text
POS + ONLINE STORE + WHATSAPP COMMERCE
+ INVENTORY + CUSTOMERS + ORDERS + PAYMENTS
+ FULFILLMENT + JARVIS INTELLIGENCE
```

---

# 2. ABSOLUTE ARCHITECTURE RULE

## DO NOT REBUILD MYPOZ.

Before changing anything:

1. Inspect the repository  
2. Read architecture docs (`docs/ARCHITECTURE_MAP.md`, `docs/ARCHITECTURE.md`, `docs/DATA-MODEL.md`, `docs/DATABASE_MAP.md`)  
3. Read certified gate/evidence docs (`docs/LAUNCH_STATUS.md`, `docs/GO_TO_MARKET.md`, `docs/RELEASE_GATE.md`, `docs/PRODUCT_FINALIZE.md`)  
4. Inspect schema / migrations (`supabase/migrations/`)  
5. Inspect RPCs (especially `create_sale` / `create_sale_internal` / storefront paths)  
6. Inspect RLS  
7. Inspect APIs  
8. Inspect WhatsApp (`src/lib/whatsapp/*`, `src/app/api/whatsapp/*`, `/whatsapp`, `/hq/whatsapp`)  
9. Inspect POS  
10. Inspect storefront (`/store/[slug]`)  
11. Inspect HQ  
12. Inspect Jarvis (`src/lib/ai/*`, `/knowledge`, `/approvals`)  
13. Map proposed changes to existing functionality  

Never assume a feature is missing merely because it is not visible from one UI.  
Never replace an existing implementation until you prove it is structurally wrong.

Prefer: `FOUNDATION → HARDEN → CONNECT → PRODUCTIZE → EXTEND`  
Never: `FOUNDATION → DELETE → REBUILD`

### Soft-launch freezes (do not violate)

- **COD / WhatsApp first** for Anaz battle-test  
- **WebXPay / live cards LAST** (do not expand card scope in Phase A–C)  
- No PayHere / courier-partner APIs / Redis stock-lock as launch blockers  
- Do not send traffic to undeployed `mypoz-and-store` Vercel project  
- WhatsApp lines are **org-scoped** (Anaz owns GRABBER.LK `101779492851300`); HQ WhatsApp is a **separate** future line/templates — do not conflate  

---

# 3. CANONICAL COMMERCE PRINCIPLE

One commerce engine. Sources already include:

```text
POS | ONLINE_STORE | WHATSAPP
```

(`src/lib/commerce/schema.ts` — `SALE_SOURCES`)

Do NOT introduce competing ledgers (`whatsapp_orders`, `web_orders`, `pos_orders` as separate universes).

A WhatsApp / web / POS sale must converge on the canonical sale path (`create_sale` / approved internals). Same stock. Same customer. Same fulfillment.

```text
POS ─────────┐
WEB ─────────┼──→ CANONICAL COMMERCE ENGINE ──→ STOCK / CUSTOMER / PAYMENT
WHATSAPP ────┘                                      ↓
                                              FULFILLMENT → WA → REPEAT
```

---

# 4. CURRENT PRODUCT REALITY (baseline — do not oversell)

| Engine | Verdict | Notes |
|--------|---------|--------|
| **Sell** | ALIGNED / STRONG | Canonical commerce + channel sources |
| **WhatsApp** | WORKING CHANNEL | Cloud bot, org-scoped Anaz line, menu/cart, `source=WHATSAPP`, inbox foundation. **No** free-form NLP “detected order → create” yet — do not pretend |
| **Customer** | FOUNDATION | Customers + loyalty ledger; not full LTV / NBA / segments UI |
| **Jarvis** | PARTIAL | Tools + KB + approvals; not daily briefing OS yet. Must not become a second commerce engine |

---

# 5. EXECUTION PHASES (sequential — gates required)

Do not skip forward because a later feature looks attractive.  
A phase is complete only when acceptance criteria are demonstrated with **real evidence**.

---

## PHASE 0 — DISCOVERY & BASELINE

**No feature coding.** Map current state.

Inspect: architecture, DB, tables, RPCs, RLS, auth, POS, storefront, WhatsApp, orders, payments, inventory, customers, loyalty, delivery, HQ, Jarvis, tests, smoke, deploy, env.

Classify each area: `WORKING | PARTIAL | MISSING | BROKEN | DUPLICATED | UNSAFE | UNPROVEN`

Deliver a concise implementation map:

```text
FEATURE | CURRENT IMPLEMENTATION | SOURCE OF TRUTH | STATUS | GAP | REQUIRED CHANGE | TEST/EVIDENCE
```

---

## PHASE A — MAKE THE CORE UNDENIABLE

Prove the complete loop on existing architecture (prefer **Anaz** real pilot):

```text
POS → STOCK → STORE → WHATSAPP → COD ORDER → CANONICAL SALE
  → STOCK → DELIVERY → WHATSAPP CONFIRMATION → OWNER CHANNEL VIEW
```

### Requirements

- **A1** Org isolation (org → branch → products → stock → sales → customers → WhatsApp). No cross-tenant leakage.  
- **A2** POS → stock (`source=POS`, stock correct, customer attribution where applicable).  
- **A3** Store → same catalog/stock (no duplicate inventory).  
- **A4** WhatsApp structured flow: `hi` → menu → product → cart → details → COD → canonical sale.  
- **A5** Order → delivery/fulfillment state machine.  
- **A6** WhatsApp transactional status (Meta-compliant; no bulk spam).  
- **A7** Thin owner channel view only:

```text
TODAY
POS X | WEB X | WHATSAPP X | TOTAL X
```

No decorative chart zoo.  
- **A8** Auth / deploy: resolve **A-OP-01** Supabase Auth Site URL + redirects for `mypoz-and-store-ui` if still open.  
- **A9** Mobile storefront/COD smoke.

### Phase A gate

Evidence chain: DB + API + UI + Auth + RLS + real pilot + smoke/test.

Do not proceed until this loop is **boringly reliable**.

---

## PHASE B — CUSTOMER ENGINE

After Phase A is stable. Build on existing customers — **no second customer DB**.

- **B1** Profile: identity + first/last purchase + orders + history + channels  
- **B2** Channel history: POS / ONLINE_STORE / WHATSAPP  
- **B3** Loyalty visibility on the customer (points earned/redeemed/balance)  
- **B4** Activity timeline (order / payment / delivery / message / refund / loyalty) where architecture supports it  

### Phase B gate

Staff open **one** customer and understand who / what / where / when / worth — without hopping unrelated systems.

---

## PHASE C — WHATSAPP COMMERCE DEPTH

Make WhatsApp first-class. **No NLP first.**

- **C1** Unified inbox states aligned to existing order model (NEW / AWAITING PAYMENT / CONFIRMED / PROCESSING / OUT / DELIVERED / CLOSED) — no duplicate status systems  
- **C2** Staff **structured** create-order-from-conversation (customer → product → qty → delivery → payment → canonical order)  
- **C3** Product share (WhatsApp / link / QR / social) with correct org/store/product — no tenant leakage  
- **C4** Transactional automation only (confirm / pay reminder / ready / out / delivered / review) — approved templates where required  
- **C5** Campaign **foundation** (consent, policy, templates, rate limits, org isolation, audit, approval) — not spam  

### Phase C gate

Staff path: inquiry → identify customer → select products → canonical order → COD/pay → fulfill → approved status — **without leaving MyPoz**.

---

## PHASE D — JARVIS BUSINESS INTELLIGENCE

Only after commerce data/workflows are reliable.

```text
MYPOZ DATA → TOOLS → JARVIS → ANALYZE → RECOMMEND → APPROVAL → ACTION
```

- **D1** Daily briefing from real tools (revenue, orders by channel, top products, low stock, pending COD, delivery issues). Never fabricate.  
- **D2** Operational alerts backed by real signals only  
- **D3** Recommendations with review CTA — owner decides  
- **D4** Campaign preparation → approval → then execute  
- **D5** Never bypass RLS / RBAC / org_id / approvals / audit / canonical RPCs  

---

## PHASE E — BUSINESS OS SURFACE

Owner dashboard answers: **What is happening, and what needs attention?**

```text
TODAY (revenue, orders, POS, WEB, WA)
NEEDS ATTENTION (low stock, pending COD, delivery, follow-ups)
JARVIS (what changed / why / what to do)
```

**E1 Business health score** — only when metrics are reliable and explainable (why / data / next action). Do not invent a vanity score.

---

## PHASE F — GROWTH & COMMERCIALIZATION

Only after the product loop is reliable.

- **F1** Homepage / marketing lead with connected commerce promise (not feature laundry list)  
- **F2** Short demo using **real** working paths only  
- **F3** Vertical landing pages (same foundation; presentation differs)  
- **F4** Customer proof / Anaz case study **after** measurable evidence  
- **F5** Pricing clarity tied to operational limits (users, terminals, branches, WhatsApp, automation, support)  

---

# 6. EXPLICITLY DEFERRED (do not build early)

```text
Free-form NLP order detection
Business health score (until justified)
Advanced win-back engine
Advanced segmentation / next-best-action engine
AI-generated mass campaigns
Advanced predictive inventory
Complex marketing automation
Large chart/dashboard expansion
Live WebXPay expansion (LAST)
PayHere / courier partner APIs / Redis stock lock as blockers
HQ WhatsApp line/templates (separate from Anaz merchant line)
```

---

# 7. DATA & SECURITY RULES

Preserve: org isolation, branch isolation, RLS, RBAC, auditability, canonical commerce, auth, payment boundaries, WhatsApp org scoping.

Every write answers: WHO / WHAT / WHICH ORG / WHICH RECORD / WHICH CHANNEL / WHEN / WHY.

Where an RPC is canonical, **use it**. No ad-hoc table writes that bypass stock/money invariants.

---

# 8. TESTING RULE

Do not report “Implemented.” Report:

```text
IMPLEMENTED | TESTED | VERIFIED | EVIDENCE | REMAINING GAP
```

Prefer chain: UI → API → Auth → Service → RPC/Table → RLS → Migration → Test.  
Positive **and** negative security paths (wrong org / wrong branch / unauthorized → denied).

Useful commands (when relevant):

```bash
npm test
npm run ops:gate
node scripts/whatsapp-smoke.mjs https://mypoz-and-store-ui.vercel.app
```

---

# 9. NO MOCK SUCCESS

No fake success UI. No mock APIs to greenwash.  
Don’t claim WhatsApp / payments / stock sync / multi-tenancy without real evidence.

---

# 10. CHANGE MANAGEMENT

Find → understand → dependents → tests → gates → **smallest safe change** → targeted tests → regression → evidence.

No broad refactors during feature work. No renames/moves for taste.

Commit only when the user asks. Prefer both product branches kept in sync when shipping.

---

# 11. DEFINITION OF DONE

Not done: page exists / button exists / 200 / tsc passes alone.

Done: UI → Auth → API → logic → canonical data path → RLS → real data → real user flow → test → evidence.

Commerce features also verify stock / customer / payment / order / fulfillment / notifications where applicable.

---

# 12. REQUIRED AGENT OUTPUT (start of every execution)

### CURRENT STATE

```text
Architecture:
Database:
Commerce:
POS:
Store:
WhatsApp:
Customers:
Loyalty:
Delivery:
HQ:
Jarvis:
Tests:
Deployment:
```

### PHASE STATUS

```text
PHASE 0 — DISCOVERY
PHASE A — CORE COMMERCE LOOP
PHASE B — CUSTOMER ENGINE
PHASE C — WHATSAPP COMMERCE
PHASE D — JARVIS
PHASE E — BUSINESS OS SURFACE
PHASE F — COMMERCIALIZATION
```

Each: `NOT STARTED | IN PROGRESS | BLOCKED | PASS (with evidence pointer)`

### CURRENT BLOCKERS

Real blockers only.

### NEXT SAFE EXECUTION UNIT

Smallest unit that advances **the current phase**. No unrelated work.

---

# 13. FINAL PRODUCT VISION

```text
POS + WEB + WHATSAPP → CANONICAL COMMERCE
  → STOCK / CUSTOMER / PAYMENT → FULFILLMENT
  → CUSTOMER → REPEAT → JARVIS (insight → recommend → approval → action)
```

Promise:

> **MyPoz doesn't just record what happened in your business. It connects the business so you can run it.**

Strategy:

> **Prove the core first. Deepen the customer relationship second. Make WhatsApp operational third. Put Jarvis on top fourth. Commercialize the proven system fifth.**

---

# 14. NON-NEGOTIABLE FINAL INSTRUCTION

**DO NOT GREENFIELD REBUILD.**  
**DO NOT CREATE A SECOND DATABASE / ORDER LEDGER / INVENTORY SYSTEM.**  
**DO NOT BYPASS RLS / ORG SCOPING / CANONICAL COMMERCE RPCs.**  
**DO NOT TURN JARVIS INTO A SECOND COMMERCE ENGINE.**  
**DO NOT BUILD FEATURES merely because they sound impressive.**  
**DO NOT sacrifice reliability for breadth.**

Priority order:

```text
1. PRESERVE CERTIFIED FOUNDATION
2. PROVE CORE COMMERCE LOOP
3. HARDEN REAL-WORLD PILOT (ANAZ)
4. PRODUCTIZE CUSTOMER ENGINE
5. DEEPEN WHATSAPP COMMERCE
6. ADD JARVIS INTELLIGENCE
7. IMPROVE OWNER OPERATING SURFACE
8. COMMERCIALIZE
```

Every decision must move MyPoz closer to:

> **Sell in-store. Sell online. Sell on WhatsApp. One stock. One customer. One business.**

And every implementation must be backed by evidence.

---

# 15. START COMMAND (copy for a new agent)

```text
Execute MYPOZ — COMMERCIALIZATION MASTER PROMPT (docs/MYPOZ_COMMERCIALIZATION_MASTER_PROMPT.md).

Begin at PHASE 0 if no current-state map exists; otherwise continue at the first phase that is not PASS.

Return CURRENT STATE, PHASE STATUS, CURRENT BLOCKERS, and NEXT SAFE EXECUTION UNIT before writing code.

Respect soft-launch freezes (COD/WhatsApp first; WebXPay last; Anaz org-scoped WA line).
Use graphify before broad exploration. No greenfield rebuild.
```

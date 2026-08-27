# MyPoz Business OS — Next Execution Roadmap

**Date:** 2026-08-26  
**Mode:** COD-first  
**Branch:** `business-os-cod-first` (overlay on `production-hardening`)  
**Architecture:** Frozen  
**Purpose:** Operational execution overlay only — not a second architecture SoT

## Authority

[`MYPOZ_FINAL_MASTER_PRODUCTION_BLUEPRINT.md`](./MYPOZ_FINAL_MASTER_PRODUCTION_BLUEPRINT.md) remains the architecture authority.  
[`MYPOZ_FINAL_PRODUCTION_CERTIFICATION.md`](./MYPOZ_FINAL_PRODUCTION_CERTIFICATION.md) remains the gateboard.

This roadmap does **not** reopen:

- migrations `0001`–`0029`
- RLS / security architecture
- canonical commerce ledgers (sales, inventory, payments, audit)
- Postgres / Supabase topology
- Owner Portal information architecture redesign
- infrastructure topology
- payment ledger design

## Current truth (verified 2026-08-27)

| Claim | Status |
|-------|--------|
| Anaz catalog 1518 + published storefront | ✅ |
| Anaz COD smoke (`GPS-MAIN-20260826-0001`) | ✅ |
| Gate 4 auto commerce | ✅ PASS WITH P1 (RSA deferred) |
| Gate 5 logical export | ✅; off-site / PITR still operator |
| HQ Pilot #2 | ✅ **FROZEN PASS** |
| Unknown storefront → 404 / forgot API public | ✅ live |
| Branded reset email (Resend domain) | ⏸ **LAST** (domain in progress; never From gmail) |
| WebXPay / cards | ⏸ **LAST** |
| CLIENT READY | ❌ OPEN |

## Status board

### 🟢 DONE
Architecture freeze · RLS/tenant · Commerce COD · P0 transactional · UI smoke · HQ Pilot #2 · isolation · pre-card prod smoke

### 🟡 NOW
**Owner Portal Completeness** (`docs/work/05`) — gap audit on Anaz + Pilot 02  
Parallel: A-OP-01 confirm · Gate 5 off-site/PITR (ops)

### 🔵 NEXT
WhatsApp v1 → KPI canon → Jarvis BI → tools/agents → knowledge/approvals → real client

### 🔴 LAST (bundled)
**Resend verified domain + password email** · **WebXPay / cards** (`docs/work/12`)

## Immediate next (do in order)

1. ~~Deploy / Pilot #2 freeze~~ ✅  
2. **Owner gap audit** `docs/work/05` (Anaz + `pilot-02-owner@mypoz.test`)  
3. WhatsApp → KPI → Jarvis… → real client  
4. **LAST:** email domain + WebXPay (`02` / `12`)  
5. Parallel ops: reply `A-OP-01: PASS` when ready; Gate 5 off-site

## Deploy note

Prefer **git push to `production-hardening` + promote**. Vercel Hobby CLI `--prod` hits the 12-function cap.

## Execution order (locked)

```text
P0 ops closeout (A-OP-01, Gate5 operator, thin monitoring)
        │
        ▼
P0 transactional hardening (stock UX, totals, orders visibility, slug reserve)
        │
        ▼
P0 HQ truth + onboard wizard polish
        │
        ▼
P0 HQ Pilot #2  ← first real milestone
        │
        ▼
P1 Owner completeness (gaps only — no IA redesign)
        │
        ▼
P1 WhatsApp v1 (10 automations)
        │
        ▼
P1 Canonical KPI defs  ← before Jarvis
        │
        ▼
P1 Jarvis BI (read-only) → tools → 5 agents → knowledge → approvals
        │
        ▼
P1 Real client pilot (one business)
        │
        ▼
P2 WebXPay / cards LAST
```

**Parallel:** Anaz COD soft-launch may continue while P0s close. Do not wait for Sentry maturity, Jarvis, agents, or live cards.

## Stop conditions

STOP on: cross-tenant access · ledger corruption · stock double-apply · duplicate sale/order · broken restore evidence.

Do not respond to a P0 by rewriting unrelated architecture.

## Definition of success

> From HQ, I can create a new tenant, give the owner access, and that business can operate POS/store, sell on COD, manage inventory, use WhatsApp, see canonical KPIs, and ask Jarvis business questions — without crossing tenant boundaries.

Only after that: autonomous agents + card payments.

## Work tree

See [`docs/work/`](./work/) — execute **top to bottom**.

| File | Focus |
|------|--------|
| `01-P0-TRANSACTIONAL-HARDENING.md` | Stock UX, totals, orders, slug, display |
| `02-P0-AUTH-AND-OPS.md` | A-OP-01, Gate5 operator, thin monitoring |
| `03-HQ-TRUTH-AND-ONBOARD.md` | HQ roster truth, onboard wizard |
| `04-HQ-PILOT-02.md` | Throwaway tenant proof |
| `05-OWNER-COMPLETENESS.md` | Gap audit only |
| `06-WHATSAPP-V1.md` | First 10 automations |
| `07-KPI-CANON.md` | Shared KPI definitions |
| `08-JARVIS-BI.md` | Read-only BI |
| `09-JARVIS-TOOLS-AGENTS.md` | Tools + five agents |
| `10-KNOWLEDGE-APPROVAL.md` | Knowledge + approval center |
| `11-REAL-CLIENT-PILOT.md` | One real business |
| `12-WEBXPAY-FINAL.md` | Cards last |

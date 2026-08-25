# MyPoz Production Certification Roadmap (FINAL)

**Status date:** 2026-08-25  
**Stage:** Release hardening — **not** feature expansion  
**Rule:** Do not restore catalog / production business data until Gate 3 PASS and Gate 4 PASS.

This document **aligns and supersedes** the two overlapping “next step” briefs (Gate 2B completeness vs immediate Gate 3 redeploy). Both are valid; the **order** below is the authoritative CEO/CTO sequence.

---

## Verdict on the proposed plans

| Proposal | Correct? | Adjustment |
|----------|----------|------------|
| Gate 2A PASS = schema reconstructible | ✅ Yes | Closed |
| “37 tables ≠ complete system” → need Code↔DB audit (Gate 2B) | ✅ Yes | Keep, but **do not block** urgent Gate 3 deploy fixes |
| Redeploy first because Gate 3 failed on **live** app | ✅ Yes | **Immediate P0** |
| Clean `GMS_ADMIN_EMAILS` / prefer `app_metadata` | ✅ Yes | Immediate P0 |
| Gate 3 must be 100% PASS before Gate 4 | ✅ Yes | Hard gate |
| Do not restore broken `mypoz-full-2026-08-24.json` | ✅ Yes | Find real catalog source later |
| Run full Gate 2B (20-section mega-audit) **before** redeploy | ❌ Wrong order | Completeness audit is valuable but **parallel/secondary** to closing known live security gaps |
| Split “Gate 5 payment / Gate 6 inventory / Gate 7 concurrency” as separate from Gate 4 | ⚠️ Optional | Prefer **one Gate 4 Commerce+Integrity** with subsections; avoid gate inflation |
| Delete legacy JSON/demo now | ❌ Too early | Only after Gate 4 proves durable paths |
| Build more features now | ❌ No | Freeze features until certification |

**Core principle**

```text
Gate 2A proves:  migrations can create a valid empty schema
Gate 2B proves:  that schema matches what the code actually needs
Gate 3 proves:   the DEPLOYED app enforces auth/tenant isolation
Gate 4 proves:   money + inventory behave correctly under load
```

Counting tables alone never proves readiness. A **stale Vercel deploy** also never proves readiness — even if repo code is hardened.

---

## Current gate board

| Gate | Name | Status |
|------|------|--------|
| 1 | Initial DB reconstruction | ✅ PASS |
| 2A | Clean migration replay `0001→0026` | ✅ PASS |
| **2B** | Code ↔ DB ↔ API completeness (read-only audit) | ⏳ NEXT (can run **in parallel** with Step A) |
| **3** | Security / auth / tenant isolation (deployed) | ✅ **PASS** — see `GATE3_SECURITY_CERTIFICATION_FINAL.md` |
| 4 | Commerce + inventory + payment E2E | 🔒 Blocked on Gate 3 PASS |
| 5 | Backup / restore / DR | ⏳ After Gate 4 (or parallel once backup tooling fixed) |
| 6 | Client onboarding acceptance | ⏳ After Gate 4 |
| 7 | Legacy architecture elimination | ⏳ After Gate 4 (+ 2B findings classified) |
| 8 | Observability / ops / monitoring | ⏳ Before paying clients |
| 9 | Production smoke + final cert doc | ⏳ Last |

---

## Final sequence (do this in order)

### Phase A — Unblock Gate 3 (P0, do first)

**A1. Redeploy current repo to `mypoz-and-store-ui`**

Known live defects from Gate 3:

- `/api/returns` → HTML 404 (route missing on deploy)
- `/api/reports/summary` → HTML 404
- Cashier `GET /api/audit` → 200 (stale role gate)

After deploy, smoke:

```text
Unauthenticated GET /api/returns          → 401 (JSON)
Unauthenticated GET /api/reports/summary  → 401 (JSON)
Unauthenticated GET /api/audit            → 401 (JSON)
```

Not HTML 404.

**A2. Fix HQ elevation config**

Target model:

```text
GMS / Platform HQ  ←  app_metadata.role = gms_admin  (+ optional allowlist of PLATFORM operators only)
Tenant owner       ←  profiles.role = owner          (never GMS via email alone)
```

Actions:

1. Set Vercel `GMS_ADMIN_EMAILS` to **platform operators only** (not ordinary tenant owners).
2. Confirm HQ users have `app_metadata.role = gms_admin` in Supabase Auth.
3. Confirm tenant owners do **not** have `app_metadata.role = gms_admin`.
4. Never authorize on `user_metadata`.

**A3. Re-run Gate 3**

```powershell
$env:NODE_OPTIONS='--use-system-ca'
$env:GATE3_ANON_KEY='<anon key>'
$env:GATE3_TEST_PASSWORD='<temp test password>'
node scripts/gate3-security-cert.mjs
```

**Acceptance:** `gate3: PASS`, `criticalOrHighFails: 0`.

**A4. Rotate Gate 3 temporary Auth passwords** after PASS (or after abandoning the run). Do not commit secrets.

**A5. Repair local `.env.local` contract** (no secrets in chat/docs):

Required for local tooling:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_PASSWORD` (single correct DB password — current value looks concatenated/malformed)
- `GMS_ADMIN_EMAILS` (platform only)
- Payment / WhatsApp / Resend / AI as needed for the gates you run locally

---

### Phase B — Gate 2B Completeness (read-only; parallel with A or immediately after A1)

**Purpose:** Prove migrations + live schema + TypeScript + APIs + UI form one chain.

**Constraints:**

- DO NOT modify production business data
- DO NOT add speculative tables
- DO NOT declare VERIFIED without evidence
- Output docs only (unless a tiny test harness is required)

**Deliverables (required):**

1. `docs/MYPOZ_DATABASE_CODEBASE_COMPLETENESS.md` — master scorecard + answer to “is it one system?”
2. `docs/MYPOZ_API_INVENTORY.md`
3. `docs/MYPOZ_DATABASE_INVENTORY.md`
4. `docs/MYPOZ_TRANSACTION_MATRIX.md`
5. `docs/MYPOZ_STORAGE_SOURCE_OF_TRUTH.md`
6. `docs/MYPOZ_SCHEMA_DRIFT_REPORT.md`
7. `docs/MYPOZ_PRODUCTION_GAP_ANALYSIS.md` — findings classified P0/P1/P2/P3
8. Refresh (evidence-based only): `CURRENT_CODEBASE_MAP.md`, `AUTHORIZATION_COVERAGE.md`, `RLS_MATRIX.md`

**After 2B:** Bring the gap report back for triage. **Do not auto-fix everything.** Classify:

| Class | Meaning |
|-------|---------|
| 🔴 P0 | Security, money, inventory, tenant isolation, corruption — **before any client** |
| 🟠 P1 | Reporting, onboarding, billing, ops reliability — **before serious rollout** |
| 🟡 P2 | UX / automation / analytics — after first clients |
| 🔵 P3 | Future roadmap |

Only P0 (and agreed P1) block launch.

---

### Phase C — Gate 4 Commerce + Integrity (only after Gate 3 PASS)

Single gate with mandatory subsections (avoid inventing Gate 5–7 as separate blockers unless a subsection fails):

| Subsection | Scope |
|------------|--------|
| **4.1 POS** | Product → stock → sale → payment → receipt → ledger → report |
| **4.2 Void** | Permission, single stock restore, duplicate void safe |
| **4.3 Return / refund** | Qty caps, stock restore, refund caps, duplicates rejected |
| **4.4 Inventory** | Stocktake adjust, transfer A↔B, PO/GRN if in launch scope |
| **4.5 Storefront** | Server-resolved price/stock, COD + paid path |
| **4.6 Payments / webhooks** | Signature, idempotency (×2/×5/×10 concurrent), one stock decrement |
| **4.7 Concurrency** | Receipt uniqueness, last-unit stock, discount max-use |
| **4.8 Multi-tenant commerce** | A cannot touch B money/stock/orders |
| **4.9 Reporting** | Server totals match DB (not capped client aggregation) |

Output: `docs/COMMERCE_CERTIFICATION.md`

---

### Phase D — Data (only after Gate 3 + Gate 4)

1. **Do not** restore `data/backups/mypoz-full-2026-08-24.json` (unusable — see `BACKUP_RESTORE_ANALYSIS.md`).
2. Locate authoritative catalog source (Supabase PITR, old export, seed JSON, client CSV, etc.).
3. Controlled import plan (remap UUIDs / org IDs as needed).
4. Prefer clean demo seed for certification tenants if production catalog source is unclear.

---

### Phase E — Launch readiness

1. **Gate 5 — Backup/DR:** automated backup + **tested restore** (backup ≠ restore).
2. **Gate 6 — Client onboarding:** HQ create org → owner → branch → register → first sale without engineer intervention.
3. **Gate 7 — Legacy elimination:** remove `docStore` / JSON / demo fallbacks **only** after durable path certified.
4. **Gate 8 — Observability:** payment/webhook/stock/auth/DB failure alerts.
5. **Final:** `docs/MYPOZ_PRODUCTION_CERTIFICATION.md` with all gates PASS.

---

## Locked architecture (do not reopen)

```text
                    GMS PLATFORM HQ
                 (SaaS control plane)
              licences · fleet · support
                           │
              ┌────────────┴────────────┐
              │                         │
         Tenant A                   Tenant B
         MyPoz org                  MyPoz org
              │                         │
     POS · Storefront · Inventory · WhatsApp · Reports
              │                         │
              └────────────┬────────────┘
                           │
                  Supabase / PostgreSQL
                     RLS + RPC + audit
```

- **GMS** = platform operator (`app_metadata.gms_admin`).
- **Tenant owner** = full org capability, **not** platform HQ.
- Production truth = Postgres + RLS + transactional RPCs + typed repositories.
- Offline POS / dual JSON stores = deferred or test-only until explicitly certified.

---

## What NOT to do now

1. ❌ New features / “just one more module”
2. ❌ Blind catalog restore from the broken Aug 24 JSON
3. ❌ Declaring production-ready on Gate 2A alone
4. ❌ Deleting legacy storage before Gate 4 proves replacements
5. ❌ Inflating Gate 3 PASS while any CRITICAL/HIGH remains
6. ❌ Putting secrets in markdown, git, or chat

---

## Exact next commands for the agent (when you say “execute”)

```text
1. Redeploy mypoz-and-store-ui from current commit; smoke /api/returns, /api/reports/summary, /api/audit
2. Restrict GMS_ADMIN_EMAILS to platform operators; verify app_metadata for HQ users
3. Re-run scripts/gate3-security-cert.mjs until PASS
4. In parallel or next: Gate 2B completeness audit → docs listed above (read-only)
5. Triage 2B gaps into P0–P3; fix only P0/agreed P1
6. Gate 4 commerce certification
7. Catalog source discovery + controlled restore/seed
```

---

## One-line status

> **MyPoz is schema-certified (2A) and code-hardened in-repo, but not yet production-certified: live security Gate 3 is FAIL, completeness Gate 2B is pending, commerce Gate 4 is blocked, and catalog restore is forbidden until 3+4 pass.**

# Backup Restore Analysis

**Date:** 2026-08-25  
**Action:** Inspection only — **no restore performed**.

---

## 1. Backup structure

### `data/backups/mypoz-full-2026-08-24.json`

| Field | Value |
|-------|-------|
| Format | JSON object `{ exportedAt, host, tables }` |
| Size | **1,580 bytes** |
| Exported at | `2026-08-24T09:04:40.891Z` |
| Host claimed | `db.veavfkjgtkbnggukzjds.supabase.co` |
| Script | `scripts/full-backup.mjs` |

`tables` keys present: `organizations`, `branches`, `profiles`, `categories`, `products`, `product_variants`, `branch_stock`, `variant_branch_stock`, `sales`, `sale_lines`, `stock_documents`, `app_collections`, `app_documents`, `platform_settings`.

**Every table value is an error object**, not rows. Examples:

- `password authentication failed for user "postgres"`
- `CONNECT_TIMEOUT` to `db.*.supabase.co:5432`

### Other artifacts under `data/backups/`

| Artifact | Notes |
|----------|--------|
| `gate2a-pre-wipe-meta-2026-08-25.json` | Metadata only (counts/migrations), not a data dump |
| `gate2a-migration-manifest-*.json` + `gate2a-sql-*` | Migration SQL copies for replay certification |
| `gate3-security-results.json` | Security test evidence (not business data) |
| `shopping-station-2026-08-20T*` | Separate shopping-station export folders (not full MyPoz multi-tenant dump) |

---

## 2–16. Record counts from `mypoz-full-2026-08-24.json`

| # | Entity | Count in this file |
|---|--------|--------------------|
| 2 | Organizations | **Unavailable** (auth error) |
| 3 | Branches | Unavailable |
| 4 | Users/profiles | Unavailable |
| 5 | Products | Unavailable |
| 6 | Variants | Unavailable |
| 7 | Categories | Unavailable |
| 8 | Suppliers | Unavailable (not in dump list) |
| 9 | Customers | Unavailable (not in dump list) |
| 10 | Sales | Unavailable |
| 11 | Sale lines | Unavailable |
| 12 | Payments | Unavailable (not in dump list) |
| 13 | Stock records | Unavailable |
| 14 | Storefronts | Unavailable (not in dump list) |
| 15 | WhatsApp records | Unavailable (`app_documents` error) |
| 16 | Settings | Unavailable |

**Prior live inventory (pre–Gate 1 wipe, from MCP `list_tables` that day — not in this JSON file):** approximately 3 orgs, 1518 products, 7 sales, 2 storefronts. That live snapshot is **not** preserved in the Aug 24 JSON file that remains on disk.

---

## 17. Legacy / demo data

Cannot assess from this file (no rows). Security Gate 3 fixtures currently in DB are intentional test orgs (`tenant-a-sec`, `tenant-b-sec`, `hq-sec`) with 2 products — not production catalog.

---

## 18. UUID / FK validity after clean rebuild

N/A for this JSON (no rows). After Gate 2A replay:

- Auth users **survived** (`auth.users` not dropped with `public`)
- Public FKs were recreated empty; any restored rows must remap `org_id` / `branch_id` / `product_id` to **new** public IDs (or re-insert with explicit UUIDs matching a good dump)

Blind restore of an old dump into the new schema would fail or orphan without a controlled migration plan.

---

## 19. Schema incompatibilities

Cannot diff row shapes without data. Schema is now at migrations `0001→0026` (Gate 2A PASS). A good dump taken **before** 0024–0026 would need additive mapping for:

- `sale_returns` / `refunds` / `stocktakes` / `stock_transfers` / `shift_summaries` / `receipt_counters`
- Product commerce columns (`slug`, `compare_at_price`, `tags`, …)

---

## Critical finding

> **`mypoz-full-2026-08-24.json` is not a usable business backup.**  
> Same-day filename overwrite from `full-backup.mjs` (`mypoz-full-YYYY-MM-DD.json`) likely replaced an earlier successful export with a failed connection run.

### Recommendations before any restore attempt

1. Fix `SUPABASE_DB_PASSWORD` in local env (current value appears concatenated/malformed; direct Postgres auth fails).
2. Change backup naming to include **time** (`mypoz-full-YYYY-MM-DDTHHMMSSZ.json`) so failures cannot clobber successes.
3. Prefer Supabase Dashboard PITR / nightly backups for disaster recovery; verify a restore drill separately (Gate 5).
4. Treat catalog recovery as **controlled re-seed or selective import**, not blind JSON load.
5. Do **not** restore until Gate 3 PASS and Gate 4 PASS.

---

## Restore decision (deferred)

| Option | Status |
|--------|--------|
| A. Restore real business data from this JSON | **Impossible** — file has no rows |
| B. Seed clean demo/test data | Available after Gate 3+4 |
| C. Migrate selected production data | Requires a valid dump or Supabase backup |

**Current recommendation:** Option B or C after gates pass; **not A** from this file.

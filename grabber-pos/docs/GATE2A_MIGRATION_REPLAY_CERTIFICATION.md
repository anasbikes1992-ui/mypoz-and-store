# MyPoz Gate 2A — Migration Replay Certification

**Project:** `veavfkjgtkbnggukzjds`  
**Date:** 2026-08-25  
**Verdict:** **PASS**

## Acceptance criterion

> `0001 → 0026` must rebuild the database from zero with **ZERO manual intervention**.

**Met.** Second clean wipe + sequential `apply_migration` of each repo file verbatim. No mid-flight `DROP FUNCTION`, no hand-edited SQL, no skipped files.

## Procedure

1. Pre-wipe metadata saved: `data/backups/gate2a-pre-wipe-meta-2026-08-25.json`
2. `DROP SCHEMA public CASCADE` + recreate grants + clear `supabase_migrations.schema_migrations`
3. Apply 27 files in lexicographic order via Supabase MCP `apply_migration` (one at a time)
4. Independent verification SQL + `list_migrations`
5. Vitest: `migration-batch.test.ts` → **6/6 passed**

## First attempt (aborted)

Parallel `apply_migration` for `0015`/`0016` collided on `schema_migrations_pkey` (same timestamp version). **Not a SQL content failure.** Rewiped and restarted.

## Verification (independent)

| Metric | Value |
|--------|------:|
| Public tables | 37 |
| RLS enabled | 37 |
| Policies | 38 |
| Functions | 61 |
| Triggers | 7 |
| Foreign keys | 79 |
| Indexes | 85 |
| `void_sale` | present |
| `next_receipt_no` | present |
| `storefront_product` commerce fields | present |
| `whatsapp_create_order` uses `pending` | present |
| Migration history rows | 27 |

### Durable tables present

`receipt_counters`, `sale_returns`, `sale_return_lines`, `refunds`, `refund_lines`, `stocktakes`, `stocktake_lines`, `stock_transfers`, `stock_transfer_lines`, `shift_summaries`

### Migration history (names in order)

`0001_schema` … `0026_register_shift_summaries` (includes `0010_product_commerce` and `0010b_product_commerce_columns`)

## Replay blockers previously fixed (now proven)

| Migration | Prior failure | Fix in repo | Gate 2A |
|-----------|---------------|-------------|---------|
| `0010_product_commerce` | `42P13` cannot rename `p_size` → `p_page_size` | `DROP FUNCTION storefront_catalog(...)` before recreate | Applied cleanly |
| `0014_whatsapp_orders` | `'unpaid'` invalid for `commerce_payment_status` | `'pending'` | Applied cleanly |

## Explicit non-goals (deferred)

- Catalog / business data restore
- Gate 3 security certification (see FAIL status — redeploy required)
- Gate 4 commerce certification

## Gate status

Authoritative sequence: [`docs/MYPOZ_CERTIFICATION_ROADMAP.md`](./MYPOZ_CERTIFICATION_ROADMAP.md)

| Gate | Status |
|------|--------|
| Gate 1 — initial reconstruction | PASS (prior) |
| **Gate 2A — second clean one-shot replay** | **PASS** |
| Gate 2B — code↔DB completeness | NEXT (parallel with Gate 3 redeploy) |
| Gate 3 — security | FAIL — redeploy + GMS allowlist then re-run |
| Gate 4 — commerce | BLOCKED until Gate 3 PASS |
| Catalog restore | BLOCKED until 3+4 pass |

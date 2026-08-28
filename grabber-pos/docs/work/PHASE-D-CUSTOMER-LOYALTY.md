# Phase D — Customer + loyalty engine

**Master prompt:** `docs/MYPOZ_COMMERCIALIZATION_MASTER_PROMPT_V2.md`  
**Status:** IMPLEMENTED (operator verify pending)

Single customer identity via `app_collections` (`/customers`). Loyalty stays on existing `loyalty-ledger` + `customer.points`. Sales linked by **normalized mobile** on `sales.customer_mobile` (no `customer_id` on sales).

## Delivered

| Item | Path |
|------|------|
| Mobile normalization | `src/lib/commerce/customer-mobile.ts` |
| Profile aggregation | `src/lib/server/customer-profile.ts` |
| API | `GET /api/customers/[id]/profile` (tenant session) |
| UI | `/customers/[id]` — stats, channels, timeline, orders |
| List link | `/customers` → Profile column |
| Loyalty cross-link | `/loyalty` → customer profile |
| Tests | `customer-profile.test.ts` |

## Verify (Anaz pilot)

1. Ensure customer has mobile matching POS receipts.
2. POS sale with customer mobile → open `/customers` → **Profile**.
3. Profile shows lifetime spend, channel split (POS / online / WA), loyalty entries.
4. `/loyalty` entry links to same profile.

## Known limits

- Sales scan capped at **500** recent rows (`listSales`); stores with more history need a dedicated DB query (future).
- Match requires mobile on both customer row and sale; name-only linkage not implemented.

## Evidence

- [ ] Operator smoke on production
- [x] Unit tests pass
- [x] `requireTenantSession` on profile API

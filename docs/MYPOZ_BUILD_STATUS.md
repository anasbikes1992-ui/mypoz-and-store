# MyPoz Commerce Cloud — Build Status

Live tracker for the master roadmap implementation.

**Last updated:** 2026-08-17 (P0–P4 commerce loop)

---

## Phase 0 — Architecture freeze

| Task | Status |
|------|--------|
| Designate `grabber-pos/` as canonical app | ✅ Done |
| Document canonical systems | ✅ `MYPOZ_COMMERCE_ARCHITECTURE_V1.md` |
| Legacy compatibility policy | ✅ Documented |
| Build status tracker | ✅ This file |

---

## Phase 1 — Commerce core foundation

| Task | Status |
|------|--------|
| `sales.source` enum column | ✅ Migration `0009` |
| `sales.fulfillment_status` | ✅ Migration `0009` |
| `sales.payment_status` | ✅ Migration `0009` |
| `sales.channel` | ✅ Migration `0009` |
| Update `create_sale_internal` | ✅ Migration `0009` |
| Update `storefront_create_order` | ✅ Migration `0009` |
| TypeScript types + repo payload | ✅ |

---

## Phase 2 — Product system

| Task | Status |
|------|--------|
| `compare_at_price` | ✅ Migration `0010` |
| `tags[]` | ✅ Migration `0010` |
| SEO fields | ✅ Migration `0010` |
| `featured` flag | ✅ Migration `0010` |
| `online_status` | ✅ Migration `0010` |
| Storefront RPC returns new fields | ✅ Migration `0010` |

---

## Phase 3 — Product variants

| Task | Status |
|------|--------|
| `product_variants` table | ✅ Migration `0011` |
| `sale_lines.variant_id` | ✅ Migration `0011` |
| POS variant wiring | ✅ Product form matrix + POS picker (`0013` sale path) |
| Storefront variant selector | ✅ PDP option chips + cart `variantId` |

---

## Phase 4 — Collections engine

| Task | Status |
|------|--------|
| `store_collections` smart rules | ✅ Migration `0012` |
| Collections engine (TS) | ✅ `collections-engine.ts` |
| Smart collection evaluation | ✅ |
| Collection admin UI | 🔲 Basic via builder |

---

## Phase 5 — Theme engine

| Task | Status |
|------|--------|
| Six commerce themes | ✅ Existing |
| Theme pack format | ✅ `theme-pack.ts` |
| Design token system | ✅ Existing |
| Industry presets | ✅ Starter kits in theme-pack |

---

## Phase 6 — Blocks system

| Task | Status |
|------|--------|
| Block type registry | ✅ `blocks.ts` |
| Product page blocks schema | ✅ |
| Section block nesting | ✅ Schema support |

---

## Phase 7 — Visual store builder

| Task | Status |
|------|--------|
| Device preview (desktop/tablet/mobile) | ✅ Existing |
| Undo/redo | ✅ Existing |
| Navigation builder component | ✅ |
| Drag reorder sections | ✅ Existing |
| Block editor in builder | 🔲 Partial |

---

## Phase 8–12 — Checkout, delivery, orders

| Task | Status |
|------|--------|
| Dedicated `/cart` page | ✅ |
| Dedicated `/checkout` page | ✅ |
| Delivery fee engine | ✅ `delivery.ts` |
| COD fee / min / max enforcement | ✅ |
| Order list with status filters | ✅ |
| Order detail view | ✅ |
| Fulfillment transitions | ✅ `update_sale_fulfillment` + order actions |
| Variant stock on `create_sale` | ✅ Migration `0013` |

---

## Phase 13+ — Onboarding & launch

| Task | Status |
|------|--------|
| Merchant onboarding wizard | ✅ `/commerce/onboarding` |
| One-click store launch flow | ✅ In onboarding |
| Realtime / live online-order alerts | ✅ POS toast + poll; Supabase Realtime when configured |
| Domain verification workflow | 🔲 UI exists, verify job pending |
| Theme marketplace | 🔲 Future |
| SaaS billing | 🔲 Future |

---

## Verification

| Check | Status |
|-------|--------|
| TypeScript typecheck | ✅ Pass |
| Vitest | ✅ 79 tests |

---

## Next priorities

1. Domain DNS verification job (never show Connected until verified)
2. Customer identity unification (POS + online)
3. Media library on Supabase Storage
4. Discount codes / promotions
5. Theme engine expansion (industry packs) — after the commerce loop stays green

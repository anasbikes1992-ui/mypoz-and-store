# MyPoz Commerce Cloud — Build Status

Live tracker for the master roadmap implementation.

**Last updated:** 2026-08-19 (public storefront docs by slug + Shopping Station tenant)

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
| Storefront RPC returns new fields | ✅ Migration `0010` / columns via `0010b` on Anaz |

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
| Collections engine (TS) | ✅ `collections-engine.ts` |
| Smart collection evaluation | ✅ Storefront `[collectionSlug]` uses `filterCollectionProducts` |
| Collection admin UI | ✅ `/commerce/collections` |

---

## Phase 5–7 — Themes, blocks, builder

| Task | Status |
|------|--------|
| Six commerce themes | ✅ |
| Product page blocks | ✅ Builder toggles + PDP |
| Device preview / undo / publish | ✅ |

---

## Phase 8–12 — Checkout, delivery, orders

| Task | Status |
|------|--------|
| Cart + checkout | ✅ Coupon → `final_discount` on `create_sale` |
| Delivery + COD | ✅ Server-side `quoteDelivery` |
| Discount codes | ✅ POS + storefront, same collection |
| Card webhook discount | ✅ `0016` `storefront_create_order` + pending order payload |

---

## Phase 13+ — Launch

| Task | Status |
|------|--------|
| Onboarding / publish | ✅ |
| Domain DNS verify | ✅ Connected only after CNAME |
| Media library | ✅ Durable Storage + local fallback (`0016`) |
| Storefront → POS customer upsert | ✅ |
| Theme marketplace | 🔲 Future |
| SaaS billing | 🔲 Future |

---

## Jarvis / HQ / WhatsApp

| Task | Status |
|------|--------|
| Period sales, top/slow SKUs, demand hint | ✅ Same sales ledger |
| HQ backups (secrets redacted) | ✅ |
| Light/dark cookie | ✅ App chrome only |
| WhatsApp bot + webhook | ✅ Token / Live parked |

---

## Next-level ops (this pass)

| Task | Status |
|------|--------|
| Supabase Storage `media` bucket, org-prefixed RLS | ✅ `0016` |
| Channel split on `/reports`, `/commerce`, `/commerce/analytics` | ✅ `sales.source` |
| SEO: robots host, sitemap collections, JSON-LD escape | ✅ |
| Empty catalogue CTA | ✅ |
| Public storefront chrome by slug/host | ✅ `0017` `storefront_documents` + proxy headers |
| Shopping Station tenant | ✅ Org `shopping-station`, owner `stationshopping11@gmail.com` |

---

## Parked

1. SaaS billing
2. Theme marketplace
3. WhatsApp Live — `WHATSAPP_TOKEN` + numeric Phone number ID
4. Reviews / blog / BXGY (out of architecture MVP)

---

## Apply on Anaz

```
node --env-file=.env.local scripts/apply-sql.mjs supabase/migrations/0010b_product_commerce_columns.sql
node --env-file=.env.local scripts/apply-sql.mjs supabase/migrations/0016_media_and_storefront_discount.sql
node --env-file=.env.local scripts/apply-sql.mjs supabase/migrations/0017_storefront_public_documents.sql
```

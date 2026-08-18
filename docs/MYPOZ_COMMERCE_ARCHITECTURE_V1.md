# MyPoz Commerce Cloud — Architecture V1

**Status:** Frozen · **Date:** 2026-08-17  
**Canonical app:** `grabber-pos/` · **Mobile POS:** `grabber-pos-mobile/`

---

## Product vision

> **One MyPoz account → one POS → one online store → one inventory → one customer/order system → one commerce dashboard.**

MyPoz is **not** a greenfield Shopify clone. It is the evolution of Grabber POS Studio into a unified commerce operating system for Sri Lankan businesses.

---

## Architecture diagram

```text
                         MYPOZ COMMERCE CLOUD
                                  │
                ┌─────────────────┼─────────────────┐
                │                 │                 │
             MYPOZ POS       ONLINE STORE      COMMERCE HQ
                │                 │                 │
          ┌─────┴─────┐     ┌────┴─────┐      ┌────┴─────┐
          │           │     │          │      │          │
       Products    Stock  Website   Checkout Orders   Analytics
       Inventory   Sales  Themes    Payments  Customers Marketing
       Staff       Branches Pages   Delivery  Discounts Domains
          │           │     │          │      │          │
          └───────────┴─────┴──────────┴──────┴──────────┘
                              │
                         ONE COMMERCE ENGINE
                              │
                         SUPABASE / POSTGRES
```

---

## Canonical systems (source of truth)

| Domain | Source of truth | Notes |
|--------|-----------------|-------|
| Products | `products` | Never duplicate for web |
| Categories | `categories` | POS + storefront share |
| Inventory | `branch_stock` | Single stock ledger |
| Stock movements | `stock_movements` | Append-only audit |
| Sales | `sales` | POS + online orders |
| Sale lines | `sale_lines` | Includes variant_id when used |
| Payments | `payments` | Gateway + cash + bank |
| Store entity | `storefronts` | One per org |
| Commerce config | `app_documents['commerce']` | Draft + published JSON |
| Collections | `store_collections` + commerce JSON | Manual + smart rules |
| Variants | `product_variants` | POS + web share |
| Online order metadata | `storefront-orders` collection | Channel detail until fully on `sales` |
| Themes | Commerce theme system (`src/lib/commerce/themes.ts`) | Configuration, not executable code |
| Pages | Commerce page system in store config | Sections + blocks |
| Customers | Progressive unification | POS customers + storefront accounts → `customers` |

---

## Legacy compatibility path

Do **not** delete immediately:

- `/website` admin and `WebsiteConfig`
- Legacy theme presets (`classic`, `bold`)
- JSON collections in commerce document
- `storefront-orders` app collection

Migration path:

```text
LEGACY → COMPATIBILITY LAYER → CANONICAL COMMERCE
```

`publishStore()` continues syncing commerce → website for payment/fulfilment until website is fully deprecated.

---

## Non-negotiable rules

1. **Never duplicate inventory.** `branch_stock` is canonical.
2. **Never create a second product database.**
3. **Never create a second POS order ledger.** Use `sales` / `sale_lines` / `payments`.
4. **Themes are configuration**, not arbitrary executable merchant code.
5. **Tenant isolation** via `org_id` + RLS on every write.
6. **Public storefront never trusts client prices.** Server revalidates product, price, inventory, discount, delivery, tax.
7. **Demo mode is not production-safe** for concurrent paid selling.
8. **Payment credentials never enter client bundles.**
9. **Do not delete legacy systems** until migration is proven.
10. **Every published store must be reproducible** from its configuration document.

---

## Sale channel model (Phase 1)

`sales` gains:

| Column | Values |
|--------|--------|
| `source` | `POS`, `ONLINE_STORE`, `WHATSAPP`, `PHONE`, `OTHER` |
| `fulfillment_status` | `pending`, `processing`, `ready`, `shipped`, `delivered`, `collected`, `cancelled` |
| `payment_status` | `pending`, `paid`, `refunded`, `failed` |
| `channel` | Free text: `storefront`, `pos`, `whatsapp`, etc. |

Online orders created via `storefront_create_order` or `placeStorefrontOrder` stamp `source = ONLINE_STORE`.

---

## Product commerce model (Phase 2–3)

Extended `products` fields:

- `compare_at_price`, `tags[]`, `seo_title`, `seo_description`, `featured`, `online_status`

New `product_variants`:

- Per-variant SKU, barcode, price, cost, weight, image, stock (via `branch_stock` keyed by variant)

POS and storefront both resolve variants through the same tables.

---

## Theme engine (Phase 5–6)

```text
Theme
├── Metadata (id, version, industry)
├── Design Tokens (colors, fonts, radii, layout)
├── Templates (home, product, collection, cart, checkout, page)
├── Sections (announcement, hero, product_grid, …)
├── Blocks (product_image, price, variant_selector, …)
├── Presets (industry starter kits)
└── Settings (merchant overrides)
```

Themes live as TypeScript + JSON configuration in `src/lib/commerce/`. No Liquid interpreter. No arbitrary JS.

---

## Store builder (Phase 7)

```text
┌──────────────────────────────────────────────┐
│ Desktop | Tablet | Mobile | Preview | Publish│
├──────────┬─────────────────────┬─────────────┤
│ Sections │      PREVIEW        │  Settings   │
│ Blocks   │                     │             │
│ Add      │                     │             │
└──────────┴─────────────────────┴─────────────┘
```

Features: drag/reorder, undo/redo, autosave draft, publish, responsive preview.

---

## Checkout flow (Phase 10–11)

```text
/cart → /checkout → placeStorefrontOrder → sales (source=ONLINE_STORE)
```

Server calculates: subtotal, delivery fee, COD fee, free-delivery threshold. Client totals are discarded.

---

## Delivery engine (Phase 11)

Zones defined in commerce config:

```json
{ "name": "Colombo", "fee": 300 }
```

Rules applied server-side in `placeStorefrontOrder` and `storefront_create_order`.

---

## File map

| Area | Path |
|------|------|
| Commerce schema | `src/lib/commerce/schema.ts` |
| Theme tokens | `src/lib/commerce/themes.ts` |
| Theme packs | `src/lib/commerce/theme-pack.ts` |
| Blocks registry | `src/lib/commerce/blocks.ts` |
| Delivery calc | `src/lib/commerce/delivery.ts` |
| Collections engine | `src/lib/commerce/collections-engine.ts` |
| Store config I/O | `src/lib/server/commerce-store.ts` |
| Order placement | `src/lib/server/storefront-repo.ts` |
| Storefront UI | `src/components/commerce/storefront/` |
| Builder | `src/components/commerce/builder/` |
| Admin | `src/app/(app)/commerce/` |
| Public store | `src/app/store/[slug]/` |
| Migrations | `supabase/migrations/0009+` |

---

## MVP 1 scope (commercially usable)

- POS + inventory + products (existing)
- Online store + themes + builder + pages + collections
- Cart + checkout + online orders + payments + delivery
- Custom domain + SEO + analytics + WhatsApp links

Out of MVP 1: theme marketplace, SaaS billing, app extensions, AI agent, blog, reviews, BXGY promotions.

---

## Build order

See `MYPOZ_BUILD_STATUS.md` for live phase tracking.

```text
Phase 0  Architecture freeze
Phase 1  Commerce core (sales.source)
Phase 2  Product system
Phase 3  Variants
Phase 4  Collections
Phase 5  Theme engine
Phase 6  Blocks
Phase 7  Visual builder
Phase 8+ Checkout, delivery, orders, onboarding, …
```

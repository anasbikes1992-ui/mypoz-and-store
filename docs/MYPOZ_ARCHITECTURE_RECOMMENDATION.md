# MyPoz Architecture Recommendation

Based only on evidence in `D:\MyPoz & Store`. Do not rewrite working POS systems.

```
                    ┌─────────────────────────────────┐
                    │     MyPoz Commerce Cloud        │
                    │     (one Next.js app)           │
                    └─────────────────────────────────┘
                         │                    │
              Merchant UI │                    │ Public UI
         /pos /products   │                    │ /store/[slug]
         /commerce        │                    │
                         ▼                    ▼
              ┌──────────────────────────────────────┐
              │  Commerce API seam                   │
              │  getRepository / docStore / RPC      │
              └──────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
     Local JSON     Supabase       Flutter POS
     (demo)         Postgres+RLS   (same RPCs)
                    create_sale
                    storefront_*
```

---

## 1. Remain unchanged

- `create_sale` / `create_sale_internal` atomic inventory
- RLS `org_id = current_org_id()`
- Dual repository seam (demo JSON vs Supabase)
- POS terminals, verticals, register, stock documents
- Payment adapter interface (`PaymentAdapter`)
- Delivery / click-collect boards as fulfilment
- `/api/store/[slug]/order` server-side price rebuild
- Flutter app talking to the same RPCs

## 2. Extend

- `storefronts` + `app_documents['commerce']` as Store + theme/pages
- `online_visible` / slug / online_price already on products
- Website CMS payment/fulfilment flags as checkout policy
- Commerce builder as the merchant UX for presentation
- `sales` metadata or column for channel + fulfillment status
- Storefront events already in `commerce-events`

## 3. Refactor (carefully)

- Collapse dual homepage (`StorefrontClient` vs `HomeSections`) once builder is trusted
- Unify branding strings (Grabber vs MyPoz) without touching HQ operator product
- Cart storage key still `grabber-store-cart` — rename later with migration of localStorage
- Two customer stores: plan identity matching, do not delete POS customers

## 4. Replace

- **Do not replace** the POS sale engine with a new orders microservice
- **Do not replace** inventory with a Shopify-like location inventory clone
- Legacy `/website` can remain as “checkout & SEO settings” rather than the visual editor

## 5. Newly build (true gaps)

- Discount codes + server-side application at checkout
- Delivery/COD fee engine inside `placeStorefrontOrder`
- Domain DNS verify + SSL (workflow exists as copy only)
- Media library (folders, reuse) on Supabase Storage
- Variant matrix actually used at PDP and `create_sale`
- Notification bus (email/SMS/WhatsApp) with idempotent providers
- Signed preview URLs
- Locale switcher wired to `storeCopy`
- Customer match POS ↔ online

## 6. Do not build because it exists

- Second product database
- Second stock ledger
- New auth for staff (Supabase + demo already)
- New payment adapter framework
- New multi-tenant model
- Pixel-perfect Shopify Admin clone
- Executable third-party theme runtime

---

## Data migration (proposed, not run)

| Entity | Needed? | Reuse instead? | Complexity | Back-compat |
|---|---|---|---|---|
| Store | Low | `storefronts` + commerce JSON | Low | JSON already tenant-scoped |
| StoreDomain | Later | `storefronts.domain` | Low | Unique domain already |
| StoreThemeVersion | Later | `published` snapshot JSON | Low | Draft/published already |
| StorePage / Section | Later | JSON arrays in commerce doc | Medium if normalized | Keep JSON for MVP |
| store_collections | Optional | categories + JSON | Low if 0008 applied | Additive |
| sales.source | Recommended | JSON web orders | Low ALTER | Default `'POS'` |
| reserved_qty | Only if oversell remains | pending card path | Medium | Don’t break create_sale |
| discount_codes | Yes for spec | None | Medium | Additive table or app_collections |
| media | Yes for builder | image_url + uploads | Medium | Keep URLs |
| variants SQL | Only if POS variants go live | JSON unused by sales | High | Don’t break SKU uniqueness |

**0008_commerce_cloud.sql** is already in the repo (status/theme columns + `store_collections`). It is additive. **Do not apply in this discovery phase.** Confirm whether production projects have been pushed through 0007 first.

---

## Risk areas

1. **Demo JSON mode** is single-tenant, not for paid strangers.
2. **Service-role** lookups on `storefront-orders` must stay uniquely keyed (already documented in `storefront-orders-store.ts`).
3. **Card vs cash stock timing** — pending path exists; must stay the only card path.
4. **Shopper SHA-256 passwords** in demo storefront accounts are eval-only.
5. **Public event ingest** `/api/store/[slug]/events` is unauthenticated (spam/inflation).
6. **Folder name `MyPoz & Store`** breaks `npx` on Windows cmd (`&`).
7. **Google font Turbopack** errors observed under this path; admin still typechecks.
8. **Cross-tenant** is sound on SQL RLS; JSON `app_collections` relies on `org_id` default + RLS when Supabase is on — confirm 0005 policies in production.

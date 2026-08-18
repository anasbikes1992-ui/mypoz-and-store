# MyPoz Commerce Cloud — Gap Analysis

Compare **existing MyPoz (Grabber POS Studio in this workspace)** to the Commerce Cloud product spec.

Legend: **Reuse** = keep as-is. **Change** = extend existing. **New** = genuinely missing.

| Capability | Existing | Partial | Missing | Reuse | Change required | New build |
|---|---|---|---|---|---|---|
| Store entity | `storefronts` table + commerce JSON | status/theme/domain fields split across JSON and SQL | Full StoreSetting normalized model | Yes (`storefronts`) | Unify published status | No second store table |
| Storefront | `/store/[slug]` live catalog + cart | Custom domain as site root rewrite | Host middleware fully proven in this copy | Yes | Domain resolver in proxy | No greenfield shop |
| Themes | 4 CSS presets + 6 commerce themes | Visual hierarchy improved but still one React tree | Theme marketplace, versioned packages | Yes | Finish tokens per theme | Do not add executable themes |
| Theme engine | Zod schemas + section registry | No `theme.json` pack format | Isolated untrusted code | Yes | Schema validation tests | No Liquid engine |
| Store builder | `/commerce/builder` | Home sections only; pointer-events-none preview | Full page templates, nested menus editor, media picker | Yes | Deepen editor | Do not replace with Webflow clone |
| Pages | JSON pages + `/pages/[slug]` | Legal pages static-ish | Blog, custom HTML (sanitized) | Yes | CMS for remaining types | Blog later |
| Sections | 14 types | brand_logos unused; settings incomplete | App blocks / 3rd party | Yes | Complete settings UX | — |
| Navigation | JSON header/footer | Nested menus in schema, weak editor | — | Yes | Nav builder UI | — |
| Products | Canonical `products` | SEO fields limited; compare-at missing | Separate web catalog | **Must reuse** | online_visible defaults, images | **Do not duplicate** |
| Variants | JSON collection `/variants` | Not in `create_sale` or storefront PDP | SQL variant matrix | No as-is for web | Wire or promote to SQL | Only if POS variants become real |
| Collections | Categories + JSON collections | Not merchandising rules (e.g. under LKR 5000) | Smart collections | Categories yes | `store_collections` if 0008 applied | — |
| Inventory | `branch_stock` + `create_sale` atomic | No reservation qty column | Warehouse entity | **Must reuse** | Pending-sale path already for card | **Do not second stock** |
| Cart | localStorage + context | No server cart; no login merge | Durable guest cart table | Client cart OK for MVP | Merge + revalidate | Optional later |
| Checkout | Drawer, guest, COD/cash/card/bank | Not 6-step dedicated page; fees not computed | Taxes as first-class storefront | Reuse order API | Delivery fee + COD rules | Dedicated `/checkout` optional |
| Orders | `sales` + storefront-orders JSON | No `ONLINE_STORE` enum on `sales` | Shopify-like fulfillment FSM on SQL | **Reuse sales** | source + fulfillment status | Do not new orders table |
| Customers | POS collection + shopper accounts | Not unified identity | Matching rules | Both exist | Match on mobile/email | Do not two ledgers long-term |
| Payments | 5 gateway adapters + cash/bank | Keys NOT CONFIGURED here; card pending-sale exists | QR as own adapter | Reuse adapters | Env + webhook E2E | No new gateway framework |
| COD | Cash mode + config JSON | Fee/min/max/zones not enforced in `placeStorefrontOrder` | — | Partial | Enforce in order API | — |
| Delivery | Boards + fulfilment modes | Zones fees not in totals | Carrier APIs | Reuse boards | Fee engine | PickMe/Uber stay staff-booked |
| Discounts | Line max_discount, bill discount | No codes | Promo engine | POS discounts | Discount codes table/JSON | Spec promotions later |
| Promotions | — | — | BXGY, flash, bundles, schedule | — | — | New, post-MVP |
| SEO | metadata, OG, sitemap, robots, Product JSON-LD | Collection schema, per-page canonical everywhere | — | Yes | Fill gaps | — |
| Analytics | gtag/pixel + commerce-events JSON | Not warehouse-grade | Traffic source | Yes for MVP | — | Later warehouse |
| Domains | slug + `storefronts.domain` unique | DNS verify / SSL workflow UI only | Actual provisioner | Column exists | Verification job | Do not fake “active” |
| Localization | `name_local`; commerce i18n dict en/si/ta | No next-intl; no locale routes | Full catalog translation | Copy dict yes | Wire locale switcher | — |
| WhatsApp | wa.me links, templates, optional Cloud API invoices | Not a commerce channel | Official catalog sync | Keep deep links | — | Business API later |
| Media library | Disk uploads + image_url | No folders/search/reuse DB | Image variants/CDN | Upload routes | Storage bucket | Library UI |
| Notifications | WhatsApp invoice hook; no email/SMS bus | — | Event → channel abstraction | Partial | Notification port | Providers later |

---

## Inventory safety (POS + online)

**Can they share stock?** Yes, if durable mode + `create_sale` / `create_sale_internal` is the only decrement path.

Why:

- Quantity lives in `branch_stock`, not in the shopper client.
- RPC re-reads price and stock in one transaction.
- Storefront rebuilds lines from product id + qty (`0007_storefront.sql`, `storefront-repo.ts`).
- Card path defers decrement until webhook (`complete-pending-sale.ts`) — documented remaining risk if webhook skipped.

Demo JSON mode is **not** safe for concurrent multi-device paid selling (`docs/PRODUCTION.md`).

---

## Customer unification

**Today: no.** POS customers are `app_collections['customers']`. Online accounts are `storefront-customers`. Checkout stores `customer_name` / `customer_mobile` on `sales`. Matching by phone/email is possible but **not implemented** as a merge.

---

## Order source ONLINE_STORE

**Supported in practice** via JSON `storefront-orders` + delivery/click-collect `source: "storefront"`. **Not** a first-class `sales.source` column. Minimum change: add `source text default 'POS'` on `sales` **or** treat the web-order row as canonical channel (already listed in Commerce orders UI).

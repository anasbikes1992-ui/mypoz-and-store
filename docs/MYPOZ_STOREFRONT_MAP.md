# MyPoz Storefront Map

**App:** `grabber-pos` Next.js App Router  
**Public prefix:** `/store/[slug]` (also custom domain via `storefronts.domain` + `storefront_by_host`)  
**Admin:** `/website` (legacy CMS) and `/commerce` (Commerce Cloud UI)

---

## Public routes

| Route | Component | Data source | API | Database | Status |
|---|---|---|---|---|---|
| `/store/[slug]` | `HomeSections` + layout | `readPublishedStore()` + `getStorefrontCatalog` | storefront RPCs / local repo | `storefronts`, `products`, `branch_stock`, `app_documents` | WORKING |
| `/store/[slug]/products` | `CatalogView` | catalog | same | products | WORKING |
| `/store/[slug]/products/[productSlug]` | `ProductView` | `getStorefrontProduct` | `storefront_product` RPC | products.slug | WORKING |
| `/store/[slug]/collections` | collections index | categories + commerce.collections | catalog | categories | PARTIAL |
| `/store/[slug]/collections/[collectionSlug]` | `CatalogView` | filter by category slug | catalog | categories | PARTIAL (not SQL collections) |
| `/store/[slug]/search` | `CatalogView` | client filter + `ilike` RPC | `storefront_catalog` p_search | pg_trgm installed; search is ILIKE | PARTIAL |
| `/store/[slug]/pages/[pageSlug]` | `SectionView` | commerce pages JSON | `/api/commerce` (admin) | `app_documents['commerce']` | PARTIAL |
| `/store/[slug]/account` | `account/page.tsx` | storefront-customers-store | `/api/store/[slug]/auth`, `/orders` | `app_collections['storefront-customers']` | WORKING (demo auth) |
| `/store/[slug]/pay/success` | success page | query | gateway return | n/a | WORKING |
| `/store/[slug]/pay/cancel` | cancel page | query | gateway | n/a | WORKING |
| Cart | `cart.tsx` CartDrawer | `localStorage` `grabber-store-cart` | `/api/store/[slug]/order`, `/pay` | `sales` via RPC + storefront-orders | WORKING |
| Checkout | same drawer (steps cart → details → done) | website payment/fulfilment modes | order + pay routes | same | WORKING / PARTIAL vs multi-step spec |
| Wishlist | — | — | — | — | NOT FOUND |
| Reviews | — | — | — | — | NOT FOUND |
| Dedicated `/cart` or `/checkout` URL | — | drawer only | — | — | NOT FOUND as routes |
| Blog | — | — | — | — | NOT FOUND |

Layout chrome: `src/app/store/[slug]/layout.tsx` — header nav from commerce config, `CartProvider`, analytics tags, footer.

Tracker: `CommerceTracker` POST `/api/store/[slug]/events` → `app_collections['commerce-events']`.

---

## Storefront APIs

| API | Role | Auth |
|---|---|---|
| `GET /api/store/[slug]/catalog` | WhatsApp/CSV/JSON export | public |
| `POST /api/store/[slug]/order` | Place order (server prices) | public |
| `POST /api/store/[slug]/pay` | Start gateway checkout | public |
| `POST /api/store/[slug]/auth` | Shopper login/register | public |
| `GET /api/store/[slug]/orders` | Shopper order history | customer cookie |
| `GET /api/store/[slug]/feed/google` | Google product feed | public |
| `GET /api/store/[slug]/feed/meta` | Meta feed | public |
| `POST /api/store/[slug]/events` | Funnel events | public |
| `POST /api/payments/webhook/[provider]` | Gateway webhooks | signature |

`src/proxy.ts` treats `/store` and `/api/store` as public.

---

## Data resolution

```
host or slug
  → storefront_by_host / getStorefrontInfo
  → organization
  → branch_id (inventory location)
  → products where online_visible and is_active
  → theme + pages from published commerce doc (fallback: website CMS)
```

Tenant isolation: org comes from the storefront row, never from the shopper. Cross-shop catalog leak would require slug/domain collision (slug is unique).

---

## SEO (existing)

| Item | Status |
|---|---|
| `generateMetadata` on home + product | EXISTS |
| Open Graph | EXISTS on home/product |
| JSON-LD Store + Product | EXISTS |
| `src/app/sitemap.ts` | EXISTS (home, /products, product slugs) |
| `src/app/robots.ts` | EXISTS (`allow: /store/`) |
| Canonical helper | `storefront-url.ts` `canonicalFor` / `storeBaseUrl` |
| Collection schema | NOT FOUND |
| Twitter cards | PARTIAL (home originally; product OG images) |

---

## Admin storefront surfaces

| Route | Purpose | Status |
|---|---|---|
| `/website` | Theme preset, banners, SEO, payment/fulfilment toggles, WhatsApp templates | WORKING (legacy CMS) |
| `/commerce` | Overview, funnel, low stock, recent web orders | PARTIAL |
| `/commerce/builder` | Visual section editor, draft/publish | PARTIAL (home sections; not full DnD library) |
| `/commerce/themes` | Six theme picker | PARTIAL |
| `/commerce/orders` | Online order list | WORKING (reads storefront-orders) |
| `/commerce/pages` `/navigation` `/delivery` `/domains` `/analytics` | Mostly read-only views of JSON config | PARTIAL |

---

## Cart / checkout behaviour

- Guest checkout: yes.
- Server recomputes lines from product id + qty (`placeStorefrontOrder` / `storefront_create_order`).
- Card: pending sale until webhook (`complete-pending-sale.ts`).
- Cash / bank transfer: `create_sale` immediately; stock decrements.
- COD: modeled as cash payment mode, not a separate provider.
- Cart merge on login: NOT FOUND.
- Delivery fee calculation at checkout from zones: NOT FOUND in order API (config exists on commerce JSON only).

# MyPoz Theme Audit

## Does a theme engine exist?

**YES — two stacked systems, neither is a Shopify Liquid/OS 2.0 engine.**

Do not invent a third until these are reconciled.

---

## System A — Website CMS presets (original)

**Location:** `grabber-pos/src/lib/website.ts`, CSS in `grabber-pos/src/app/globals.css`

| Preset | CSS class | Nature |
|---|---|---|
| classic | `.theme-storefront-classic` | Token recolor |
| minimal | `.theme-storefront-minimal` | Token recolor |
| bold | `.theme-storefront-bold` | Token recolor + radial wash |
| local | `.theme-storefront-local` | Token recolor |

**Type:** configuration-driven CSS variables. Same layout, different colors.

**Configurable properties (Zod `websiteSchema`):** enabled, theme enum, announcement, banners[], hero headline/subline, about, SEO, socials, WhatsApp templates, paymentModes, fulfilmentModes, bank/pickup copy.

**Storage:** `app_documents` key `website` / `data/website.json` (`website-store.ts`).

**Admin:** `/website`.

**Screenshots/assets:** no theme screenshot pack in repo. Banners uploaded to `public/uploads/banners/`.

**Reusable sections:** not a section registry. Homepage was a single `StorefrontClient` (hero + search + grid). That client still exists at `src/app/store/[slug]/StorefrontClient.tsx` but home now renders Commerce `HomeSections`.

---

## System B — Commerce Cloud themes (added in this workspace)

**Location:** `grabber-pos/src/lib/commerce/themes.ts`, `schema.ts`, `defaults.ts`  
**CSS:** `.theme-mypoz-*` in `globals.css`

| Id | Name | Distinct layout intent | Card style | Hero |
|---|---|---|---|---|
| minimal | Minimal | Quiet, sharp | minimal | split |
| fashion | Fashion | Large photography | image-first | fullbleed |
| market | Market | Dense catalogue | dense | banner |
| food | Food | Order-first, pill radius | classic | stacked |
| luxury | Luxury | Editorial | luxury | fullbleed |
| local | Local Business | SME conversion | classic | stacked |

**Type:** schema-driven JSON (`StoreConfig`) + CSS tokens + React section renderer. **Not** executable merchant theme code.

**Storage:** `app_documents` key `commerce` (`commerce-store.ts`) with `draft` + `published` snapshots.

**Admin:** `/commerce/themes`, `/commerce/builder`.

**Section types:** announcement, hero, featured_collection, product_grid, image_text, promo_banner, testimonials, brand_logos, categories, newsletter, rich_text, video, spacer, trust.

**Pages:** default set includes home, products, collections, about, contact, shipping, returns, privacy, terms, faq.

**Builder:** `StoreBuilder.tsx` — left section list + reorder, center live `HomeSections` preview (actual components), right settings, Save draft / Publish. Device widths desktop/tablet/mobile. Undo/redo in session.

**Not a full theme engine yet:**

- No `theme.json` file pack / marketplace
- No isolated iframe storefront CSS per tenant beyond class on root
- Custom HTML section omitted (spec: trusted users only)
- Brand logos section is a no-op renderer
- Preview URL is not a signed secret URL; builder preview is in-admin
- 0008 SQL `theme_id` on `storefronts` is not the runtime source of truth (JSON doc is)

Legacy mapping: `classic` → `minimal`, `bold` → `fashion` (`canonicalThemeId`).

---

## Design system (admin / POS)

Reusable for Commerce **admin**, not automatically for storefront:

- `src/components/ui/Button.tsx`
- `src/components/ui/EmptyState.tsx` (SkeletonRows)
- `src/components/ui/StatCard.tsx`
- `src/components/shell/ModuleHeader.tsx`, `TopBar.tsx`
- Tokens: `--accent`, `--surface-*`, `--text-*`, `--line` in `globals.css`
- Fonts: Plus Jakarta Sans, JetBrains Mono (`src/app/layout.tsx`)
- Currency: `formatMoney` (LKR, `en-LK`)

Storefront product cards live in `src/components/commerce/storefront/HomeSections.tsx` (`ProductCard`), separate from POS tiles (`Launcher.tsx`).

---

## Recommendation (no implementation in this phase)

Keep System B as the storefront presentation layer. Keep System A as the checkout-mode/WhatsApp/SEO settings bridge (`publishStore` already syncs a subset into `website`). Do not replace POS chrome with storefront tokens.

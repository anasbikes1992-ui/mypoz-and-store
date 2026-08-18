# MyPoz Phase 1 Recommendation

Smallest safe path to:

**MyPoz POS + MyPoz Online Store** on the existing architecture.

Do not start a second catalogue. Do not rewrite `create_sale`.

---

## Goal (merchant, < 10 minutes)

1. Log into MyPoz  
2. Products already in POS appear online (`online_visible`)  
3. Pick a theme  
4. Change name / announcement / color via builder  
5. Publish  
6. Open `/store/<slug>`  
7. Add to cart, checkout (COD/cash or configured gateway)  
8. See order in `/commerce/orders` and Click & collect or Delivery  
9. Stock drops via the same RPC as a POS sale  

This is already **mostly assembled**. Phase 1 is hardening and closing the last holes, not a greenfield build.

---

## Sequence

### P1.0 — Freeze POS core

Leave untouched: `/pos`, `create_sale`, RLS, register, stock documents, Flutter RPCs.

### P1.1 — Publish path (presentation)

- Treat `app_documents['commerce']` draft/published as the live theme.
- Keep `website` in sync for payment/fulfilment (already in `publishStore`).
- Default new orgs: `online_visible = true` for existing catalog **or** a one-click “publish all to web” in products UI (does not exist yet — smallest change).

### P1.2 — Checkout money that matches the spec

Inside `placeStorefrontOrder` only:

- Apply delivery zone fee + free threshold from commerce JSON  
- Apply COD fee / min / max if enabled  
- Revalidate stock and price (already)  
- Do not trust client totals (already)

### P1.3 — Channel visibility

- List web orders in Commerce (exists)  
- Optionally stamp `source: storefront` onto sale metadata without breaking receipts  

### P1.4 — Safety

- Require Supabase for any paid tenant  
- Keep card on pending-sale + webhook  
- Do not mark custom domains active without DNS verify  

### P1.5 — Explicitly out of Phase 1

Theme marketplace, subscriptions, WhatsApp Business API, blog, reviews, wishlist, BXGY, full i18n routing, app marketplace, variant SQL, media DAM.

---

## Files that would eventually change (do not modify in discovery)

Presentation / store:

- `src/lib/commerce/*`
- `src/lib/server/commerce-store.ts`
- `src/lib/server/storefront-repo.ts` (`placeStorefrontOrder`)
- `src/app/store/[slug]/**`
- `src/components/commerce/**`
- `src/app/(app)/commerce/**`
- `src/app/api/commerce/**`
- `src/app/globals.css` (theme tokens)
- `src/lib/website.ts` (checkout modes)
- `src/lib/modules.ts` / `src/lib/plans.ts` (launcher gating)

Inventory / orders (minimal, if at all):

- `src/lib/server/complete-pending-sale.ts`
- `supabase/migrations/0008_commerce_cloud.sql` (apply only after 0007 on the target project)
- optional new migration for `sales.source` — **not written in this phase**

Do **not** modify for Phase 1:

- `src/lib/server/repositories/supabase.ts` sale posting logic beyond metadata
- Flutter `create_sale` payload shape
- `0001`–`0003` core schema/RLS
- Payment adapter signatures

---

## Definition of done

A Sri Lankan SME owner can publish a store from POS products without a developer, and an online COD order decrements the same `branch_stock` row a walk-in sale would.

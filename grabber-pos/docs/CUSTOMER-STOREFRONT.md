# Customer storefront — shop owner guide

How to configure and run your **public online shop** on GRABBER POS Studio. The
shop shares the same catalog and stock as the POS; orders show up on Click &
collect or Delivery for your staff.

GMS / reseller context: [GMS-OPERATIONS.md](GMS-OPERATIONS.md),
[RESELLER-GUIDE.md](RESELLER-GUIDE.md).

---

## Big picture

| Piece | Where |
|-------|--------|
| Public shop | `/store/<slug>` (seeded demo slug is often `main-store`) |
| Website CMS | Launcher → **Website** (`/website`) |
| Catalog visibility | Products marked **online visible** (and priced for web) |
| Customer account | `/store/<slug>/account` |
| Staff fulfilment | **Click & collect** and **Delivery** boards |
| Feeds / catalog export | Website → Catalog & feeds, or Marketing |

Enable the store in **Website** (synced with Settings → store enabled). If the
store is off, the public URL will not take orders.

---

## Website CMS (`/website`)

Configure once, then preview `/store/<slug>`.

### Themes

Four presets: **Classic**, **Minimal**, **Bold**, **Local**. They change
storefront tokens (colors/typography) via CSS classes — not a full Shopify
theme editor.

### Banners & hero

- Multi-banner images (upload to banners storage; keep alt text).
- Optional announcement bar, hero headline / subline, about text, OG image for
  social previews.

### SEO & social

- SEO title and description.
- Facebook, Instagram, Twitter/X, TikTok links.
- WhatsApp number plus message templates (`{{business}}`, `{{items}}`,
  `{{total}}`, `{{catalogUrl}}`).

### Checkout & fulfilment toggles

Turn on only the modes you actually support:

**Payment**

| Mode | Meaning |
|------|---------|
| Cash | Pay on pickup / delivery |
| Card | Card on delivery / pickup (staff takes payment — not a live card gateway) |
| Bank transfer | Customer pays via your instructions and enters a reference |

**Fulfilment**

| Mode | Lands on | Meaning |
|------|----------|---------|
| Pickup | Click & collect | Customer collects; show pickup instructions |
| Courier | Delivery | Your courier / staff delivery |
| PickMe | Delivery | Staff books PickMe (no live API yet) |
| Uber | Delivery | Staff books Uber (no live API yet) |

Fill in **bank transfer instructions** and **pickup instructions** so checkout
copy stays accurate.

---

## Catalog for the web

1. Mark products **online visible** (and set online price / description / slug
   where you use them).
2. Keep POS stock correct — the shop reads live availability.
3. Export when needed from Website → Catalog & feeds:
   - WhatsApp catalog **CSV** / **JSON** — download for sharing; not full Meta
     Commerce API sync.
   - **Meta** and **Google** product feeds for ads (online-visible items with
     images and product links).

Only list what you can fulfil. Stale web prices confuse customers and staff.

---

## Checkout (shopper experience)

Guest checkout works without an account. At checkout the shopper chooses:

- Allowed **payment** and **fulfilment** modes.
- Address (required when not pickup).
- Payment reference when using bank transfer.
- Pickup note when collecting.

Orders are written into the POS sale flow with payment/fulfilment metadata and
queued on the right ops board. Staff progress status (new → preparing →
ready/out → done) on **Click & collect** or **Delivery**.

---

## Customer accounts

At `/store/<slug>/account`:

- **Email + password** register / login (primary).
- **Magic link** as an alternate when Supabase Auth is configured.
- **Order history** for signed-in customers.
- Demo / local builds may use a simple cookie fallback — production should use
  real Auth.

Guests can still check out; accounts are for repeat buyers and history.

---

## Staff workflow after a web order

1. Watch **Click & collect** for pickup orders.
2. Watch **Delivery** for courier / PickMe / Uber — book the ride or assign a
   driver as you already do for phone orders.
3. Confirm bank transfers against the reference before marking paid / releasing
   goods.
4. Use WhatsApp templates from Website if you message customers manually.

---

## Do's

- **Do** keep the Website CMS and product `online_visible` flags in sync with
  what you can stock and deliver.
- **Do** enable only payment/fulfilment modes your team can honour today.
- **Do** write clear bank and pickup instructions.
- **Do** train floor staff on the Click & collect and Delivery boards for web
  orders.
- **Do** re-export feeds after big catalog or price changes.
- **Do** use a production Supabase deployment for a live shop (not demo JSON).

## Don'ts

- **Don't** treat demo mode as a live store — no durable multi-tenant backup.
- **Don't** claim live PayHere / card capture or automatic PickMe/Uber booking;
  staff confirm those workflows.
- **Don't** put every POS SKU online if you cannot pick or deliver it.
- **Don't** share your POS staff logins with customers — use storefront account
  pages for shoppers.
- **Don't** expect Liquid themes, an app store, or full Shopify DTC parity —
  this is a POS-connected shop, not a replacement for complex Shopify builds.
- **Don't** turn the store on before printers, licence, and stock are ready for
  real orders.

---

## Quick checklist

- [ ] Website enabled; theme and banners look right on `/store/<slug>`
- [ ] Payment + fulfilment modes match ops reality
- [ ] Bank / pickup instructions filled in
- [ ] Online-visible catalog spot-checked
- [ ] Test order appears on Click & collect or Delivery
- [ ] Customer account login + order history smoke-tested (if offering accounts)
- [ ] Catalog CSV / Meta / Google feeds downloaded or URL-saved for ads

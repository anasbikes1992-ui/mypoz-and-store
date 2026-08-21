# Meta Commerce catalog feed (ops)

MyPoz **exports** the live POS/online catalog. WhatsApp **bot menus** always
read POS stock directly. Meta Commerce catalog is filled by CSV upload **or**
the Graph `items_batch` sync script.

## Export from Anaz Store

| Format | URL |
|--------|-----|
| CSV (Meta-style) | `https://mypoz-and-store-ui.vercel.app/api/store/anaz-store/catalog?format=csv` |
| JSON (full catalog) | `https://mypoz-and-store-ui.vercel.app/api/store/anaz-store/catalog?format=json` |
| Meta feed CSV | `https://mypoz-and-store-ui.vercel.app/api/store/anaz-store/feed/meta` |

JSON includes `total` + all online_visible products (paginated server-side).

Local smoke:

```bash
node scripts/whatsapp-smoke.mjs
```

## Push to Meta via API

Catalog created for Anaz: **Anaz Store MyPoz** (`1397856035621959`).

```bash
# from grabber-pos/ with WHATSAPP_TOKEN + WHATSAPP_APP_SECRET set
node scripts/sync-meta-catalog.mjs
# or explicit:
node scripts/sync-meta-catalog.mjs 1397856035621959 "https://mypoz-and-store-ui.vercel.app/api/store/anaz-store/catalog?format=json"
```

Then in **Meta WhatsApp Manager → Catalog**, connect **Anaz Store MyPoz**
to the GRABBER.LK number (API link to SMB WABA may be blocked — use UI).

### Phone shows no products?

| Check | What you should see |
|-------|---------------------|
| Feed JSON | `total` ≈ store online products (Anaz ~1518) |
| Meta catalog `product_count` | Anaz Store MyPoz ≈ 1518 (Eligible in Commerce Manager) |
| WhatsApp app catalog | **Only after** Manager links **one** catalog ↔ WABA/phone |

### Error: “WABA should have maximum one product catalogue”

Meta allows **exactly one** catalog per WhatsApp Business Account (GRABBER.LK).

**Do not** keep clicking **Connect Catalogue** while that error shows — it means a
catalog is already attached (or a stale link remains).

1. Click **OK** → **Cancel** (close the Connect modal).
2. On **WhatsApp Manager → Catalogue** (phone **+94 77 959 2288**), look at the
   page **without** the modal:
   - If you see **Disconnect** / **Manage** → a catalog is already linked.
     Open **Manage** → confirm it is **Anaz Store MyPoz**. If it is, stop —
     enable the chat-header / basket toggles and test the phone.
   - If **Manage** shows the empty **WhatsApp Product Catalog** → **Disconnect**,
     then connect **Anaz Store MyPoz** once.
3. If you already **Removed** the empty catalog in Business Settings but Connect
   still fails: refresh, wait a few minutes, try again. SMB WABAs **cannot** be
   fixed via Graph API (`(#10) … SMB business type`) — only the Manager UI (or
   Meta support) can clear a stuck link.
4. Pixel / datasets / Advantage+ “Connect tracking” are **ads** steps — skip them
   for WhatsApp shopping.

### Phone catalog connected but still empty in WhatsApp app

If Catalog manager says **connected to Anaz Store MyPoz** but “contains no
products”, Meta may take **up to 24 hours** to mirror items into WhatsApp.
Commerce Manager can already show ~1518 while the phone UI is empty.

- **Ignore** Events → “catalogue match rate 0%” (ads/pixel only).
- Do **not** re-import into MyPoz POS to “fix” the phone shop.
- Re-check WhatsApp Catalog manager after the wait; use bot **2 · View menu**
  for live stock in the meantime.

## Manual CSV upload (fallback)

1. Meta Business Suite → Commerce → Catalog (or WhatsApp → Catalog).
2. Add items → Upload → CSV from the export URL above.
3. Map columns: `id`, `title`, `description`, `availability`, `condition`,
   `price`, `link`, `image_link`, `brand`, `product_type`.
4. Re-run sync / re-upload after bulk POS imports.

## Domain + logo (storefront)

1. **Logo** — Commerce builder → theme tokens `logoUrl`, or HQ/tenant brand
   `logoUrl`.
2. **Custom domain** — Commerce → Domains on `mypoz-and-store-ui.vercel.app`.
3. Storefront: `/store/anaz-store`.

## Related env (Vercel)

- `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`
- Attach phone id on `/hq/whatsapp` (Anaz)
- Optional: `META_PRODUCT_CATALOG_ID=1397856035621959`

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
| Meta catalog `product_count` | Often caps ~1000 on SMB catalogs after sync |
| WhatsApp app catalog | **Only after** Manager links catalog ↔ phone number |

Bot path **2 · View menu** always reads POS (independent of Meta). If customers
expect the WhatsApp shopping catalog UI, complete the Manager link step —
MyPoz cannot attach catalogs to SMB WABAs via Graph API alone.

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

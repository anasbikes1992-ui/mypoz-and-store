# Meta Commerce catalog feed (ops)

MyPoz does **not** auto-push products into Meta Commerce Manager.
The WhatsApp **bot menu** reads live POS stock. Meta’s product catalog is a
separate CSV/feed upload.

## Export from Anaz Store

| Format | URL |
|--------|-----|
| CSV (Meta-style) | `https://mypoz-and-store-ui.vercel.app/api/store/anaz-store/catalog?format=csv` |
| JSON | `https://mypoz-and-store-ui.vercel.app/api/store/anaz-store/catalog?format=json` |

Local smoke:

```bash
node scripts/whatsapp-smoke.mjs
```

## Upload to Meta

1. Meta Business Suite → Commerce → Catalog (or WhatsApp → Catalog).
2. Add items → Upload → CSV.
3. Map columns: `id`, `title`, `description`, `availability`, `condition`,
   `price`, `link`, `image_link`, `brand`, `product_type`.
4. Re-export and re-upload when prices or stock change in bulk (or after a
   full Shopping Station import).

## Domain + logo (storefront)

1. **Logo** — Commerce builder → theme tokens `logoUrl`, or HQ/tenant brand
   `logoUrl`. Until a custom asset exists, the market theme uses the store
   initial + Shopping Station red (`#c81e1e`).
2. **Custom domain** — Commerce → Domains: point DNS CNAME to Vercel, then
   add the host on the storefront row (`custom_domain` / domain field).
3. Keep public URL working: `/store/anaz-store` on
   `mypoz-and-store-ui.vercel.app`.

## Related env (Vercel)

Required for Cloud API send/receive (not for CSV export):

- `WHATSAPP_TOKEN` — **still required if missing**
- `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`
- Attach phone id to tenant on `/hq/whatsapp` (Anaz org)

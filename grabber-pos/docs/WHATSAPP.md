# WhatsApp (Cloud API) — MyPoz

Official Meta WhatsApp Cloud API only — no unofficial “multi-device” bridges.

HQ UI: `/hq/whatsapp` · Merchant UI: `/whatsapp` · Webhook: `/api/whatsapp/webhook`

---

## Meta apps (important)

You have two Meta apps:

| App | App ID | WhatsApp product? | Use for MyPoz? |
|-----|--------|-------------------|----------------|
| **GRABBER** | `622249256393200` | Yes | **Yes** — configure webhook + tokens here |
| GRABBER MYPOZ & STORE | `1123725073323539` | No (not set up) | Do not use for WA until you add WhatsApp |

Both are still in **Development** mode → only allowlisted test numbers can message.
Switch to **Live** + complete Business verification when ready for customers.

### Wire webhook (GRABBER app)

1. WhatsApp → Configuration → Callback URL:
   `https://mypoz-and-store-ui.vercel.app/api/whatsapp/webhook`
2. Verify token = same string as Vercel `WHATSAPP_VERIFY_TOKEN`
3. Subscribe to **messages**
4. Copy **Phone number ID** → `WHATSAPP_PHONE_NUMBER_ID`
5. Copy **App Secret** (App settings → Basic) → `WHATSAPP_APP_SECRET`
6. Create a permanent access token / system user token → `WHATSAPP_TOKEN`
   (this is the var still missing on Vercel if you only set phone/secret/verify)

### Vercel env hygiene

- Keep: Supabase trio, `NEXT_PUBLIC_APP_URL`, `GMS_ADMIN_EMAILS`, WhatsApp four, `OPENAI_API_KEY`
- Remove from Vercel (local scripts only): `UPSERT_ADMIN_PASSWORD`, `UPSERT_ADMIN_EMAIL`, `GMS_ADMIN_PASSWORD` (unused by app)

---

## Features shipped

- Inbound webhook (verify + signed POST)
- Numbered text bot (en / si / ta): order, menu, offers, location, track, staff
- Orders into sales ledger (`source = WHATSAPP`) when migration `0014` + service role are live
- Inbox persistence + HQ attach/detach per org phone number id
- POS invoice PDF send via WhatsApp
- Storefront `wa.me` links / catalog CSV export for Meta upload

## Env (Vercel)

```
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=          # required in production (HMAC)
WHATSAPP_API_VERSION=v21.0    # optional
SUPABASE_SERVICE_ROLE_KEY=    # tenant resolve + order RPC
```

Per-tenant overrides live in `app_documents` key `whatsapp` (phoneNumberId, accessToken, locale, …).

## Operator go-live

1. Apply migration `0014_whatsapp_orders.sql` (already in MyPoz project if migrations synced).
2. Set all `WHATSAPP_*` on Vercel; redeploy.
3. Meta app callback: `https://<host>/api/whatsapp/webhook` with `WHATSAPP_VERIFY_TOKEN`.
4. Subscribe to `messages`.
5. HQ → attach each tenant’s **phone number id**.
6. Merchant → set locale / location / offers.
7. Test: send `hi` → menu; place order → sale appears; POS invoice send.

## Known limits (honest)

- Staff “talk to human” flags inbox only — no in-app compose yet (reply in WA Business).
- Greeting / staffNotify settings partially unused by the bot.
- Free-form messages may fail outside the 24h customer-care window without **approved templates**.
- Invoice send uses platform env token (not always per-org token).
- Treat fleet WhatsApp as **beta** until templates + staff reply land.

## Docs hub

Linked from HQ docs nav (`docs/WHATSAPP.md`). See also [HQ-PLAYBOOK.md](HQ-PLAYBOOK.md).

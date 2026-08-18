# WhatsApp Cloud API (inside MyPoz)

Official **WhatsApp Business Cloud API** only. Unofficial WhatsApp libraries are out of scope.

Whats App Auto was a standalone Next + Prisma app. Its **bot, E.164 phones, EN/SI/TA greeting, webhook, and merchant settings** are ported into `grabber-pos`. There is no nested copy of that repo.

## Platform vs client

| Layer | Keys | UI |
|---|---|---|
| MyPoz HQ | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, optional `WHATSAPP_API_VERSION` | `/hq/whatsapp` |
| Client org | `phoneNumberId`, optional `accessToken`, `verifyToken`, `locale`, location/offers copy | `/whatsapp` |

Webhook (public, on `PUBLIC_PATHS`):

- **GET** `/api/whatsapp/webhook` — Meta hub challenge
- **POST** `/api/whatsapp/webhook` — HMAC SHA256 (`X-Hub-Signature-256`) when `WHATSAPP_APP_SECRET` is set

Live host: `https://mypoz-and-store.vercel.app`. **Do not** put `/welcome` in App domains or the webhook callback.

### Meta Developer app (GRABBER) field map

| Meta field | Value |
|---|---|
| App domains | `mypoz-and-store.vercel.app` (host only, no `https://`, no path) |
| Site URL / Facebook Login | `https://mypoz-and-store.vercel.app/welcome` |
| Privacy policy URL | `https://mypoz-and-store.vercel.app/privacy-policy` |
| Terms of Service URL | `https://mypoz-and-store.vercel.app/terms-of-service` |
| Data deletion instructions URL | `https://mypoz-and-store.vercel.app/data-deletion` |
| WhatsApp → Configuration → Callback URL | `https://mypoz-and-store.vercel.app/api/whatsapp/webhook` |
| WhatsApp verify token | same as Vercel `WHATSAPP_VERIFY_TOKEN` |
| App secret | Vercel `WHATSAPP_APP_SECRET` (never commit; rotate if it was on screen) |
| Permanent token + Phone number ID | WhatsApp → API Setup → Vercel `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` |

Subscribe the webhook to **messages**. App Mode can stay Development until the WABA is approved; only test numbers receive events in Development.

Inbound messages are routed by `metadata.phone_number_id` to the matching org (`whatsapp_resolve_org` in migration `0014`).

## Bot menu

1. Order (categories from the same product catalogue)  
2. View menu  
3. Offers  
4. Location  
5. Track order  
6. Talk to staff  

Languages: English, Sinhala, Tamil (`src/lib/whatsapp/i18n.ts`). Shoppers can send `si` / `ta` / `en`.

Checkout calls `whatsapp_create_order` → `create_sale_internal` with `source = WHATSAPP`. Stock is the same `branch_stock` as POS. The **bot menu lists live inventory** (qty or out of stock) as WhatsApp text — this is **not** Meta Commerce Catalog / WhatsApp product cards. If posting fails, a POS hold is created.

HQ `/hq/whatsapp` attaches each shop’s Cloud API number. Pitch-to-owners copy lives on that page; outbound HQ broadcasting waits until you add the Cloud API token.

## Code map

| Path | Role |
|---|---|
| `src/lib/whatsapp/menu.ts` | State machine |
| `src/lib/whatsapp/bot.ts` | Persist + send |
| `src/lib/whatsapp/phone.ts` | `+94` E.164 |
| `src/lib/whatsapp/signature.ts` | Webhook HMAC |
| `src/lib/server/whatsapp.ts` | Graph send (text + invoice PDF) |
| `src/lib/server/whatsapp-durable.ts` | Service-role org, fleet, sale RPC |
| `src/app/api/whatsapp/webhook/route.ts` | Meta callback |

Fulfillment status on commerce orders best-effort texts the customer (`notifyWhatsAppOrderStatus`).

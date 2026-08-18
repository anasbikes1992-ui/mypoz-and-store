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

Inbound messages are routed by `metadata.phone_number_id` to the matching org (`whatsapp_resolve_org` in migration `0014`).

## Bot menu

1. Order (categories from the same product catalogue)  
2. View menu  
3. Offers  
4. Location  
5. Track order  
6. Talk to staff  

Languages: English, Sinhala, Tamil (`src/lib/whatsapp/i18n.ts`). Shoppers can send `si` / `ta` / `en`.

Checkout calls `whatsapp_create_order` → `create_sale_internal` with `source = WHATSAPP`. Stock is the same `branch_stock` as POS. If posting fails, a POS hold is created.

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

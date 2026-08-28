# Phase E — WhatsApp ops depth

**Status:** IMPLEMENTED (operator smoke pending)

## Delivered

| Item | Path |
|------|------|
| Inbox UI + staff reply | `/whatsapp`, `inbox/route.ts` |
| Structured WA orders → `create_sale` | `bot.ts`, `whatsapp-durable.ts` |
| Sale linkage in thread | `lastSaleId` → `/commerce/orders` |
| Inbox polling (30s) | `whatsapp/page.tsx` |

## Verify

1. Customer messages appear in inbox.
2. Bot checkout creates sale with `source: WHATSAPP`.
3. Thread shows last order id with link.

# 06 — WhatsApp v1

**Status:** PASS WITH NOTES — 2026-08-27  
**Rule:** Harden existing WA (do not replace). Same Supabase + `org_id`.

## Shipped

- **12 event automations** (`src/lib/whatsapp/event-automations.ts`): ORDER_CREATED, ORDER_PROCESSING, ORDER_READY, ORDER_SHIPPED, ORDER_COMPLETED, ORDER_CANCELLED, PAYMENT_RECEIVED, SALE_COMPLETED, REFUND_ISSUED, LOW_STOCK, STAFF_HANDOFF, OPT_OUT_ACK
- **Dispatcher** `dispatchWhatsAppEvent` / `dispatchFulfillmentWhatsApp` — respects `enabledEvents` + opt-out; never blocks commerce; unknown/pending statuses do **not** falsely ping ORDER_READY
- **Wired:** storefront `ORDER_CREATED`; fulfill → mapped status events (via `notifyWhatsAppOrderStatus`)
- **Webhook:** signature hard in prod; idempotency by `waMessageId`; Meta **delivery statuses** persisted on message rows
- **Opt-out:** STOP/UNSUBSCRIBE/… + START; opted-out numbers skip automations and bot menu (START to resume)
- **Settings UI:** `/whatsapp` Order status alerts toggles + greeting/offers/location paths
- **Anaz:** greeting + events seeded; KB `TKB-anaz-whatsapp` for Jarvis owner-whatsapp

## Notes / not in v1

- SALE_COMPLETED / LOW_STOCK default **off** (noise) — enable per shop
- No separate WhatsApp DB
- Full Approval Center for outbound drafts → `10`

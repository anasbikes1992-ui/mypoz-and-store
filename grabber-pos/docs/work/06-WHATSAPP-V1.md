# 06 — WhatsApp v1

**Status:** DEFERRED — after Owner completeness (`05`)  
**Rule:** Harden existing WA (do not replace).

## Scope when started

- First 10 event automations on canonical commerce events
- Webhook signature / idempotency / opt-out / delivery status
- No separate WhatsApp database — same Supabase + `org_id`

# Phase F — Webhook resilience / DLQ

**Status:** IMPLEMENTED

## Delivered

| Item | Path |
|------|------|
| `payment_events` idempotent claim | migration `0028_payment_domain.sql` |
| Raw webhook payload persisted | `webhook/[provider]/route.ts` |
| Owner replay API | `POST /api/ops/replay-payments` |
| Replay helper | `payment-events-replay.ts` |

## Verify

1. Webhook stores payload on `payment_events`.
2. Owner can POST `/api/ops/replay-payments` to re-apply stuck events.

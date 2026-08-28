# Phase L — Monetization

**Status:** IMPLEMENTED (SaaS tiers only)

## In scope

- Plan tiers + PayHere licence checkout (`/billing`, `licence-payment.ts`)
- Module gating via `plans.ts`
- Expiry warning banner (7 days)

## Explicitly deferred

- Payment take-rate (0.5–1%) as engineering requirement
- Usage metering

## Verify

1. `/billing` shows current plan and upgrade paths.
2. Licence within 7 days shows renewal banner.

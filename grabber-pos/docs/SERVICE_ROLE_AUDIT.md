# SERVICE ROLE AUDIT

**Date:** 2026-08-25  
**Rule:** Every `createServiceSupabase()` use needs a reason, tenant validation, and risk note.  
**Implementation phase:** document now; reduce surface in Phase 4+.

| File | Reason | Tenant validation | Public? | Risk | Mitigation today |
|------|--------|-------------------|---------|------|------------------|
| `supabase/server.ts` | Factory | N/A | N | Key leak | Server-only |
| `gateway-payments-store.ts` | Gateway ledger R/W without user JWT | Resolve org via storefront slug | Webhook-driven | Cross-tenant write if slug wrong | Slug→org lookup; refuse if org missing |
| `complete-pending-sale.ts` | Complete paid sale / stock | Board/sale reference | Webhook | Double complete | completedAt + RPC idempotency |
| `storefront-repo.ts` | Public catalog/order DEFINER alternate + service ledger | Slug/host | Public store | Over-broad read | Prefer anon RPCs; service gated |
| `storefront-orders-store.ts` | Order boards | org from storefront | Mixed | Board spoof | Service + org_id on upsert |
| `whatsapp-durable.ts` | Meta webhook tenant resolve + order | Phone→org RPC | Webhook | Wrong tenant attach | whatsapp_resolve_org |
| `whatsapp-webhook-log.ts` | Platform audit log | HQ org key | Webhook | Noise | Document key |
| `hq-repo.ts` | HQ org list/provision | GMS admin gate in API | HQ | Full DB | requireGmsAdmin |
| `hq-monitor.ts` | Fleet metrics | GMS | HQ | Data exfil | GMS only |
| `hq-platform-store.ts` | platform_settings | GMS | HQ | Config wipe | GMS |
| `hq-tenant-ops.ts` | Tenant ops docs | GMS + org id | HQ | Cross-tenant | GMS |
| `hq-password.ts` | Reset tenant user password | GMS + profile org check | HQ | Account takeover | GMS + live org |
| `password-reset.ts` | Forgot password flow | Email lookup | Public-ish | Enum users | Rate limit + generic responses |
| `backup-export.ts` | Tenant/HQ dump | Session or GMS | Private | Data dump | Auth inside helper |
| `click-collect-store.ts` / `delivery-store.ts` | Board upserts | Session org / service paths | App | Overwrite | Review in Phase 4 |
| `licence-payment.ts` (via webhook) | Extend licence | Payment meta org | Webhook | Free licence | Idempotent licenceAppliedAt |

### Policy

- Prefer SECURITY DEFINER RPCs with `auth.uid()` over service role when a user session exists.
- Service role **never** accepts raw client `org_id` as sole authority without verifying against storefront/slug/payment reference.
- Log privileged actions into `audit_events` after audit unification.

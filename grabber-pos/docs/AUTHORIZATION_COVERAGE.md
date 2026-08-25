# Authorization Coverage

## Goal
Track which API routes explicitly authenticate and authorize at the handler boundary after the production transformation batch.

## Strong Guards

| Guard | Meaning | Source |
| --- | --- | --- |
| `requireTenantSession()` | Real Supabase session plus `profiles.org_id` / role lookup | `src/lib/server/auth-session.ts` |
| `requireRoles()` | Explicit role gate after `requireTenantSession()` | `src/lib/server/auth-session.ts` |
| `getRepository()` | Fails closed without a real session when Supabase is enabled | `src/lib/server/repositories/index.ts` |
| `requireGmsAdmin()` | HQ-only server guard (app_metadata / allowlist only) | `src/lib/server/gms-auth.ts` |
| `businessErrorResponse()` | Typed HTTP mapping for commerce failures | `src/lib/server/business-errors.ts` |

## Coverage Matrix (post-hardening)

| Route or group | Auth mechanism | Quality |
| --- | --- | --- |
| `src/app/api/hq/*` | `requireGmsAdmin()` | Strong — no `user_metadata` trust |
| `src/app/api/sales/route.ts` | `getRepository()` | Strong |
| `src/app/api/sales/[id]/void/route.ts` | Session + PIN + `void_sale` RPC | Strong |
| `src/app/api/audit/route.ts` | Session + roles | Strong — actor from session |
| `src/app/api/register/route.ts` | `requireTenantSession()` | Strong |
| `src/app/api/stocktake/*` | Session + owner/manager on writes | Strong |
| `src/app/api/transfers/*` | Session + owner/manager | Strong |
| `src/app/api/purchase-orders/*` | Session + owner/manager | Strong |
| `src/app/api/billing/route.ts` | Session + owner/manager on POST | Strong |
| `src/app/api/commerce/orders/[id]/fulfill/route.ts` | Session + owner/manager | Strong |
| `src/app/api/commerce/orders/[id]/payment-proof/route.ts` | Session + owner/manager | Strong |
| `src/app/api/whatsapp/inbox/route.ts` | Session + owner/manager | Strong |
| `src/app/api/ai/settings/route.ts` | Session + owner/manager | Strong |
| `src/app/api/returns/route.ts` | Session + owner/manager | Strong |
| `src/app/api/reports/summary/route.ts` | `requireTenantSession()` | Strong |
| `src/app/api/print/route.ts` | `requireTenantSession()` | Strong |
| `src/app/api/products/template/route.ts` | `requireTenantSession()` | Strong |
| `src/app/api/products/[id]/variants/route.ts` | Session (+ owner/manager on PUT) | Strong |
| `src/app/api/commerce/discounts/validate/route.ts` | `requireTenantSession()` | Strong |
| `src/app/api/payments/webhook/[provider]/route.ts` | Public + signature + idempotency | Public-by-design |
| `src/app/api/whatsapp/webhook/route.ts` | Public + signature + message dedupe | Public-by-design |
| `src/app/api/store/*` | Public; tenant via host/slug RPCs | Public-by-design |
| `src/app/api/auth/forgot-password/route.ts` | Public + rate limit | Public-by-design |

## Residual proxy-only private routes

Census test expects **zero** residuals (`KNOWN_RESIDUAL = []` in `api-auth-census.test.ts`).

## Authorization Rules

| Capability | Minimum role |
| --- | --- |
| View register / stocktake / transfers / POs / returns / reports | Authenticated tenant |
| Open/close register, stocktake post, transfer approve, PO receive, returns, fulfill | `manager` or `owner` |
| Billing upgrades | `owner` or `manager` |
| Audit read | `owner` or `manager` |
| Audit write (POS overrides) | Authenticated (cashier+) with server-derived actor |
| HQ platform | `gms_admin` via `app_metadata` or `GMS_ADMIN_EMAILS` |

## Closed Anti-Patterns

- Client-writable `user_metadata` for HQ elevation — removed.
- Unauthenticated `/api/audit` POST with client actor — locked down.
- Implicit store auth without route-level session checks — fixed on P0 hotspots.

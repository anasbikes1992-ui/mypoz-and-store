---
name: mypoz-architecture
description: >-
  Maps MyPoz Commerce Cloud (grabber-pos) architecture: product seams
  (getRepository, recordStore/docStore), roles, proxy auth, WhatsApp/storefront/HQ,
  Supabase RLS, and live host mypoz-and-store-ui only. Use when exploring MyPoz,
  grabber-pos, POS/storefront/WhatsApp flows, multi-tenant auth, or writing
  architecture docs.
---

# MyPoz architecture mapping

## What MyPoz is

**MyPoz Commerce Cloud** (`package.json` name: `mypoz-commerce-cloud`) is a multi-tenant POS + public storefront + WhatsApp commerce cloud for Grabber Mobility Solutions (GMS).

| Fact | Value |
|------|--------|
| Code root / Vercel root | `grabber-pos` |
| Supabase project | `veavfkjgtkbnggukzjds` (ap-northeast-1) |
| **Live host only** | `https://mypoz-and-store-ui.vercel.app` — never treat `mypoz-and-store` as production |
| Admin / tenant owner | `profiles.role = 'owner'` |
| GMS fleet HQ | `/hq` via `gms-auth` (`GMS_ADMIN_EMAILS` or `app_metadata.role = gms_admin`) |

## Mapping workflow

When asked to map or change MyPoz architecture:

1. Prefer `graphify explain` / `graphify path` / `graphify query` if `graphify-out/graph.json` exists.
2. Read `docs/ARCHITECTURE_MAP.md`, then deepen with code below.
3. Verify claims against `src/proxy.ts`, `src/lib/server/repositories/`, `src/lib/server/persistence/`, `src/lib/server/gms-auth.ts`, `supabase/migrations/`.

## Seams (must respect)

### `getRepository()` — POS catalog & sales

- Path: `src/lib/server/repositories/index.ts`
- Returns `SupabaseRepository` (RLS + `create_sale` RPC) or `LocalRepository` (demo JSON).
- **Fail-closed** when Supabase configured but no session; production without Supabase throws unless `POS_ALLOW_DEMO=true`.
- Use for products/sales/inventory RPCs — not for module CRUD.

### `recordStore` / `docStore` — module persistence

- Path: `src/lib/server/persistence/`
- `recordStore` → `app_collections` (or `data/*.json` in demo)
- `docStore` → `app_documents` (settings, tenant, website, whatsapp, …)
- Org scoping via RLS / `current_org_id()` — stores must not invent tenancy.
- Stock is **not** on this seam; use `adjust_stock` / stock stores + RPCs.

## Surfaces

| Surface | Routes | Auth |
|---------|--------|------|
| POS / back-office | `/(app)/*`, `/api/*` (most) | Session cookie (proxy) |
| Public storefront | `/store/[slug]`, `/api/store/*` | Public; slug/host → tenant |
| WhatsApp | `/api/whatsapp/webhook`, bot + inbox | Webhook signature; inbox needs staff session |
| GMS HQ | `/hq/*`, `/api/hq/*` | Logged-in **plus** `requireGmsAdmin()` |

## Roles

- DB enum: `owner` \| `manager` \| `cashier` (`profiles.role`).
- App permissions: `src/lib/permissions.ts` — owner maps to `admin` defaults; keys like `void_sale`, `stock_adjust`, `manage_users`.
- HQ is **not** a tenant role — it is GMS operator identity (`gms_admin`).

## Proxy auth (`src/proxy.ts`)

- Optimistic check: presence of `sb-*-auth-token*` cookies or demo `pos_session`.
- **Not** a full JWT validation — API handlers must still use Supabase `getUser()` / `requireGmsAdmin` where needed.
- Public: login, welcome, `/store`, `/api/store`, health, payment + WhatsApp webhooks, observability POST.
- WAF + IP rate limit run before auth.

## Security invariants

- Cross-tenant leak = stop-the-line.
- Sale/stock writes only through SECURITY DEFINER RPCs.
- Service role is server-only (HQ provision, webhooks, password ops).
- Never commit secrets; `docs/CREDENTIALS.md` is gitignored.

## Doc index

- `docs/ARCHITECTURE_MAP.md` — full map
- `docs/API_SURFACE.md` — `/api` inventory
- `docs/SECURITY_AND_AUTH.md` — proxy, RLS, risks
- `docs/DATABASE_MAP.md` — migrations summary
- `docs/DATA-MODEL.md` — detailed schema
- `docs/ARCHITECTURE.md` — seams overview
- `docs/WHATSAPP.md` — WA ops on live host

## Output template (when mapping)

```markdown
## Product
## Seams used
## Surfaces touched (POS / store / WA / HQ)
## Auth & RLS implications
## Files to change
## Risks
```

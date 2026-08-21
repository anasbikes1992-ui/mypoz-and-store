# Security and authentication

How MyPoz authenticates callers, isolates tenants, and where risk concentrates.
Code sources: `src/proxy.ts`, `src/lib/server/gms-auth.ts`, `src/lib/supabase/*`,
`supabase/migrations/0003_rls.sql`, storefront/WhatsApp handlers.

---

## 1. Trust model (short)

| Layer | Guarantees | Does **not** guarantee |
|-------|------------|-------------------------|
| `proxy.ts` | Blocks anonymous access to private UI/API; WAF + rate limit | Valid JWT / correct role / org membership |
| Supabase Auth + RLS | Org-scoped reads/writes for JWT users | Cross-org HQ / anonymous storefront (use DEFINER / service role) |
| DEFINER RPCs | Authoritative sale/stock mutations | Safe if called with wrong service-role org resolution |
| `requireGmsAdmin` | HQ API only for GMS operators | Tenant owners cannot use HQ just by being `owner` |

**Stop-the-line:** any cross-tenant data leak.

---

## 2. Proxy (optimistic cookie check)

`src/proxy.ts` is the Next 16 front door (formerly middleware).

### Public paths (no session)

Includes: `/login`, `/forgot-password`, `/update-password`, `/welcome`, legal pages,
`/display`, `/api/auth/login`, `/api/health`, `/store` + `/api/store`,
`/api/payments/webhook`, `/api/whatsapp/webhook`, sitemap/robots,
and **POST** `/api/observability/events`.

### Session detection

- **Supabase:** any cookie name starting with `sb-` that contains `auth-token`
  (including chunked `.0`, `.1`, …).
- **Demo:** `pos_session` verified with `verifySessionToken` when Supabase is off.

If neither is present → `401` for `/api/*`, else redirect to `/login`
(with `?next=` for `/hq`).

### Risk: optimistic cookie presence

The proxy only checks that **auth cookies exist**, not that the JWT is valid,
unexpired, or bound to an active user. Stolen/expired cookies may pass the edge
until a handler calls `createServerSupabase().auth.getUser()`.

**Mitigation pattern:** every sensitive route must:

1. Use `getRepository()` (fails without user when Supabase on), **or**
2. Call `getUser()` / `requireGmsAdmin()` / Zod + business checks explicitly.

Do not add new “private” APIs that trust the proxy alone.

### WAF & rate limit

`inspectRequest` + `apiRateLimit` run before auth. `/api/health` skips rate
limit. See [DDOS_AND_WAF.md](DDOS_AND_WAF.md).

---

## 3. Tenant roles & app permissions

### Database

`profiles.role`: `owner` | `manager` | `cashier` (enum in `0001_schema`).

RLS helpers: `current_org_id()`, `current_user_role()` (`0002` / `0003`).

Typical policies:

- Read: `org_id = current_org_id()`.
- Catalog / purchase writes: `owner` | `manager`.
- Profile management: `owner` only.
- `sales` / `branch_stock` / `stock_movements`: **client read**; writes via DEFINER RPCs only.

### Application permissions

`src/lib/permissions.ts` keys: `void_sale`, `discount_override`, `price_override`,
`view_reports`, `open_register`, `close_register`, `stock_adjust`, `manage_users`.

`owner` normalizes to `admin` for default matrices. Per-user overrides live in
permissions store (`docStore` / collections).

**Grabber POS admin access** for a tenant requires `profiles.role = 'owner'`
(product invariant).

---

## 4. GMS HQ auth

`src/lib/server/gms-auth.ts`:

1. Caller must already be logged in (proxy).
2. Supabase user must have:
   - `app_metadata` / `user_metadata` `role = gms_admin` (or `gms_admin` flag), **or**
   - email on `GMS_ADMIN_EMAILS` allowlist.
3. Empty allowlist alone does **not** open HQ to all owners.
4. Demo mode: username on `GMS_ADMIN_USERS` (default `POS_USER` / `admin`).

All `/api/hq/*` handlers call `requireGmsAdmin()` → `403` otherwise.

HQ often needs **service role** for cross-org reads (`reseller_licences`),
provisioning, and password resets (`hq-password.ts`). That key must never ship
to the browser.

---

## 5. Service role usage

Legitimate server-only uses:

| Use | Why |
|-----|-----|
| HQ tenant provision / monitor | Cross-org |
| WhatsApp webhook → sale | No user JWT from Meta |
| Payment webhooks → mark paid | No user JWT |
| Storefront chrome (theme/docs) | Anonymous shoppers (`0017` public document RPCs) |
| Seed / ops scripts | Local `--env-file=.env.local` |

**Risks:** a bug that selects the wrong `org_id` while holding service role
bypasses RLS. Prefer DEFINER RPCs that resolve tenant by slug / `phone_number_id`
over ad-hoc service-role queries.

Production fail-closed: `requireSupabase` in `src/lib/supabase/config.ts`
prevents silent demo-store fallback unless `POS_ALLOW_DEMO=true`.

---

## 6. Public webhooks & storefront

### WhatsApp (`/api/whatsapp/webhook`)

- GET: hub verify against `WHATSAPP_VERIFY_TOKEN` (and optional settings token).
- POST: HMAC `X-Hub-Signature-256` with `WHATSAPP_APP_SECRET`.
- If secret missing and not `requireSupabase`, demo may accept unsigned bodies
  (local only — unacceptable on live host).

### Payments (`/api/payments/webhook/[provider]`)

Provider-specific signature verification in gateway helpers — treat as public edge.

### Storefront (`/api/store/*`)

Public by design. Tenant isolation depends on **slug → org** resolution and
DEFINER functions (`0007+`), not on cookies. Order endpoint has its own IP
rate limit. Do not expose service-role-powered list-all-orgs helpers here.

---

## 7. Live host & secrets hygiene

| Item | Rule |
|------|------|
| Host | **Only** `mypoz-and-store-ui.vercel.app` |
| Supabase | Project `veavfkjgtkbnggukzjds` |
| Env | Anon + service role + `NEXT_PUBLIC_APP_URL` + `GMS_ADMIN_EMAILS` + WA four + optional OpenAI |
| Do not put on Vercel | `UPSERT_ADMIN_*`, `GMS_ADMIN_PASSWORD` (script-only) |
| Repo | Never commit `.env*`; `docs/CREDENTIALS.md` gitignored |

Auth redirect allowlist must include the live host and `/update-password`
(see [GO_TO_MARKET.md](GO_TO_MARKET.md)).

---

## 8. Checklist for new endpoints

- [ ] Is it public? If yes, document why and how tenant is resolved.
- [ ] If private, does the handler call `getUser` / `getRepository` / `requireGmsAdmin`?
- [ ] Any write to stock/sales? Must go through DEFINER RPC.
- [ ] Any service role? Justify and scope by org/slug/phone id.
- [ ] Rate limit / Zod validation at the boundary?
- [ ] No secrets in responses or client bundles.

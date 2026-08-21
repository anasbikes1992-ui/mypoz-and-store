# Supabase production — mypoz-and-store-ui

**Project ref:** `veavfkjgtkbnggukzjds`  
**Region:** ap-northeast-1  
**URL:** `https://veavfkjgtkbnggukzjds.supabase.co`  
**GitHub:** `anasbikes1992-ui/mypoz-and-store`  
**Vercel (sole live host):** `mypoz-and-store-ui` → `https://mypoz-and-store-ui.vercel.app`  
(Do not use `mypoz-and-store` for production traffic; leave that project undeployed.)

## Cutover checklist

- [x] Migrations `0001`–`0018` applied (`list_migrations` shows 19+ entries)
- [x] Vercel env vars set (Supabase URL/anon/service_role + `NEXT_PUBLIC_APP_URL` + `GMS_ADMIN_EMAILS`); production redeployed
- [x] `/api/health` → `ok`, `backend: supabase`, `gatewayLedger: service-role` (open in an authenticated browser if Deployment Protection is on)
- [ ] Auth Site URL + redirect allowlist configured in Supabase dashboard (see below)
- [x] HQ Super Admin + sample tenant owner provisioned (login verified via Auth API)
- [ ] Smoke: `/login`, `/welcome`, `/dashboard`, one POS sale, optional `/store/<slug>` order
- [x] WhatsApp: Meta credentials + webhook wired; allowlisted inbound `hi` still manual
- [ ] Resend / PayHere (or bank-transfer proof) configured if you sell those flows

### Local go-live smoke

```bash
# Requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY in .env.local
node --env-file=.env.local scripts/go-live-smoke.mjs
node --env-file=.env.local scripts/upsert-admin.mjs
```

## Vercel environment variables (names only)

Set these in [Vercel → mypoz-and-store-ui → Settings → Environment Variables](https://vercel.com/):

| Variable | Must point to |
|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://veavfkjgtkbnggukzjds.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → publishable key (`sb_publishable_…`) or legacy anon JWT for **veavfkjgtkbnggukzjds** |
| `SUPABASE_SERVICE_ROLE_KEY` | Same project → service_role key (server-only; dashboard only) |
| `NEXT_PUBLIC_APP_URL` | `https://mypoz-and-store-ui.vercel.app` |
| `GMS_ADMIN_EMAILS` | Comma-separated HQ emails (e.g. `anasbikes1992@gmail.com`) |
| `SUPABASE_DB_PASSWORD` | Optional locally; used by SQL provision scripts |
| `WHATSAPP_*` / `RESEND_*` / `PAYHERE_*` | Optional — see `.env.example` |

## Supabase Auth redirect URLs

In Supabase Dashboard → Authentication → URL Configuration, add:

- **Site URL:** `https://mypoz-and-store-ui.vercel.app`
- **Redirect URLs:**
  - `https://mypoz-and-store-ui.vercel.app/**`
  - `http://localhost:3000/**`

Enable **Email** provider (password + magic link). POS admin requires a row in `profiles` with `role = 'owner'`.

## Migrations

Repo migrations live in `supabase/migrations/` (`0001` … `0018`).

If schema was applied via `scripts/apply-sql.mjs` but the dashboard shows **No migrations**, run:

```bash
SUPABASE_PROJECT_REF=veavfkjgtkbnggukzjds node --env-file=.env.local scripts/sync-migration-history.mjs
```

Audit scripts:

```bash
node --env-file=.env.local scripts/check-migrations.mjs
node --env-file=.env.local scripts/check-auth.mjs
```

## RLS notes

- `profiles`, `app_documents`, and `app_collections` are org-scoped via `current_org_id()`
- Storefront RPCs (`storefront_by_host`, `storefront_create_order`, etc.) run as `SECURITY DEFINER`

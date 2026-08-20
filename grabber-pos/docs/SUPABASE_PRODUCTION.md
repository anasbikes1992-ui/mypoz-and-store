# Supabase production — mypoz-and-store-ui

**Project ref:** `veavfkjgtkbnggukzjds`  
**Region:** ap-northeast-1  
**URL:** `https://veavfkjgtkbnggukzjds.supabase.co`  
**GitHub:** `anasbikes1992-ui/mypoz-and-store`  
**Vercel:** `mypoz-and-store-ui` → `https://mypoz-and-store-ui.vercel.app`

## Cutover checklist

- [x] Migrations `0001`–`0018` applied (`list_migrations` shows 19+ entries)
- [ ] Vercel env vars set (see below); production redeployed
- [ ] `/api/health` → `ok`, `backend: supabase`, `gatewayLedger: service-role`
- [ ] Auth Site URL + redirect allowlist configured in Supabase dashboard
- [ ] First owner provisioned via `node --env-file=.env.local scripts/upsert-admin.mjs`
- [ ] Smoke: `/login`, `/welcome`, `/dashboard`

## Vercel environment variables (names only)

Set these in [Vercel → mypoz-and-store-ui → Settings → Environment Variables](https://vercel.com/):

| Variable | Must point to |
|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://veavfkjgtkbnggukzjds.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → publishable/anon key for **veavfkjgtkbnggukzjds** |
| `SUPABASE_SERVICE_ROLE_KEY` | Same project → service_role key (server-only; dashboard only) |
| `NEXT_PUBLIC_APP_URL` | `https://mypoz-and-store-ui.vercel.app` |
| `SUPABASE_DB_PASSWORD` | Optional locally; used by `scripts/apply-sql.mjs` only |

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

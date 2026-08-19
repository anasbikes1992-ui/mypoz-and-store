# Supabase production — mypoz-and-store

**Project ref:** `vtawrxmkahpgwgydibox`  
**Region:** ap-southeast-1 (Singapore)  
**URL:** `https://vtawrxmkahpgwgydibox.supabase.co`

## Vercel environment variables (names only)

Set these in [Vercel → mypoz-and-store → Settings → Environment Variables](https://vercel.com/):

| Variable | Must point to |
|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://vtawrxmkahpgwgydibox.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → publishable/anon key for **vtawrxmkahpgwgydibox** |
| `SUPABASE_SERVICE_ROLE_KEY` | Same project → service_role key (server-only) |
| `NEXT_PUBLIC_APP_URL` | `https://mypoz-and-store.vercel.app` |
| `SUPABASE_DB_PASSWORD` | Optional locally; used by `scripts/apply-sql.mjs` only |

## Supabase Auth redirect URLs

In Supabase Dashboard → Authentication → URL Configuration, add:

- **Site URL:** `https://mypoz-and-store.vercel.app`
- **Redirect URLs:**
  - `https://mypoz-and-store.vercel.app/**`
  - `http://localhost:3000/**`

Enable **Email** provider (password + magic link). POS admin requires a row in `profiles` with `role = 'owner'`.

## Migrations

Repo migrations live in `supabase/migrations/` (`0001` … `0018`).

If schema was applied via `scripts/apply-sql.mjs` but the dashboard shows **No migrations**, run:

```bash
SUPABASE_PROJECT_REF=vtawrxmkahpgwgydibox node --env-file=.env.local scripts/sync-migration-history.mjs
```

Audit scripts:

```bash
node --env-file=.env.local scripts/check-migrations.mjs
node --env-file=.env.local scripts/check-auth.mjs
```

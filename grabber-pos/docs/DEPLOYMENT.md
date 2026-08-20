# Deployment

## Web app (Vercel)

**Sole live host:** [`mypoz-and-store-ui`](https://mypoz-and-store-ui.vercel.app)  
Production URL: `https://mypoz-and-store-ui.vercel.app`

A second Vercel project named `mypoz-and-store` may still exist — leave it undeployed / unused. **Do not delete** it without an explicit OK. Do not point Meta webhooks, `NEXT_PUBLIC_APP_URL`, or client bookmarks at that host.

### Root Directory (important)

| Setting | Correct value | Wrong |
|---------|---------------|--------|
| Vercel → Project Settings → Root Directory | `grabber-pos` | `grabber-pos/grabber-pos`, empty when the Git root is the monorepo |

The Git repository root is the monorepo (`MyPoz & Store`). The Next.js app lives in the `grabber-pos/` folder — that is the Root Directory on **`mypoz-and-store-ui`**. There is no nested `grabber-pos/grabber-pos`.

### Local CLI link

From `grabber-pos/`:

```bash
# If TLS fails on this machine: set NODE_OPTIONS=--use-system-ca
npx vercel link --project mypoz-and-store-ui --yes
```

`.vercel/project.json` must show `"projectName": "mypoz-and-store-ui"`. The `.vercel/` folder is gitignored.

Launch sequence (checkout smoke → WA paste → catalogue): [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md).

### Environment variables (Vercel project settings)

Set these on **`mypoz-and-store-ui`** only (parity with production).

| Variable | Scope | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | all | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | all | public |
| `SUPABASE_SERVICE_ROLE_KEY` | server | **secret** — never expose |
| `PRINTER_RECEIPT_IP` | server | receipt + drawer (on-prem / print agent) |
| `PRINTER_KOT_IP` / `PRINTER_BOT_IP` | server | kitchen / bar tickets |

> Thermal printing needs a TCP route to the printers, so it runs from an
> on-prem/self-hosted deployment or a store-local agent — not from Vercel's edge.
> In cloud deployments, print from the client via a local print bridge instead.

### Build

```bash
npm run build   # next build (Turbopack)
npm start
```

### Pre-deploy checklist

- [ ] Migrations applied to the production Supabase project (`supabase db push`)
- [ ] RLS enabled on every table (it is, via `0003_rls.sql`) — verify in dashboard
- [ ] Seed run once (org, branch, admin) — or real data imported
- [ ] `curl https://<host>/api/health` returns `ready:true`, `backend:"supabase"`
- [ ] `npm test` and `npm run typecheck` pass
- [ ] Rotate the demo `POS_PASSWORD` / remove demo auth if Supabase is live

## Backend (Supabase)

- Migrations are ordered and idempotent-friendly; apply with the CLI.
- Enable Point-in-Time Recovery for the sales ledger.
- Storage bucket (optional) for receipt PDFs / exported reports.
- Set an Auth password policy and disable public sign-ups (staff are created by
  an owner).

## Mobile app

### Android

```bash
cd grabber-pos-mobile
flutter build apk --release \
  --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=... \
  --obfuscate --split-debug-info=build/debug-info
```

Or `flutter build appbundle` for the Play Store. Keep `--split-debug-info` output
out of version control (crash symbolication only).

### iOS

```bash
flutter build ipa --release \
  --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...
```

### Config hygiene

- `--dart-define` values are compile-time and embedded in the binary. The anon
  key is safe to embed (it is gated by RLS); the service-role key must **never**
  be in the app.
- Enforce HTTPS (default with Supabase). Cleartext traffic stays disabled.

## CI (recommended)

A minimal pipeline:

```yaml
# web
- run: cd grabber-pos && npm ci && npm run typecheck && npm test && npm run build
# mobile
- run: cd grabber-pos-mobile && flutter pub get && flutter analyze && flutter test
```

## Cutover checklist

1. Export the current catalog (Excel/CSV) — grocery layout is already normalized.
2. Run `npm run seed` (or a per-vertical variant) to load it into Supabase.
3. Train cashiers on the web POS; deploy the mobile app to handhelds.
4. Point traffic at the new deployment and retire the previous system.

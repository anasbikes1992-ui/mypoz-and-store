# Setup

Two ways to run: **demo mode** (zero config) and **durable mode** (Supabase).

## 1. Web — demo mode (fastest)

No backend needed. Uses the bundled JSON catalog and a file-backed sales store.

```bash
cd grabber-pos
npm install
npm run dev            # http://localhost:3000
```

Log in with `admin` / `admin123` (override via `POS_USER` / `POS_PASSWORD`).

## 2. Provision Supabase (durable mode)

### a. Create a project

1. Create a project at https://supabase.com.
2. Copy the **Project URL**, **anon key**, and **service_role key** from
   Project Settings → API.

### b. Apply the schema

Using the Supabase CLI (recommended):

```bash
cd grabber-pos
supabase link --project-ref <your-ref>
supabase db push        # applies supabase/migrations/*.sql in order
```

Or paste each file in `supabase/migrations/` (0001 → 0007+) into the SQL editor,
in order.

Migrations:

| File | Contents |
|------|----------|
| `0001_schema.sql` | tables, enums, indexes, triggers |
| `0002_functions.sql` | `create_sale`, `receive_purchase`, `adjust_stock`, helpers |
| `0003_rls.sql` | row-level security policies |
| `0004_catalog_rpc.sql` | `catalog`, `product_by_barcode`, `inventory_stats` |
| `0005_app_data.sql` | `app_collections`, stock documents, product images |
| `0006_app_documents.sql` | `app_documents`, `reseller_licences` view |
| `0007_storefront.sql` | public storefront + online catalog / order RPCs |

Apply through **0007+** before enabling a live `/store/<slug>` shop — see
[PRODUCTION.md](PRODUCTION.md).

### c. Configure env

```bash
cp .env.example .env.local
```

Fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
SEED_ADMIN_EMAIL=admin@yourstore.lk
SEED_ADMIN_PASSWORD=<strong password>
```

### d. Seed the demo org + catalog

```bash
npm run seed
```

This creates an organization, a main branch + register, an admin auth user, and
loads the 2,509-product catalog with opening stock. Log in with the
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` you set.

### e. Run

```bash
npm run dev
```

The health probe confirms the active backend:

```bash
curl http://localhost:3000/api/health
# {"status":"ok","ready":true,"backend":"supabase",...}
```

## 3. Mobile app

```bash
cd grabber-pos-mobile
flutter pub get
flutter run \
  --dart-define=SUPABASE_URL=https://<ref>.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=<anon key>
```

Sign in with the same Supabase credentials. Tip: put the two `--dart-define`
flags in a `--dart-define-from-file=env.json` for convenience (keep it gitignored).

## 4. Thermal printers (optional)

KOT/BOT ticket printing (ESC/POS over TCP) is configured by env in the web app:

```
PRINTER_RECEIPT_IP=192.168.123.100
PRINTER_KOT_IP=192.168.123.101
PRINTER_BOT_IP=192.168.123.102
```

See [CREDENTIALS.md](CREDENTIALS.md) for the full env checklist.

## Tests

```bash
# web
cd grabber-pos && npm test

# mobile
cd grabber-pos-mobile && flutter test
```

## Troubleshooting

- **`/api/health` shows `backend:"local"` unexpectedly** — the Supabase env vars
  aren't loaded, or the signed-in user has no branch. Re-check `.env.local` and
  that the seed ran.
- **`SUPABASE_SERVICE_ROLE_KEY is not configured`** — only the seed script needs
  it; set it in `.env.local`.
- **Mobile shows the "Supabase is not configured" screen** — pass both
  `--dart-define` flags.

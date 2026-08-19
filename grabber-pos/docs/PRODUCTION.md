# Going to production

GRABBER POS Studio runs in two modes. Everything in the app works in both — the
difference is where data lives and whether it is multi-tenant.

| | Demo / evaluation | Production |
|---|---|---|
| Backend | Bundled JSON files under `data/` | Supabase (Postgres + Auth + RLS) |
| Config | None — `npm run dev` and go | Supabase env vars |
| Tenancy | Single workspace | Many organizations, isolated by RLS |
| Auth | `admin` / `admin123` demo login | Supabase Auth users + roles |
| Concurrency | Single node, file-locked | Per-row writes, safe across instances |

Demo mode is for trials and offline demos. **Never sell into it** — the JSON files
are not backed up, not multi-tenant, and assume one server process.

---

## 1. Provision Supabase

```bash
npx supabase link --project-ref vtawrxmkahpgwgydibox
npx supabase db push
```

This applies `supabase/migrations/` in order:

| Migration | Contents |
|-----------|----------|
| `0001_schema` | Core multi-tenant schema (organizations → branches → products → sales) |
| `0002_functions` | `create_sale` (atomic, idempotent), `receive_purchase`, `adjust_stock` |
| `0003_rls` | Row-Level Security on every tenant table |
| `0004_catalog_rpc` | Catalog / barcode / inventory read RPCs |
| `0005_app_data` | `app_collections`, `stock_documents`, product images |
| `0006_app_documents` | `app_documents`, `reseller_licences` view, consolidation |
| `0007_storefront` | Public storefront (`storefronts`), `online_visible` / slug / online price on products, SECURITY DEFINER catalog + order RPCs |

Apply **0007+** before enabling a live `/store/<slug>` shop. Website CMS config
also persists in `app_documents` (`key = 'website'`) — see
[CUSTOMER-STOREFRONT.md](CUSTOMER-STOREFRONT.md).

Verify RLS is on before going live:

```sql
select tablename, rowsecurity from pg_tables
where schemaname = 'public' and rowsecurity = false;
```

That query must return **zero rows** for tenant tables.

## 2. Configure the app

Set these in the hosting project (Vercel → Settings → Environment Variables):

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Switches the app out of demo mode |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Browser-safe key |
| `SUPABASE_SERVICE_ROLE_KEY` | seeding / HQ / super-admin | **Server-only.** Never expose to the browser. Unlocks cross-org `/hq` roll-ups |
| `GMS_ADMIN_EMAILS` | GMS HQ | Comma-separated emails allowed into `/hq` (and/or set Auth `app_metadata.role = gms_admin`) |
| `GMS_ADMIN_USERS` | demo HQ | Demo usernames allowed into `/hq` (defaults to `POS_USER`) |
| `WHATSAPP_TOKEN` | optional | WhatsApp Cloud API token for invoice sending |
| `WHATSAPP_PHONE_NUMBER_ID` | optional | Sender number id |
| `WHATSAPP_VERIFY_TOKEN` | WhatsApp webhook | Same string as Meta hub.verify_token |
| `WHATSAPP_APP_SECRET` | WhatsApp webhook | Meta App secret (HMAC). Rotate if exposed |
| `NEXT_PUBLIC_APP_URL` | payments / links | `https://mypoz-and-store.vercel.app` |
| `PRINTER_RECEIPT_IP` | optional | ESC/POS receipt + cash-drawer kick |
| `PRINTER_KOT_IP` | optional | Kitchen order ticket (KOT) |
| `PRINTER_BOT_IP` | optional | Bar order ticket (BOT) |
| `POS_SESSION_SECRET` | demo mode | Session cookie secret when not on Supabase |

> Printer names match `ticket-printer.ts` / `/api/health`. Full paste checklist:
> [CREDENTIALS.md](CREDENTIALS.md).

The app treats the presence of the two `NEXT_PUBLIC_SUPABASE_*` vars as the switch
into durable mode. Set both or neither — half-configured falls back to local files.

## 3. Seed the first organization

```bash
npm run seed
```

Creates the organization, first branch, and owner login. Then import the client's
catalog from **Products → Import** (Excel/CSV; grocery, pharmacy, bookshop and
hardware layouts are all accepted).

## 4. Deploy

```bash
npm run build
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for Vercel and mobile build specifics.

---

## Go-live checklist

**Data & access**
- [ ] Migrations through **0007_storefront** (and any later) applied; the RLS query above returns zero rows
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set server-side only, never in `NEXT_PUBLIC_*`
- [ ] `/login` shows the account form, not the demo hint (password login self-disables once Supabase is configured — see Security below)
- [ ] Point-in-time recovery enabled on the Supabase project
- [ ] Owner + staff logins created with the right roles
- [ ] If GMS staff use `/hq`: `GMS_ADMIN_EMAILS` (and/or `gms_admin` metadata) set; empty email list alone does not open HQ to all owners

**Commercials**
- [ ] Client's plan and licence expiry set in **Super-admin → Licence** (`/admin`) or via GMS `/hq`
- [ ] Branding set (business name, logo, accent) — verify the topbar and receipts
- [ ] Expiry behaviour understood: selling stops, reads keep working (see below)

**Operations**
- [ ] Catalog imported and spot-checked (prices, barcodes, stock)
- [ ] Receipt header/footer, tax rate and paper width set in Settings
- [ ] Printers reachable from the server (receipt + KOT/BOT where used)
- [ ] If storefront is live: Website CMS configured; test order on Click & collect / Delivery — see [CUSTOMER-STOREFRONT.md](CUSTOMER-STOREFRONT.md)
- [ ] `npm run build` and `npm test` green on the deploying commit
- [ ] `/api/health` returns ok from the deployed URL

**Handover**
- [ ] Staff trained — see [USER-GUIDE.md](USER-GUIDE.md)
- [ ] Reseller runbook read — see [RESELLER-GUIDE.md](RESELLER-GUIDE.md)
- [ ] GMS fleet ops read — see [GMS-OPERATIONS.md](GMS-OPERATIONS.md)

---

## Licence enforcement

Licensing is commercial infrastructure, so it is enforced server-side rather than
in the UI.

- Every sale path — POS, restaurant, delivery, repair, service, rooms, rent, hire
  purchase, play, reloads — funnels through `createSale`, which calls
  `assertLicenceActive()` first.
- An expired licence returns **HTTP 422** with a clear message; the UI surfaces it
  and a banner links to the renewal screen.
- Reads, reports, exports and the super-admin console stay available, so a client
  can always see their data and renew.
- Plan gating is separate: `planEnabledKeys()` resolves which modules a plan
  unlocks, and locked tiles render a **🔒 Upgrade** badge. The reseller console and
  in-app help are reachable on every plan so you can never lock yourself out.

## Security

**Demo credentials cannot reach production.** The built-in `admin` / `admin123`
login exists only for offline evaluation. Configuring Supabase disables it in
three places at once:

- `POST /api/auth/login` returns **403** instead of minting a session.
- The proxy ignores the `pos_session` cookie, so a session created *before* the
  switch stops authorizing immediately.
- `/login` renders the Supabase account form rather than the demo hint.

There is no flag to re-enable it — presence of `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` is the switch.

**Authorization lives in the database.** The proxy guard is optimistic (it only
checks that a session exists). Real enforcement is Row-Level Security plus the
SECURITY DEFINER RPCs, so a forged or replayed request still cannot read or write
another organization's rows.

**Secrets.** `SUPABASE_SERVICE_ROLE_KEY`, `WHATSAPP_TOKEN` and printer addresses
are server-only and must never appear under a `NEXT_PUBLIC_` name — that prefix
inlines the value into the browser bundle. Rotate anything that has been exposed.

**GMS HQ.** `/hq` is for Grabber Mobility Solutions operators only. Gate with
`GMS_ADMIN_EMAILS` and/or Auth `gms_admin` metadata; keep the service-role key
off public storefront pages (anonymous catalog uses SECURITY DEFINER RPCs from
migration 0007). Runbook: [GMS-OPERATIONS.md](GMS-OPERATIONS.md).

## Operational notes

**Backups.** Supabase PITR covers the database. Nothing else holds state — the
app is stateless, so redeploys are safe at any time.

**Scaling.** All writes are per-row, so multiple app instances are safe. Sale
posting is a single atomic RPC, idempotent on `client_uuid`, which is also what
makes the mobile app's offline queue safe to retry.

**Monitoring.** `/api/health` reports which backend resolved. Watch it after
deploys: if it reports the local backend in production, the Supabase env vars did
not reach the runtime.

**Rollback.** Migrations are additive. Redeploy the previous build; the schema
stays compatible.

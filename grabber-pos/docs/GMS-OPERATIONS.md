# Grabber Mobility Solutions — Operations guide

For **Grabber Mobility Solutions (GMS)** staff who run the shared multi-tenant
fleet. Day-to-day work happens in **`/hq`** — not in a tenant's `/admin`.

Companion guides: [RESELLER-GUIDE.md](RESELLER-GUIDE.md) (commercials & handover),
[PRODUCTION.md](PRODUCTION.md) (cutover), [CUSTOMER-STOREFRONT.md](CUSTOMER-STOREFRONT.md)
(what you coach shop owners to do), [HQ-PLAYBOOK.md](HQ-PLAYBOOK.md) (day-to-day HQ),
[CLIENT-PLAYBOOK.md](CLIENT-PLAYBOOK.md) (hand to shop owners), [WHATSAPP.md](WHATSAPP.md).

---

## `/hq` vs `/admin`

| | `/hq` (GMS) | `/admin` (tenant) |
|---|---|---|
| Who | Grabber Mobility Solutions operators | Client owner / reseller acting *inside one workspace* |
| Scope | Whole fleet — tenants, licences, tickets, onboard | This organization's branding, plan, client list |
| Auth | `GMS_ADMIN_EMAILS` and/or `app_metadata.role = gms_admin` | Normal tenant session + plan |
| Data | Prefer `reseller_licences` via **service role** | RLS-scoped `app_documents` / tenant JSON |

Do **not** tell clients to bookmark `/hq`. Do **not** use `/admin` as a substitute
for fleet monitoring — it only sees the workspace you are logged into.

In-app hub: `/hq/docs` (points at these markdown files).

---

## What to monitor

Open **`/hq`** → Command center.

| Signal | Where | Action |
|--------|-------|--------|
| Tenant count / sales roll-up | Command center | Sanity-check after onboard or outage |
| Expired licences | Command center + **Licences** | Contact client; renew in their `/admin` or HQ tenant brand/licence tools |
| Expiring ≤14 days | same | Proactive renewal call |
| Open tickets | Command center + **Tickets** | Guide / escalate (inbox is a stub, not a full helpdesk) |
| Data source line | Command center footer | Must read `reseller_licences (service-role)` in production. If it says demo fallback, set `SUPABASE_SERVICE_ROLE_KEY` |

Per tenant (`/hq/tenants` → detail): period sales, stock health, branches,
users, storefront, WhatsApp, white-label brand, plan/expiry, and licence
suspend. Use this when a client reports “wrong logo,” “modules locked,” or
needs a password reset.

### Password reset (client staff)

On **tenant detail → Users & password reset** (live orgs only):

1. **Email reset** — generates a Supabase recovery link and emails it via Resend
   when configured; otherwise shows a one-time link for you to copy.
2. **Temp password** — forces a new temporary password, shown once in HQ. Share
   it securely; it is not stored afterward.

First-time owners still need `scripts/upsert-admin.mjs` to attach a login to an
org. Password tools only work after that Auth user exists.

---

## Fixing tenants

### Access & licence

1. Confirm they are on **production Supabase**, not demo JSON (see Do's / Don'ts).
2. Check licence status on `/hq/licences` or the tenant detail page.
3. Expired licence **blocks selling** (HTTP 422 on sale paths) but keeps reads and
   `/admin` available — renew plan/expiry, then ask them to retry a sale.
4. Locked modules show **🔒 Upgrade** on the launcher — raise plan or extras in
   the tenant console (`/admin`), not by hacking feature flags in the browser.

### Isolation & data

- Each client is an **organization**. Postgres **RLS** isolates rows by
  `current_org_id()`. Public storefront reads go through **SECURITY DEFINER**
  RPCs keyed by storefront slug/domain — never by giving shoppers a service-role
  key.
- If Tenant A sees Tenant B's data, treat it as a **P0** — stop, verify RLS is
  enabled (see [PRODUCTION.md](PRODUCTION.md)), and do not “fix” with the
  service role from a browser session.

### Onboarding

Use **`/hq/onboard`** (same wizard family as `/admin`, HQ mode) to put a client
into the pipeline. Still complete the catalog import, branding, and staff
training checklist in [RESELLER-GUIDE.md](RESELLER-GUIDE.md).

### Storefront issues

Coach the shop owner through [CUSTOMER-STOREFRONT.md](CUSTOMER-STOREFRONT.md):
Website CMS (`/website`), `online_visible` catalog, Click & collect / Delivery
boards. Confirm migration **`0007_storefront`** (and later) was applied.

---

## Guiding buyers & staff

- Point **cashiers / owners** at [USER-GUIDE.md](USER-GUIDE.md) and in-app **Help &
  guides**.
- Point **shop owners configuring the public shop** at
  [CUSTOMER-STOREFRONT.md](CUSTOMER-STOREFRONT.md).
- Point **resellers / delivery partners** at [RESELLER-GUIDE.md](RESELLER-GUIDE.md).
- Use **Tickets** (`/hq/tickets`) for lightweight guidance notes — escalate out
  of band when payment or legal issues appear.
- Be honest about MVP limits: payment/courier choices are **workflows** (cash /
  card-on-delivery / bank transfer; pickup / courier / PickMe / Uber *staff
  books*). No live PayHere capture or PickMe/Uber booking APIs in this pass.

---

## Access: `GMS_ADMIN_EMAILS` and friends

| Variable | Mode | Meaning |
|----------|------|---------|
| `GMS_ADMIN_EMAILS` | Supabase | Comma-separated emails allowed into `/hq` |
| Auth `app_metadata.role = gms_admin` (or `gms_admin: true`) | Supabase | Also grants HQ even if email list is empty |
| `GMS_ADMIN_USERS` | Demo JSON | Comma-separated demo usernames (defaults to `POS_USER` / `admin`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Unlocks cross-org `reseller_licences` views for HQ |

Rules:

- An **empty** `GMS_ADMIN_EMAILS` does **not** open HQ to every tenant owner —
  you need either an allowlisted email **or** `gms_admin` metadata.
- Never put the service-role key in `NEXT_PUBLIC_*` or client bundles.
- Rotate allowlists when staff leave.

See `.env.example` and [CREDENTIALS.md](CREDENTIALS.md).

---

## Do's

- **Do** run production clients on Supabase with all migrations (through
  **0007+**) and RLS verified.
- **Do** use `/hq` for fleet health; use each client's `/admin` only when acting
  inside that workspace.
- **Do** keep `SUPABASE_SERVICE_ROLE_KEY` server-side for HQ roll-ups and seed/
  admin scripts.
- **Do** confirm licence expiry and plan before blaming “bugs” for locked tiles
  or blocked sales.
- **Do** coach storefront setup via `/website` and Click & collect / Delivery —
  web orders land on those boards with fulfilment/payment metadata.

## Don'ts

- **Don't sell (or leave a paying client) on demo/JSON mode.** Demo is for
  evaluation only — not backed up, not multi-tenant, single-process files.
- **Don't share one instance / one org across unrelated businesses.** Each buyer
  gets their own organization (or a dedicated white-label deploy). Sharing
  breaks isolation, licensing, and support.
- **Don't disable or bypass RLS** to “make the storefront work.” Use the
  storefront RPCs and Website CMS; service role stays off public pages.
- **Don't put `SUPABASE_SERVICE_ROLE_KEY` in the browser** or hand it to clients.
- **Don't grant every tenant owner HQ access.** Maintain `GMS_ADMIN_EMAILS` /
  `gms_admin` metadata carefully.
- **Don't promise live card gateways or courier APIs** as shipped — modes +
  staff confirmation only until those integrations land.
- **Don't conflate `/hq` with `/admin`** when writing runbooks or training
  clients.

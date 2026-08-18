# GRABBER POS Studio — Reseller Guide

How to sell and deliver GRABBER POS Studio to your clients. The platform is built
for a **hybrid** model: a shared multi-tenant cloud for most clients, plus
dedicated white-label deployments for larger ones.

## The two deployment models

### 1. Multi-tenant cloud (default, lowest cost)

One hosted app. Each client is an **organization** with its own branches, staff,
catalog and sales — fully isolated by Postgres Row-Level Security. You update and
operate a single deployment for everyone.

Onboarding a client:
1. Create the client's **organization** + first **branch** + **owner** login
   (`npm run seed`), then record them via **Super-admin → Onboard a client**.
2. Import their catalog (Excel) — grocery / pharmacy / bookshop / hardware
   column layouts are accepted.
3. Set their **branding** (business name, logo, receipt header) in Settings.
4. Hand over the owner login; they add staff and start selling.

### 2. White-label deployment (per-client, maximum isolation)

A dedicated instance with the client's own domain, branding and (optionally) their
own Supabase project. Use this for clients who need data residency, a custom
domain, or heavy customization.

Delivering one:
1. Create a Supabase project for the client; apply `supabase/migrations`.
2. Deploy the web app to Vercel (or the client's host) with that project's env.
3. Set branding + license; point their domain at it.
4. Package the mobile app with the client's `--dart-define` config and branding.

See [DEPLOYMENT.md](DEPLOYMENT.md) for the technical steps.

## White-label branding

Per organization you can set (Settings → Business profile):

- Business **name** and **logo** (shown in-app and on receipts)
- **Accent colour** / theme
- **Receipt** header/footer, paper width (80/58mm), and whether to print a QR
- Currency, locale, timezone

The app is already themed through CSS design tokens, so a client's accent colour
propagates across every screen.

## Licensing & plans

Licensing is enforced by a per-workspace **license** (plan + expiry + extras) plus
**feature flags** per module/vertical:

- **Plan tiers** — *Starter* (core POS: retail, wholesale, products, inventory,
  reports), *Business* (Starter + every management module, no sale-mode verticals),
  *Enterprise* (the full platform — all verticals + modules).
- **Feature flags** — per-client **extras** unlock individual modules on top of the
  plan, so a Starter restaurant client can add just Restaurant mode. Plan → key
  resolution lives in `src/lib/plans.ts` (`planEnabledKeys`).
- **Expiry** — a license end date; expired licenses are flagged (`expired`) via the
  tenant API and can be surfaced in-app. The reseller console stays reachable on
  every plan so you can always renew or raise a plan.

Gated modules render with a **🔒 Upgrade** badge on the home launcher and can't be
opened until the plan is raised — enforced live by the `BrandProvider` context.

## Two consoles: `/hq` vs `/admin`

| Console | Who | Purpose |
|---------|-----|---------|
| **`/hq`** | Grabber Mobility Solutions (GMS) staff | Fleet portal — all tenants, licence monitor, onboard pipeline, tickets stub, docs hub |
| **`/admin`** | Client owner / reseller **inside one workspace** | White-label, licence, onboard, and client list for *this* organization only |

GMS operators: start at [GMS-OPERATIONS.md](GMS-OPERATIONS.md) and `/hq`. Do not
hand `/hq` to end customers. Storefront coaching for shop owners:
[CUSTOMER-STOREFRONT.md](CUSTOMER-STOREFRONT.md).

Access to `/hq` requires `GMS_ADMIN_EMAILS` (and/or Auth `gms_admin` metadata) —
see [PRODUCTION.md](PRODUCTION.md). Cross-org roll-ups need
`SUPABASE_SERVICE_ROLE_KEY` (server-only).

## Super-admin console — `/admin`

The **tenant** back-office, reachable from the **Reselling** launcher group
(Super-admin / Clients tiles). Same branding/licence tools also appear in
`/hq` for fleet operators acting on a tenant:

- **White-label this workspace** — set business name, logo URL and accent colour;
  changes apply live across the shell (topbar wordmark + accent design token).
- **Set the licence** — choose plan + expiry with a live **Licence summary** that
  shows exactly which modules are unlocked before you save.
- **Onboard a client** — a three-step wizard (Business → Plan → Review) that
  creates the client record and, for a dedicated deployment, applies their
  branding and licence to the instance in one action. It finishes with the
  provisioning checklist below. Fleet operators can also run this from
  **`/hq/onboard`**.
- **Manage client organizations** — a CRUD list of clients (name, contact, plan,
  expiry, status).

Config persists via `PUT /api/tenant` — `data/tenant.json` in demo mode, the
RLS-scoped `app_documents` row (`key = 'tenant'`) per organization in production.

### Enforcing the licence

An expired licence **stops the client selling** — every sale path checks
`assertLicenceActive()` and returns HTTP 422 with a plain-language message, and a
banner across the top links to the renewal screen. Reads, reports and the console
keep working, so the client can still see their data and you can renew without
locking anyone out. Plan gating is separate: locked modules show a **🔒 Upgrade**
badge on the launcher.

### Broadcasting updates

The **Help & guides** module carries release notes, notices and training video
links to every client on every plan.

> Fleet monitoring lives in **`/hq`** (command center, tenants, licence expiry
> alerts). It reads the `reseller_licences` view with the service role when
> configured; otherwise it falls back to demo client/tenant data. Full helpdesk
> billing is still thin — tickets in `/hq/tickets` are a guidance stub.

## Pricing model (suggested)

You set the commercials; a common structure for this market:

- **One-time setup** per client (provisioning, catalog import, training).
- **Monthly/annual subscription** per branch or per register, by plan tier.
- **Add-ons** — extra verticals, SMS credits, hardware (printers, scanners).

## Client onboarding checklist

- [ ] Organization + branch + owner login created
- [ ] Catalog imported (Excel) and spot-checked
- [ ] Branding set (name, logo, receipt, accent)
- [ ] Plan + feature flags + expiry configured
- [ ] Printers configured (receipt + KOT/BOT where used)
- [ ] Staff logins created with correct roles
- [ ] Owner + cashiers trained (see [USER-GUIDE.md](USER-GUIDE.md))
- [ ] If selling online: Website CMS + storefront smoke test (see [CUSTOMER-STOREFRONT.md](CUSTOMER-STOREFRONT.md))
- [ ] Mobile app installed on handhelds (if used)

## Support & updates

- All clients on the multi-tenant cloud get updates automatically when you deploy.
- White-label clients are updated per instance — keep a deployment list.
- Point clients at the in-app Help & guides module and the [User Guide](USER-GUIDE.md).
- GMS fleet ops: [GMS-OPERATIONS.md](GMS-OPERATIONS.md) and `/hq`.

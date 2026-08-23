# MyPoz HQ — Internal Operator Playbook

For **Grabber Mobility Solutions (GMS)** staff running the fleet at
[`/hq`](https://mypoz-and-store-ui.vercel.app/hq).

Companion docs: [GMS-OPERATIONS.md](GMS-OPERATIONS.md) ·
[RESELLER-GUIDE.md](RESELLER-GUIDE.md) · [WHATSAPP.md](WHATSAPP.md) ·
[CLIENT-PLAYBOOK.md](CLIENT-PLAYBOOK.md)

---

## 1. Who you are

| Item | Value |
|------|--------|
| Portal | `/hq` (not `/admin`) |
| Auth | Supabase login + `app_metadata.role = gms_admin` **or** email on `GMS_ADMIN_EMAILS` |
| Scope | All tenants, licences, tickets, WhatsApp fleet, onboard |

Do **not** share HQ credentials with shop owners. Clients use `/login` → their POS
workspace only.

---

## 2. Daily command center (`/hq`)

Check in order:

1. **Expired / expiring licences** — renew or suspend on tenant detail.
2. **Quiet shops** — products exist but no sales in 14 days → call the client.
3. **Open tickets** — triage in `/hq/tickets`.
4. **Low-stock orgs / live storefronts / WA attached** — fleet pulse widgets.
5. Footer **data source** must say `reseller_licences (service-role)`. If it says
   demo fallback, `SUPABASE_SERVICE_ROLE_KEY` is missing on Vercel.

---

## 3. Onboard a new client (happy path)

1. **`/hq/onboard`** — create pipeline client + optional organization.
2. Or run `scripts/provision-tenant-owner.mjs` with their email/password/org slug
   (service DB / service role).
3. Confirm they appear on **`/hq/tenants`**.
4. Open tenant detail → set **brand**, **plan**, **expiry**, **extras**.
   - Prefer **Business+** so owners get **Shop knowledge** (`/knowledge`) for Jarvis.
   - On Starter, add extra `knowledge` (or `whatsapp`, verticals) as sold.
5. Attach WhatsApp phone number id on **`/hq/whatsapp`** (if they bought WA).
6. Hand them [CLIENT-PLAYBOOK.md](CLIENT-PLAYBOOK.md) + login URL.
7. First login: they open Products, import catalog, open register, sell one test bill.
   Business owners: also harvest `/knowledge` once.

### Password help (existing clients)

On **tenant detail → Users & password reset**:

- **Email reset** — recovery link (Resend if configured).
- **Temp password** — shown once; share securely.

First-time owners still need Auth → org attach (upsert / provision scripts).

---

## 4. Tenant god’s-view checklist

On `/hq/tenants/[id]`:

| Section | Use when |
|---------|----------|
| Period sales / by source | “Sales not showing” / quiet shop |
| Stock health | Low / out of stock escalations |
| Branches & users | Staff access issues |
| Storefront slug / open orders | Online shop stuck |
| WhatsApp attached? | Bot not answering |
| Suspend / unsuspend | Non-payment (live orgs) |
| Soft-remove | **Demo clients only** — never hard-delete live orgs |

---

## 5. WhatsApp fleet

See [WHATSAPP.md](WHATSAPP.md). Short version:

1. Platform env: `WHATSAPP_*` on Vercel + Meta webhook → `/api/whatsapp/webhook`.
2. Per tenant: attach `phoneNumberId` (+ optional token) in `/hq/whatsapp`.
3. Test: customer texts `hi` → numbered menu; order lands as `source=WHATSAPP`.
4. Detach when churning a number.

Treat WA as **beta for fleet** until Meta templates + staff reply are live.

---

## 6. Support tickets

`/hq/tickets` — create, update status/priority, delete noise. Not a full helpdesk;
use for GMS internal tracking.

---

## 7. Licence & billing ops

- Edit plan/expiry/extras on tenant detail.
- Licence PayHere / bank invoice paths live under tenant billing when configured
  (`PAYHERE_*`, `MYPOS_BANK_INSTRUCTIONS`, `RESEND_*`).
- Suspend blocks selling (HTTP 422 on sale paths); reads/`/admin` stay available.

---

## 8. Go-live / launch gate (GMS)

Before marketing a tenant as live:

- [ ] Vercel has Supabase URL + anon + **service role** + `NEXT_PUBLIC_APP_URL`
- [ ] `GMS_ADMIN_EMAILS` includes HQ operators
- [ ] Supabase Auth Site URL + redirect allowlist includes production host
- [ ] Migrations applied (incl. storefront + WhatsApp `0014`)
- [ ] At least one payment path or bank-transfer proof flow tested
- [ ] `/api/health` healthy while logged in
- [ ] One POS sale + one storefront order smoke-tested
- [ ] WhatsApp only promised if Meta credentials + attach + inbound test passed

---

## 9. Don’ts

- Don’t invent client passwords in chat logs — use HQ reset UI.
- Don’t give clients the service role key.
- Don’t use `/admin` as a substitute for fleet monitoring.
- Don’t hard-delete production organizations from HQ.

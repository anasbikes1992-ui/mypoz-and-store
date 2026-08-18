# MyPoz operating manual

**Product:** MyPoz Commerce Cloud — one POS, one online store, one inventory, one order ledger, plus official WhatsApp Cloud API ordering.

**Canonical app:** `grabber-pos/`  
**Do not** nest `D:\Whats App Auto` or add a second Prisma database. WhatsApp Auto domain logic lives in this app.

---

## 1. Two planes

| Plane | Who | Login home | Job |
|---|---|---|---|
| **MyPoz HQ** | You (super admin) | `/hq` | Registered clients, licences, onboard, tickets, WhatsApp fleet |
| **Client tenant** | Shop that pays you | Tenant app (`/`, `/admin`, `/pos`) | Their business only |

A client **owner** is that shop’s admin. That is not HQ super admin.

---

## 2. Super admin workflow

1. Sign in with an email on `GMS_ADMIN_EMAILS` **or** `app_metadata.role = gms_admin`.
2. Open `/hq` — command center (tenant count, licences, storefront, WhatsApp env).
3. **Onboard** a client at `/hq/onboard` (org + branch when service-role is set). Hand them owner credentials via the documented `scripts/upsert-admin.mjs` — HQ never invents passwords.
4. **Tenants** `/hq/tenants` — search, licence, brand. Detail page edits plan/expiry.
5. **WhatsApp fleet** `/hq/whatsapp` — attach each client’s Cloud API **phone number id** (and optional token). One Meta app, one webhook `/api/whatsapp/webhook`, routed by `phone_number_id`.
6. **Tickets / docs** — support and in-app manuals.
7. Do **not** take POS sales as that client unless you use a dedicated support impersonation path (not in MVP).

Platform secrets stay in environment / HQ. Never ship `WHATSAPP_TOKEN` or `SUPABASE_SERVICE_ROLE_KEY` to the browser.

---

## 3. Client owner workflow

1. Log into the tenant app (not `/hq`).
2. **Settings** — business name, address, tax, receipts.
3. **Users** — owner / manager / cashier (owner maps to admin permissions).
4. **Products + inventory** — canonical catalogue. Mark items online-visible for the store.
5. **Commerce** — themes, builder, publish. Preview `/store/{slug}`.
6. **WhatsApp** `/whatsapp` — phone number id, language (EN / SI / TA), location, offers, optional org token. Inbox shows Cloud API threads. Option 6 marks **Staff**.
7. **Orders** — POS, online (`ONLINE_STORE`), and WhatsApp (`WHATSAPP`) share `sales` / `sale_lines` / stock.

---

## 4. Staff workflow (manager / cashier)

1. Open **Retail** (or wholesale / category) sale.
2. Search is a compact list; extras on the bill sit behind **More**.
3. Fulfill online and WhatsApp orders from Commerce Orders / Click & collect / Delivery. Status changes can ping the customer on WhatsApp.

Cashiers cannot change Cloud API tokens or onboard tenants.

---

## 5. Shopper (their customer)

- Storefront `/store/{slug}` — cart, checkout, COD/card.
- WhatsApp: hi → 1 Order / 2 Menu / 3 Offers / 4 Location / 5 Track / 6 Staff. Checkout posts a sale with `source = WHATSAPP` (or a POS hold if posting fails).

Currency: LKR. Phones: E.164 `+94…`.

---

## 6. Settings CRUD map

| Layer | What | Where |
|---|---|---|
| HQ platform | Clients, licences, Meta webhook, fleet attach | `/hq/*` |
| Client business | Profile, staff, permissions, register | `/settings`, `/users`, `/permissions` |
| Client commerce | Themes, pages, payments, delivery | `/commerce/*`, `/website` |
| Client WhatsApp | Number, locale, copy, inbox | `/whatsapp` |

---

## 7. Apply database

On the Anaz Supabase project run migrations `0001`–`0014` in order, including `grabber-pos/supabase/migrations/0014_whatsapp_orders.sql` (`whatsapp_create_order`).

Empty org after login: `grabber-pos/docs/ADMIN_PROVISIONING_GUIDE.md`.

---

## 8. Out of scope for this codebase

SaaS billing, theme marketplace, media library, discount-code engine, DNS verify job — listed in `MYPOZ_BUILD_STATUS.md`. Do not copy Whats App Auto payments/Prisma/storefront; MyPoz already has those channels.

# GRABBER POS Studio — Complete Feature & Build Plan

**Goal:** ship GRABBER POS Studio as a multi-vertical business-management + POS
platform — cleaner UI, durable backend, packaged for **reselling to clients**
(build docs + user docs + licensing).

## Source of truth

Module inventory is maintained against `src/lib/modules.ts` and live
`src/app/(app)/**/page.tsx` routes. Status markers track delivery.

Status: ✅ built · 🟡 thin but present · ⬜ truly missing

Audited against the app (not this file’s prior roadmap guesses). See also
[PRODUCT-GAP.md](PRODUCT-GAP.md) (gaps closed) and [CREDENTIALS.md](CREDENTIALS.md)
(env handoff).

---

## 1. Operation / Sale modes (home launcher)

The home launcher is a tile grid of **sale modes** — the same catalog + billing
engine specialized per vertical. This is the platform's defining feature.

| Mode | Purpose | Vertical | Status |
|------|---------|----------|--------|
| Retail Mode | Standard barcode retail billing | shops | ✅ `/pos` |
| Wholesale Mode | Wholesale pricing on shared terminal | wholesale | ✅ `/pos?mode=wholesale` |
| Category Sale Mode | Sell by category grid (no barcodes) | cafes, apparel | ✅ `/pos?mode=category` |
| Restaurant Mode | Tables, KOT/BOT, courses | food & beverage | ✅ `/restaurant` + `/tables` + `/kds` |
| Delivery Mode | Orders for delivery + driver assign | food, retail | ✅ `/delivery` + `/drivers` |
| Repair Mode | Item repair intake → job → billing | electronics, phones | 🟡 `/repair` (JobBoard) |
| Vehicle Service Mode | Vehicle service jobs + parts + labour | garages | 🟡 `/service` (JobBoard) |
| Reloads | Mobile top-ups / reload sales | comms shops | ✅ `/reloads` |
| Room Management | Hotel/guesthouse room booking + billing | hospitality | 🟡 `/rooms` (BookingBoard) |
| Rent Mode | Rental items, periods, returns, deposits | equipment rental | 🟡 `/rent` (BookingBoard) |
| Hire Purchase | Installment sales + schedules | appliances, furniture | ✅ `/hire-purchase` |
| Play Area | Time-based play sessions billing | kids play centres | ✅ `/play` |
| Layaway | Deposits & holds | retail | ✅ `/layaway` |
| Click & collect | Pick list (+ web orders) | retail | ✅ `/click-collect` |
| Public storefront | Online catalog + checkout | retail | ✅ `/store/[slug]` + `/website` |
| Register / Other Mode | Misc/other sale | any | ⬜ (cash **Register** at `/register` is shift/Z — not this mode) |
| Digital Mode | Digital-goods sale | any | ✅ `/digital` |
| **Offline Mode** | Bill without internet, sync later | all | 🟡 web SW + offline queue; Flutter offline POS separate |

> The **billing engine** (below) is shared; each mode adds its own entities and
> pre/post steps (a table, a room, a repair job, an installment plan…).

---

## 2. The billing engine — confirmed spec

The core screen every mode reuses (`/pos`, BillPanel + cart store).

**Cashier bar** — cashier name, date, back/home/history.
**Item entry** — searchable barcode dropdown; non-stock / custom lines; Retail⇄Wholesale
toggle; per-line discounts → **Add (CTRL)**.
**Cart / Billed items** — line list, Sub-total, Total (LKR).
**Charges & discount** — Service charge, Final Discount (Rs / %).
**Payment** — Payment Type (F1), Customer (F2), Employee (F3), Customer paid (F4),
Balance; split tender (cash + card); gift-card balance check.
**Actions** — Cancel · **Proceed (INSERT)** · Hold / Recall. Keyboard: F1–F4, CTRL, INSERT.

Status vs GRABBER today: **shipped** — cart, per-unit discount cap, service charge &
final discount, F-key shortcuts, none-stock items, split tender, held bills, cash/change,
customer + loyalty redeem, print / WhatsApp, retail⇄wholesale, manager PIN on large
discount / price override, serials, multi-currency tender, training mode. See
[PRODUCT-GAP.md](PRODUCT-GAP.md) §2.

---

## 3. Product management — confirmed spec

Toolbar: **Add** (form) · **Import / Export Excel** · search. Separate modules for
**Barcode labels**, **Packages**, **Variants**, **Brands**, **Categories**.

Status: list + search + add/edit/delete ✅ · Excel in/out ✅ · barcode/label print ✅
(`/barcode`, multi-select + size templates) · packages 🟡 · variants ✅ · brands ✅ ·
legacy “Pending / P.Settings / Global” tabs ⬜ (not mirrored 1:1).

---

## 4. Management modules — confirmed full list

Grouped for delivery. Active tiles in `modules.ts` link to live screens (many CRUD
modules use shared `CollectionManager` / boards — functional, not always deep UX).

**Catalog & stock**
Products ✅ · Category ✅ · Brands ✅ · Suppliers ✅ · GRN ✅ · Purchasing Orders ✅ ·
Damages ✅ · Returns ✅ · Packages 🟡 · Variants ✅ · Inventory ✅ · Stocktake ✅ ·
Transfers ✅ · Barcode labels ✅.

**Sales & billing**
Sales history ✅ `/sales` · Quotations ✅ · Manual Payments ✅ · Gift Vouchers ✅ ·
Layaway ✅ · Click & collect ✅ · Digital Mode ✅ · Memberships ✅ · CRM lite 🟡 · standalone “Bills” module ⬜
(covered by Sales) · Points (loyalty) 🟡 (via customers / redeem on POS).

**Customers**
Customers ✅ · Appointments ✅ · SMS templates ✅ · Points 🟡 · Memberships ✅ · CRM lite 🟡.

**Staff / HR**
Employees ✅ · Attendance ✅ · Salary ✅ · Users & admins ✅ · Permissions ✅ ·
Jobs ✅ · Register (open/close / X·Z) ✅.

**Money**
Income ✅ · Expenses ✅ · Cash In ✅ · Cash Out ✅ · Currency ✅.

**Operations**
Tables ✅ · Rooms 🟡 · Delivery + drivers ✅ · Play Area ✅ · Repair / Service 🟡 ·
Hire Purchase ✅ · Rent 🟡 · Restaurant + KDS ✅ · Reloads ✅.

**Reports & system**
Dashboard ✅ · Reports ✅ · Alerts ✅ · Audit log ✅ · Settings ✅ · Help & guides ✅ ·
Customer display ✅ `/display` · Privacy purge ✅ · Super-admin / licensing ✅ `/admin` ·
Website CMS ✅ `/website` · GMS HQ ✅ `/hq` (god-view monitor + CRUD) ·
Drivers & Softwares (downloads hub) ⬜ · Agreement (dedicated screen) 🟡 (licence in admin) ·
Clear Data (full wipe) ⬜ (PII purge only).

---

## 5. Data-model additions (beyond the current schema)

Current schema already covers: organizations, branches, profiles, products,
barcodes, categories, suppliers, branch_stock, stock_movements, purchases(=GRN)
+ lines, registers, shifts, sales + lines, payments, audit, plus later migrations
for `app_collections`, `app_documents`, stock documents, product images,
reseller licences.

Many vertical / CRM / HR entities are stored via **app collections** rather than
dedicated tables — enough for ship; deepen schema when a vertical needs reporting
or RLS-grade isolation.

Still optional dedicated tables (if you outgrow collections):

- **Catalog**: richer `packages` / `product_variants` (SKU matrix UI already exists).
- **Stock**: first-class `sale_returns`, `damages`, `purchase_orders` (UI present).
- **Customers**: `loyalty_points` ledger, `gift_vouchers`, `appointments`, `sms_log`.
- **HR**: `employees`, `attendance`, `salaries`.
- **Money**: `expenses`, `cash_movements`, `currency_rates`.
- **Verticals**: `tables`, `rooms`, deliveries, play/repair/hire/rent entities.
- **System**: `settings`, `quotations`, `notifications`, `licenses` (partially present).

---

## 6. Reselling / white-label (new requirement)

To sell to clients, the platform needs:

- **Tenant provisioning** — admin/HQ-created org per client. 🟡
- **White-label** — per-org business name, logo, colors, receipt branding. ✅ `/admin` + `/hq` tenant brand
- **Licensing** — plan tiers, feature flags, expiry; server-side sell block. ✅ stub + enforce
- **Tenant super-admin** — branding / licence / clients for one workspace. ✅ `/admin`
- **GMS fleet HQ** — tenants god-view monitor, licence suspend, onboard, durable tickets, WhatsApp attach/detach, HQ password reset, Jarvis agentic tools, docs. ✅ `/hq`
- **Client onboarding** — wizard + Excel import + docs. 🟡 (wizard present; deepen as needed)
- **Storefront** — Website CMS + public shop + catalog feeds. ✅ `/website`, `/store/[slug]`

Hybrid model: multi-tenant SaaS **and** per-client white-label deploys — see
[RESELLER-GUIDE.md](RESELLER-GUIDE.md) and [GMS-OPERATIONS.md](GMS-OPERATIONS.md).

---

## 7. Delivery roadmap (status)

**P0 Foundation** ✅ — multi-tenant schema, atomic sales, RLS, web POS + inventory +
sales + dashboard, offline queue / SW, docs, tests.

**P1 Core billing parity** ✅ — service charge, final discount, F-keys, none-stock,
split / hold, products CRUD + Excel, barcode labels, brands, packages (thin), variants.

**P2 Commerce core** ✅ — Customers, vouchers, returns, damages, quotations, GRN,
purchase orders, suppliers (collection depth varies).

**P3 Money & HR** ✅ — Expenses, income, cash in/out, currency; employees, attendance,
salary, users/roles + permissions UI.

**P4 Reports & dashboard** ✅ — dashboard, reports module, alerts, exports (deepen charts as needed).

**P5 Verticals** 🟡 — Restaurant/KDS/delivery/reloads/hire/play ✅-ish; repair/service/rooms/rent thin boards; Digital ✅; Register/Other modes still ⬜. Memberships ✅ · CRM lite 🟡.

**P6 Reselling** 🟡 — `/admin` branding & licence + gating; `/hq` fleet portal shipped; onboarding wizard present; Agreement polish open.

**P6b Storefront** ✅ — Website CMS, themed `/store/[slug]`, checkout modes, customer accounts, C&C/Delivery bridge, catalog/feeds export (no live PayHere/courier APIs).

**P7 Settings, notifications, SMS, help** ✅ — settings, alerts, SMS templates, help; dedicated “Drivers & Softwares” hub ⬜.

**P8 Hardening & launch** 🟡 — typecheck/tests/docs present; production cutover awaits real Supabase / WhatsApp / printer credentials ([CREDENTIALS.md](CREDENTIALS.md)). Include migration **0007+** and `GMS_ADMIN_EMAILS` when enabling storefront + HQ.

**Documentation (parallel):** USER / RESELLER / GMS-OPERATIONS / CUSTOMER-STOREFRONT /
PRODUCTION / DEPLOYMENT / FEATURE-PLAN / PRODUCT-GAP / CREDENTIALS — in `docs/`.

---

## 8. Confirmed by the screens (previously ⚠, now resolved)

- Restaurant/table mode **yes** (Rest MOD + Tables + KDS). KOT/BOT confirmed.
- Customer credit/loyalty **yes** (Customers, redeem on POS).
- Discounts: per-line max + Your Rs/% **and** final Rs/% + service charge.
- Multi-branch, multi-vertical, wholesale toggle, employee-on-sale — all yes.
- Roles: Users & Permissions modules (PIN, idle lock, matrix, per-user overrides).

## 9. Still worth a look (optional, to refine)

Polish thin vertical boards (repair / service / rooms / rent), Agreement / Drivers hub,
live payment/courier APIs if required, and collection → first-class schema where
reporting demands it. Digital Mode ✅ · Memberships ✅ · CRM lite 🟡. Not blocking
production cutover once credentials are in.

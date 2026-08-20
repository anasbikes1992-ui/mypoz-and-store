# GRABBER POS Studio — User Guide

For cashiers, managers and owners. Covers the live web screens — retail POS plus
the other sale modes and back-office modules below. Plan-gated tiles show a
**🔒 Upgrade** badge until your licence unlocks them.

Quick start for shop owners: [CLIENT-PLAYBOOK.md](CLIENT-PLAYBOOK.md).
GMS operators: [HQ-PLAYBOOK.md](HQ-PLAYBOOK.md).

## Signing in

1. Open the app (desktop browser, or the installed app).
2. Enter your **email/username** and **password**.
3. You land on the **Home launcher**.

> Demo build credentials: `admin` / `admin123`. Your reseller sets real logins.

## Home — the launcher

The home screen is a grid of tiles, grouped into:

- **Sale modes** — how you sell: **Retail**, **Wholesale**, **Category**,
  Restaurant, Delivery, Repair, Vehicle service, Reloads, Rooms, Rent, Hire
  purchase, Play area, Layaway, Click & collect (and related boards). Unlocked
  tiles open immediately; locked ones show **🔒 Upgrade**.
- **Business** — Products, Inventory, Customers, Suppliers, Purchases, Returns,
  Expenses, Settings, and the other management modules on your plan.
- **Insights** — Dashboard, Sales, Reports.

The top bar has your **Home** button and **Sign out**. Inside any screen, the
**←** (back) and **⌂** (home) buttons return you.

## Making a retail sale

Open **Retail** (or **Wholesale**) from the launcher.

1. **Find the item** — scan a barcode, or type a name/brand in the search box.
   Scanning (type the code then press **Enter**) adds the item instantly.
   You can also tap any product tile, or filter by category chip.
2. **Build the bill** — items appear under **Billed items** on the right. For each
   line use **−/+** to change quantity, and enter a per-unit **discount** (capped
   at that product's maximum).
3. **Retail vs Wholesale** — the toggle top-right switches pricing for the whole
   bill.
4. **Charges & discounts** — add a **Service charge**, and a whole-bill **Final
   discount** in Rupees or as a **%** (they stay in sync).
5. **Customer** — optionally record **Customer name**, **Mobile**, and the serving
   **Employee**.
6. **Customer & loyalty** — search a saved **loyalty customer** (their points
   balance shows), or type a walk-in name/mobile. When a loyalty customer is
   selected you can **redeem points** — the value comes off the bill, and on
   completion they **earn points** on what they spend (rates set in Settings →
   Loyalty). The success panel shows the points earned/redeemed and new balance.
7. **Payment** — choose **Cash** or **Card**. For cash, enter **Customer paid** and
   the **Balance** (change) is shown.
8. **Proceed** — press the green **Proceed** button. From the success panel you
   can then **print the receipt** (thermal), open the **Invoice PDF**, or **send
   the invoice on WhatsApp**. You'll see the receipt number,
   total and change. Press **New sale** to start the next bill.

The total is always computed as:
`items − item discounts − final discount + service charge`. Prices and discount
caps are re-checked on the server, so a bill can't be under-charged by mistake.

## Managing products

Open **Products** from the launcher.

- **Search** by name, barcode or brand.
- **+ Add product** — opens a form: name (and local-language name), barcode(s),
  brand, category, cost/sale/wholesale price, max & default discount, quantity,
  expiry date, warranty, supplier. Save to add it to the catalog.
- **Edit** — change any field on an existing product.
- **Delete** — remove a product (with confirmation).

Each product card shows its price, wholesale price, and a stock badge
(**in stock / low / out**).

### Bulk import / export (Excel & CSV)

The **Bulk catalog** bar at the top of Products handles large catalogs:

- **Import Excel / CSV** — upload a spreadsheet to add or update products in bulk.
  Grocery, pharmacy, bookshop, and hardware column layouts are accepted —
  headers are matched automatically, and products already in the catalog are
  matched **by barcode** and updated (so re-importing is safe).
  You'll see a summary: how many were added, updated, or skipped.
- **Export Excel** — download your whole catalog as an `.xlsx`.
- **Download template** — a blank spreadsheet with the right columns and two
  example rows, to fill in and import.

## Restaurant mode

Open **Restaurant** from the launcher to run table service:

1. **Set up your floor** — **Manage tables** (or the Tables module) to add tables
   with a name/number, area, and seats.
2. **Open a table** — the floor shows every table; free tables are grey, occupied
   ones show their running total. Tap a table to open its order.
3. **Build the order** — search the menu on the left and tap items to add them.
   Adjust quantities on the right. New (unsent) items show a **"+N new"** badge.
4. **Send to Kitchen / Bar** — press **Send Kitchen** (KOT) or **Send Bar** (BOT)
   to fire the new items to the relevant printer. Already-sent items aren't
   re-sent, so you can keep adding and firing as the meal goes on.
5. **Settle & pay** — take payment; the order becomes a sale, the receipt is
   available, and the table is freed for the next guest.

The order for each table is saved on the server, so you can move between tables
(or devices) without losing anything.

## Delivery mode

Open **Delivery** to run delivery orders:

1. **New delivery** — starts an order. Enter the **customer**, **phone**, and
   **address**, and assign a **driver** (managed under Delivery drivers).
2. **Build the order** — add menu items, adjust quantities, and **Send to Kitchen**
   (new items only).
3. **Track status** — move the order through **New → Preparing → Out → Delivered**
   with the status pills.
4. **Settle & pay** — take payment; it becomes a sale (with the customer attached),
   the receipt is available, and the order leaves the active list.

The **Delivery** board shows every active order with its status, driver and total.

## Repair & Vehicle service

**Repair** and **Vehicle service** share the same job workflow:

1. **New job** — start a job and record the **customer**, **phone**, the
   **item / serial** (repair) or **vehicle no. / model** (service), and the
   **reported issue**.
2. **Add parts** — search the catalog and add the parts used (from stock).
3. **Add labour** — add custom labour/service charges (description + amount).
4. **Track status** — **Received → In progress → Ready → Collected**.
5. **Collect & pay** — take payment; the job is billed (parts + labour) as a sale
   with the customer attached, the receipt is available, and the job closes.

## Rooms & Rent

**Rooms** (hotel) and **Rent** (equipment) share a booking flow:

1. **New booking / rental** — record the **customer**, the **room** or **item**,
   the **rate** (per night / per day), the **date range**, and a refundable
   **deposit**.
2. **Extras** — add extra charges (room service, add-ons) as needed.
3. **Track status** — **Booked → Active → Closed**.
4. **Check out / Return & settle** — the bill is **duration × rate + extras**
   (the deposit is held separately, not charged); it becomes a sale with the
   customer attached and the booking closes.

The board shows every active booking with its dates, status and running total.

## Reloads, Play area & Hire purchase

- **Reloads** — sell a mobile top-up: pick the **provider**, enter the **number**
  and **amount** (or a quick-amount), and sell. Recent reloads are listed.
- **Play area** — **Check in** a guest with an hourly **rate**; the card shows
  live elapsed time and running charge. **Check out** bills the time as a sale.
- **Hire purchase** — create an installment **agreement** (customer, item, total,
  down payment, number of installments); the suggested installment is computed.
  **Record payment** as each installment comes in — the balance and progress bar
  update, and the agreement completes when it's paid off.

## Category mode

**Category** opens the POS with category-first browsing — tap a category, then
tap items to build the bill. It's the retail billing engine, optimised for menus
and shops without barcodes.

## Barcode labels

Open **Barcode labels** to print shelf/product labels. Search and add products,
set how many labels of each you need, toggle whether to show the name and price,
then **Print** — the sheet prints as a grid of scannable CODE128 barcode labels.

## Invoices & WhatsApp

After completing a sale, the success panel offers:

- **Invoice PDF** — opens a clean one-page PDF invoice (business header, line
  items, totals, payment) that you can save or print.
- **WhatsApp invoice** — sends that PDF to the customer's WhatsApp. Enter (or
  confirm) the customer's number and it's delivered via the WhatsApp Business
  API. This requires your WhatsApp Business credentials to be configured
  (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`); until then the button explains
  what's needed. Set the default country code under **Settings → WhatsApp**.

## Users, roles & security

Open **Users & admins** to manage staff logins and their **role**:

- **Owner** — full access, including users, branches and settings.
- **Manager** — catalog, stock, purchases and reports; no user management.
- **Cashier** — POS billing and their own shift only.

In the production (Supabase) setup, each user is a real login and access is
enforced by the database itself (Row-Level Security), so a user only ever sees
their own organization's data, and role limits are enforced on the server — not
just hidden in the UI.

## Categories, Brands, Suppliers, Customers, Expenses

Each of these opens a simple manager: search, **+ Add**, **Edit**, **Delete**.

- **Categories / Brands** — organise your catalog.
- **Suppliers** — name, phone, email, address.
- **Customers** — name, mobile, email, **credit limit**, **loyalty points**,
  address. (Recording a customer name/mobile on a sale happens on the POS.)
- **Expenses** — title, category, amount, date, note — for tracking spending.

## Reports

Open **Reports** for an at-a-glance analysis of your sales: total **revenue**,
number of **sales**, **average sale**, **items sold**, a **7-day revenue** chart,
a breakdown **by payment method**, and your **top products**.

## Inventory

Open **Inventory** for a full table of products with **cost**, **price**,
**stock** and **expiry** — with colour cues for **low stock** (amber) and
**expired** (red). Search and paginate through the catalog.

## Sales history

Open **Sales** to see recent transactions. Tap any sale to expand its line
items. The **Dashboard** summarises today's revenue, total revenue, stock value,
and items needing attention.

## Offline (mobile)

On the **mobile app**, if the internet drops during checkout the sale is saved on
the device and syncs automatically when you're back online — you're never blocked
from billing. Each sale is de-duplicated, so a retry never charges twice.

## Tips

- Barcode scanners work anywhere the search box is focused — scan and it adds.
- Use **Wholesale** for trade customers to switch every line to wholesale price.
- The **max discount** on a product prevents cashiers from over-discounting.

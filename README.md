# MyPoz Commerce Cloud

**Run your shop with MyPoz. Sell online with MyPoz.**

This folder is the all-in-one product: the existing MyPoz / Grabber POS engine plus the online store, sharing one catalogue, one inventory, and one order ledger.

| Surface | Path | Role |
|---|---|---|
| POS + back office | [`grabber-pos/`](grabber-pos/) | Counter, inventory, staff, commerce admin, **WhatsApp inbox** |
| Public storefront | `/store/<slug>` | Themes, cart, checkout |
| MyPoz HQ | `/hq` | Super admin: clients, licences, WhatsApp fleet |
| Handheld POS | [`grabber-pos-mobile/`](grabber-pos-mobile/) | Flutter companion |
| Data | `grabber-pos/supabase/` | Postgres + RLS — canonical products, stock, sales |

The online store is a **sales channel of MyPoz**, not a second product database.

## Quick start

```bash
cd grabber-pos
npm install
npm run dev
```

Open:

- POS launcher: http://localhost:3000
- Demo login: `admin` / `admin123` (demo mode, no Supabase)
- Store: http://localhost:3000/store/main-store
- Client WhatsApp: http://localhost:3000/whatsapp
- Super admin HQ: http://localhost:3000/hq (allowlisted emails only)

## Documentation

| Doc | Purpose |
|---|---|
| [`docs/MYPOZ_OPERATING_MANUAL.md`](docs/MYPOZ_OPERATING_MANUAL.md) | Super admin vs client owner vs staff |
| [`docs/WHATSAPP.md`](docs/WHATSAPP.md) | Cloud API webhook, bot, per-client numbers |
| [`docs/MYPOZ_COMMERCE_ARCHITECTURE_V1.md`](docs/MYPOZ_COMMERCE_ARCHITECTURE_V1.md) | Frozen architecture |
| [`docs/MYPOZ_BUILD_STATUS.md`](docs/MYPOZ_BUILD_STATUS.md) | Phase tracker |
| [`grabber-pos/docs/ADMIN_PROVISIONING_GUIDE.md`](grabber-pos/docs/ADMIN_PROVISIONING_GUIDE.md) | Attach an owner to an org |

Whats App Auto is **not** a second app in this repo. Bot and webhook live in `grabber-pos`.

## What is unified

- Products you manage in POS appear on the storefront (online-visible items).
- A POS sale and an online order both decrement the same stock.
- Online orders land in MyPoz (Click & collect / Delivery boards + Commerce ? Orders).
- Themes, pages, and sections are presentation only. Checkout revalidates price and stock on the server.

## Themes

Minimal ? Fashion ? Market ? Food ? Luxury ? Local Business ? different layout and product cards, not recolors.

## Master roadmap

Implementation follows the unified commerce architecture ? **one POS, one inventory, one order ledger**:

| Doc | Purpose |
|---|---|
| [`docs/MYPOZ_COMMERCE_ARCHITECTURE_V1.md`](docs/MYPOZ_COMMERCE_ARCHITECTURE_V1.md) | Frozen architecture + non-negotiable rules |
| [`docs/MYPOZ_BUILD_STATUS.md`](docs/MYPOZ_BUILD_STATUS.md) | Live phase tracker (Phases 0?13+) |
| [`docs/MYPOZ_COMMERCE_GAP_ANALYSIS.md`](docs/MYPOZ_COMMERCE_GAP_ANALYSIS.md) | Discovery gap analysis |

**MVP 1 flows now live:**

- `/commerce/onboarding` ? launch store in minutes
- `/commerce/builder` ? visual store editor
- `/commerce/navigation` ? header/footer menu editor
- `/store/<slug>/cart` + `/checkout` ? dedicated checkout with delivery + COD fees
- `/commerce/orders` ? online order center with filters

**Apply new DB migrations** (when using Supabase):

```bash
cd grabber-pos
npx supabase db push   # or run 0009?0012 in order
```

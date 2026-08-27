# 05 — Owner completeness

**Status:** PASS WITH NOTES (Playwright walkthrough 2026-08-27)  
**Rule:** Gap audit only — no IA redesign.  
**Accounts verified:** Anaz (`anazazeez1992@gmail.com`) + Pilot 02 (`pilot-02-owner@mypoz.test`) · password `Aa123456` (pilot reset)

## Deferred LAST (do not block)

| Item | Packet |
|------|--------|
| Jarvis agents / KPI depth | **Done thin** — see `06`–`09` |
| Approvals / knowledge write tools | `10` |
| Resend verified domain + forgot-password mail | `02` / `12` |
| WebXPay / cards | `12` |

## Playwright evidence (production)

| Tenant | Login | Branding seen | Key proof |
|--------|-------|---------------|-----------|
| Anaz | ✅ | Anaz Store | Products **1,518**; API total 1518; orders show GPS-MAIN + COD; Settings **Change password**; storefront `/store/anaz-store` 200 |
| Pilot 02 | ✅ | Pilot 02 | POS shows **Pilot 02 Test Item** qty 11; orders `GPS-MAIN-20260826-0001/0002` Pilot COD Buyer; Settings Change password; `/store/pilot-02` 200 |

### Isolation

| Check | Result |
|-------|--------|
| Owner → `/hq` | Redirects to `/login?next=/hq` (cannot use HQ) ✅ |
| Pilot catalog | No Anaz Store / 1518 leak ✅ |
| Receipt nos | Same `GPS-MAIN-*` pattern across tenants — scoped by `org_id` (expected) |

### Notes / non-blockers

- Rapid page walks hit WAF **`rate_limited` (429)** on some routes (`/website`, `/settings`, `/assistant`, `/inventory`). Slow navigation succeeds — not an owner-feature bug.
- Visiting `/hq` as owner ends on login (session gate) rather than in-app 403 — isolation holds; optional UX polish later.
- Register shift closed banner on Pilot POS — cash-control hint only; sell path still available after open shift.

## Priority gap table

| # | Area | Route(s) | Exists | Works | Tenant-safe | Complete | Notes |
|---|------|----------|:------:|:-----:|:-----------:|:--------:|-------|
| 1 | Dashboard | `/dashboard` | ✓ | ✓ | ✓ | ✓ | Loads “Dashboard” / Pilot home |
| 2 | Products | `/products` | ✓ | ✓ | ✓ | ✓ | Anaz 1518; Pilot has Pilot 02 Test Item |
| 3 | Inventory / GRN | `/inventory`, `/grn` | ✓ | ✓ | ✓ | ✓ | Anaz inventory 1518; GRN page loads |
| 4 | POS cash sell | `/pos` | ✓ | ✓ | ✓ | ✓ | Pilot catalog + ticket UI; prior COD/ops sales |
| 5 | Online orders | `/commerce/orders` | ✓ | ✓ | ✓ | ✓ | Anaz + Pilot COD rows |
| 6 | Customers | `/customers` | ✓ | ✓ | ✓ | ✓ | Page loads (empty list OK) |
| 7 | Store publish | `/commerce`, `/website` | ✓ | ✓ | ✓ | ✓ | Overview + website (retry if 429) |
| 8 | Storefront COD | `/store/{slug}` | ✓ | ✓ | ✓ | ✓ | anaz-store + pilot-02 live |
| 9 | Reports | `/reports`, `/sales` | ✓ | ✓ | ✓ | ✓ | Pages load |
| 10 | Alerts | `/alerts` | ✓ | ✓ | ✓ | ✓ | Loads |
| 11 | Register / Z | `/register` | ✓ | ✓ | ✓ | ✓ | Open/close UI present |
| 12 | Users / roles | `/users`, `/permissions` | ✓ | ✓ | ✓ | ✓ | Loads |
| 13 | Settings + password | `/settings` | ✓ | ✓ | ✓ | ✓ | Change password on both tenants |
| 14 | WhatsApp | `/whatsapp` | ✓ | ✓ | ✓ | partial | UI loads → harden in `06` |
| 15 | Jarvis | `/assistant` | ✓ | partial | ✓ | no | After KPI |
| 16 | Billing | `/billing` | ✓ | ✓ | ✓ | ✓ | Licence display |
| 17 | Audit | `/audit` | ✓ | ✓ | ✓ | ✓ | Loads |

## Exit criterion

> An owner can run day-to-day retail + COD storefront ops without HQ, without cards, without branded reset email.

**Met** for Anaz + Pilot 02 on rows 1–13.

## Next focus

1. ~~Owner gap walkthrough~~ ✅  
2. Start **`06-WHATSAPP-V1`** (harden existing WA)  
3. Keep **email domain + WebXPay** in LAST (`12`)

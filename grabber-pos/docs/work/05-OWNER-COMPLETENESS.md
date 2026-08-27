# 05 — Owner completeness

**Status:** IN PROGRESS — gap audit (no IA redesign)  
**Rule:** Can an owner run the business from existing screens? Fix gaps; don’t redesign navigation.  
**Accounts:** Anaz (`anazazeez1992@gmail.com`) + Pilot 02 (`pilot-02-owner@mypoz.test`)

## Deferred LAST (do not block this packet)

| Item | Packet | Why later |
|------|--------|-----------|
| Resend verified domain + forgot-password mail | `02` | Domain provisioning in progress |
| WebXPay / cards | `12` | COD-first; cards last |
| Jarvis agents / KPI depth | `07`–`09` | After owner ops + WA + KPI canon |

## Operating model (functional only)

```text
OWNER
├── Today          → Dashboard, Alerts, Sales
├── Commerce       → POS, Orders, Products, Inventory, Customers
├── Store          → Commerce overview/builder/orders, Website
├── Marketing      → WhatsApp (harden in 06)
├── Intelligence   → Jarvis (after KPI — partial OK now)
└── Business       → Reports, Staff/Users, Register, Settings
```

Verticals (restaurant, rooms, hire, etc.) stay available in the launcher; **COD retail + storefront** is the completeness bar for this packet.

## Priority gap table

Fill during Anaz + Pilot 02 walkthroughs. Legend: blank = not verified this pass.

| # | Area | Route(s) | Exists | Works | Tenant-safe | Complete | Notes |
|---|------|----------|:------:|:-----:|:-----------:|:--------:|-------|
| 1 | Dashboard | `/dashboard` | ✓ | | ✓ | | Today sales / stock alerts |
| 2 | Products | `/products` | ✓ | | ✓ | | CRUD + stock visible |
| 3 | Inventory / GRN | `/inventory`, `/grn` | ✓ | | ✓ | | Receive + levels |
| 4 | POS cash sell | `/pos` | ✓ | ✓ | ✓ | | Zero-stock blocked |
| 5 | Online orders | `/commerce/orders` | ✓ | ✓ | ✓ | | Anaz COD smoke OK |
| 6 | Customers | `/customers` | ✓ | | ✓ | | Shared POS + store |
| 7 | Store publish | `/commerce`, `/website` | ✓ | | ✓ | | CMS seeded on provision |
| 8 | Storefront COD | `/store/{slug}` | ✓ | ✓ | ✓ | | Unknown → 404 |
| 9 | Reports | `/reports`, `/sales` | ✓ | | ✓ | | Same org ledger |
| 10 | Alerts | `/alerts` | ✓ | | ✓ | | Low stock |
| 11 | Register / Z | `/register` | ✓ | | ✓ | | Open/close |
| 12 | Users / roles | `/users`, `/permissions` | ✓ | | ✓ | | Owner vs cashier |
| 13 | Settings + password | `/settings` | ✓ | ✓ | ✓ | ✓ | Change password live |
| 14 | WhatsApp | `/whatsapp` | ✓ | | ✓ | partial | → work/06 |
| 15 | Jarvis | `/assistant` | ✓ | partial | ✓ | no | → after KPI |
| 16 | Billing (licence) | `/billing` | ✓ | | ✓ | | Plan display only |
| 17 | Audit | `/audit` | ✓ | | ✓ | | Owner-visible trail |

## Account map

| Login | Org | Use for |
|-------|-----|---------|
| `pilot-02-owner@mypoz.test` | Pilot 02 | Fresh HQ-provisioned tenant |
| `anazazeez1992@gmail.com` | Anaz Store | Soft-launch catalog + COD |
| `anasbikes1992@gmail.com` | HQ Security | HQ only — not owner completeness |
| `pilot2-owner@mypoz.test` | Tenant B | Isolation fixture only |

## Walkthrough script (repeat per tenant)

1. Login as owner → land on launcher / dashboard  
2. Add or edit one product → confirm stock  
3. POS cash sale → receipt / invoice PDF (use exact `sale.id`)  
4. Place or confirm one storefront COD order → appears in Online orders  
5. Check Reports / Sales for that sale  
6. Settings → Change password (optional; skip if using shared pilot password)  
7. Confirm `/hq` is **403** for owner  
8. Confirm other tenant’s orders/products not visible  

## Exit criterion

> An owner can run day-to-day retail + COD storefront ops without HQ, without cards, without branded reset email.

When priority rows 1–13 are Complete on **both** Anaz and Pilot 02 → mark this packet PASS → start `06-WHATSAPP-V1`.

## Next focus

1. Walk Anaz + Pilot 02 through the script; fill the table  
2. Fix only broken/missing owner-critical gaps (no mega-redesign)  
3. Then WhatsApp → KPI → Jarvis… → **Email domain + WebXPay LAST**

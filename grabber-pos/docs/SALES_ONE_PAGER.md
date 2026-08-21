# MyPoz sales one-pager

**Live product:** https://mypoz-and-store-ui.vercel.app  
**Positioning:** One POS + commerce cloud for Sri Lankan shops — same ledger for counter, website, and WhatsApp.

## Plans (LKR / month)

| Tier | Price | Unlocks |
|------|------:|---------|
| **Starter** | 4,500 | Core POS, catalogue, inventory, full commerce suite, register |
| **Business** | 9,500 | All non-vertical modules; add verticals via HQ **extras** |
| **Enterprise** | 18,500 | Everything unlocked |

Source of truth: `src/lib/plans.ts`, `src/lib/billing.ts`, `src/lib/hq-config.ts`.

## Extras (sell on top)

| Extra | What the client gets |
|-------|----------------------|
| `restaurant` | KDS + tables |
| `delivery` | Drivers / delivery board |
| `whatsapp` | Cloud API bot + inbox + invoice send (HQ attaches phone) |

WhatsApp is **not** implied by Starter alone — attach via HQ `/hq/whatsapp` after Meta WABA is ready.

## What to promise at soft launch

- COD / bank-transfer storefront (card & courier APIs are staff workflows, not live gateways)
- WhatsApp numbered bot (order / menu / offers / location / track / staff) on **allowlisted** numbers until Meta **Live** + Business verification
- Meta phone catalog is optional bonus (can lag after connect); bot **View menu** always uses live POS stock

## What not to promise yet

- Approved WA templates outside the 24h window
- Live PayHere / PickMe / Uber capture
- HQ multi-tenant order search across all shops
- Cloud printing to LAN ESC/POS (needs on-prem agent + `PRINTER_*_IP`)

## Onboard path (HQ)

1. `/hq` → provision tenant (`hq_provision_tenant`)
2. Owner Auth user + `profiles.role = owner`
3. Publish storefront slug
4. Optional: attach WhatsApp phone number id
5. Walk client through [CLIENT-PLAYBOOK.md](CLIENT-PLAYBOOK.md)

## Support escalation

Cross-tenant data leak = **stop-the-line** — [GMS-OPERATIONS.md](GMS-OPERATIONS.md).

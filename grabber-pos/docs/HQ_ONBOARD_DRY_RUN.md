# HQ onboard dry-run (Phase C)

Use this after Phase A soft-launch is green for Anaz.

## Preconditions

- Live host: `https://mypoz-and-store-ui.vercel.app` only
- Logged in as HQ (`mypoz-hq` / `GMS_ADMIN_EMAILS`)
- RPC `hq_provision_tenant` exists (confirmed in production)

## Current fleet (reference)

| Slug | Name |
|------|------|
| `mypoz-hq` | MyPoz HQ workspace |
| `anaz-store` | Anaz Store (pilot) |

## Dry-run steps (second pilot)

1. HQ → Tenants → **Provision** a throwaway org (e.g. `pilot-2-test`) with owner email you control.
2. Confirm org row + owner `profiles.role = owner`.
3. Sign in as that owner → set business name / slug → publish storefront.
4. Open `/store/<slug>` → confirm empty or seeded catalogue loads.
5. Optional: HQ → `/hq/whatsapp` → attach a **test** phone number id (or skip until Meta number ready).
6. Tear down or keep as second pilot — do **not** market until Anaz Phase A smokes are done.

## Pass criteria

- [ ] New org isolated (no Anaz products visible)
- [ ] Owner can sell one training/POS sale
- [ ] Storefront URL resolves on UI host
- [ ] Licence / plan shows as expected in HQ

## WhatsApp promise (sales rule)

Until Meta app is **Live** and Business verification is complete, only promise WhatsApp to **allowlisted** test numbers. Sell commerce + POS freely; treat WA as beta add-on.

# 12 — WebXPay / cards + branded email (LAST)

**Status:** DEFERRED LAST — after real client (`11`) and after Resend domain exists  
**Rule:** Do not reopen ledger design. COD stays primary until this packet.

## Bundle (finish together at the end)

| Item | Blocker today | Done when |
|------|---------------|-----------|
| **Resend sending domain** | Cannot From `@gmail.com`; need verified domain | `RESEND_FROM_EMAIL=MyPoz <noreply@VERIFIED>` + redeploy + forgot-password works |
| **WebXPay / cards** | Staging RSA / live tokens deferred | Staging E2E → live keys → webhook stock path certified |

## Explicitly out of scope until LAST

- Card checkout on storefront  
- Branded password-reset email (use Change password / HQ reset meanwhile)  
- Payment provider sprawl beyond WebXPay LKR path  

## Resume checklist (when you return)

1. Domain verified in Resend → set `RESEND_FROM_EMAIL` → redeploy → smoke forgot-password  
2. WebXPay staging RSA E2E (`docs/WEBXPAY_STAGING_SETUP.md`)  
3. Live keys + webhook + stock only after payment verified  
4. Update `PRODUCTION_ENV_KEYS_CHECKLIST.md` + reply in chat when both PASS

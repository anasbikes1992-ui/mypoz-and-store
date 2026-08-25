# WebXPay staging setup (MyPoz)

## Endpoints

| Env | Payment POST URL |
|-----|------------------|
| Staging (default) | `https://stagingxpay.info/index.php?route=checkout/billing` |
| Live | `https://webxpay.com/index.php?route=checkout/billing` |

Docs: https://developers.webxpay.com/Guides/Redirect-Integration/redirect.html

## App env (names only)

```bash
PAYMENTS_LKR_PROVIDER=WEBXPAY
WEBXPAY_ENV=staging
WEBXPAY_PUBLIC_KEY=<PEM from WebXPay dashboard>
WEBXPAY_SECRET_KEY=<secret from WebXPay dashboard>
# optional:
# WEBXPAY_GATEWAY_URL=https://stagingxpay.info/index.php?route=checkout/billing
```

## Dashboard return URL

```text
https://mypoz-and-store-ui.vercel.app/api/payments/webhook/WEBXPAY
```

(or your preview / custom domain equivalent)

## Flow

```text
POS Card → create_sale (pending) → /api/pos/pay → WebXPay form POST
      → customer pays on stagingxpay
      → webhook /api/payments/webhook/WEBXPAY (signature verified)
      → payment_events claim → create_sale_internal → stock decrement
```

Cash remains immediate `create_sale` (no gateway).

## Verify after keys are set

1. `GET /api/payments/status` → `webxpay.configured: true`, `environment: staging`, host `stagingxpay.info`
2. POS → Card → confirm redirect to staging billing page
3. Complete a staging test payment → sale completes, stock moves once

## Known blocker (2026-08-25)

Staging may return **`442 Invalid encryption`** even when MyPoz builds a valid encrypted `payment` field and Node can POST the billing page. Treat as **merchant public/secret key pair or WebXPay dashboard staging settings**, not app architecture. Demo cards (tokenize guide): Master Without 3DS `5111 1111 1111 1118`, any future expiry + 3-digit CVV. Helpers: `scripts/webxpay-rsa-build-checkout.mjs`, `scripts/webxpay-rsa-node-chain.mjs`.

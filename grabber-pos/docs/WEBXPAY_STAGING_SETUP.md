# WebXPay staging setup (MyPoz)

## Integration mode

MyPoz POS/card uses **Redirect Integration only** (not Tokenize).

| Kind | Staging | Live |
|------|---------|------|
| **Redirect POST (we use this)** | `https://stagingxpay.info/index.php?route=checkout/billing` | `https://webxpay.com/index.php?route=checkout/billing` |
| Tokenize API (not used by POS redirect) | `https://tokenize.stagingxpay.info/` | `https://commtoken.webxpay.com/` |

Docs: https://developers.webxpay.com/Guides/Redirect-Integration/redirect.html

Staging non-token MID (bank / merchant setup reference): `TESTWEBXPAYNOLKR`  
([Bank MIDs](https://developers.webxpay.com/Other/Bank-MID/mid.html))

## App env (names only)

```bash
PAYMENTS_LKR_PROVIDER=WEBXPAY
WEBXPAY_ENV=staging
WEBXPAY_PUBLIC_KEY=<PEM from WebXPay Integration Information>
WEBXPAY_SECRET_KEY=<secret from same dashboard>
# optional — skip gateway picker (e.g. Commercial Bank MPGS LKR = 40):
# WEBXPAY_PAYMENT_GATEWAY_ID=40
# optional override:
# WEBXPAY_GATEWAY_URL=https://stagingxpay.info/index.php?route=checkout/billing
```

**Keys must belong to the merchant account enabled for the URL you post to.**  
Encrypting with keys that do not match staging while posting to `stagingxpay.info` commonly yields **`442 Invalid encryption`**.

## Dashboard return URL

```text
https://mypoz-and-store-ui.vercel.app/api/payments/webhook/WEBXPAY
```

Click **SUBMIT** after any change. Do **not** put Tokenize API username/password into Vercel for redirect.

## Flow

```text
POS Card → create_sale (pending) → /api/pos/pay → form POST → stagingxpay.info
      → customer pays
      → webhook /api/payments/webhook/WEBXPAY (RSA signature verified)
      → payment_events claim → create_sale_internal → stock decrement
```

Cash remains immediate `create_sale` (no gateway).

## Verify after keys are set

1. `GET /api/payments/status` → `webxpay.configured: true`, `environment: staging`, host `stagingxpay.info`
2. Also expect `rateLimit: "upstash"` and `email.configured: true` once Redis/Resend envs are live on that deploy
3. POS → Card → staging billing (not 442)
4. Demo card (no 3DS): `5111 1111 1111 1118` · future expiry · any CVV → sale completes, stock −1 once

## Known blocker

**`442 Invalid encryption`** = staging rejected the RSA `payment` blob (wrong/mismatched public+secret for staging). Redirect URL in code is already correct. Helpers: `scripts/webxpay-rsa-build-checkout.mjs`, `scripts/webxpay-rsa-node-chain.mjs`.

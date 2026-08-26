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
Wrong/mismatched keys or an incomplete staging MID often surface as **`442 Invalid encryption`** (see Known blocker — may appear on billing *or* on the capturePay hop after billing accepts).

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

## Known blocker (confirmed 2026-08-26)

Browser error URL matches automated probe:

`…/error/bad_request&error=442&message=Invalid%20encryption`

| Hop | Result |
|-----|--------|
| MyPoz `/api/pos/pay` → POST `checkout/billing` | **OK** (200 + `enc_post_array_data` / capturePay form) |
| Auto-submit `checkout/billing/capturePay` | **442 Invalid encryption** (card UI never loads) |
| Same keys POST live `webxpay.com` billing | **401 Invalid Access** (not live keys) |

So MyPoz → staging **handoff is fine**. Failure is WebXPay’s next hop (their session/`enc_post` decrypt), not our form POST shape. Adding `payment_gateway_id` (40/46/5) does **not** clear 442.

**Fix outside app code (merchant / WebXPay):**

1. Dashboard → Integration Information: regenerate or re-copy **Public Key + Secret Key** for this staging merchant; paste into Vercel `WEBXPAY_PUBLIC_KEY` / `WEBXPAY_SECRET_KEY` (Production + Preview); redeploy/promote.
2. Confirm Return URL submitted: `https://mypoz-and-store-ui.vercel.app/api/payments/webhook/WEBXPAY`
3. Confirm staging non-token MID / bank channel enabled (ref `TESTWEBXPAYNOLKR`) — card capture often needs MID activation even when billing accepts the first POST.
4. If keys + Return URL + MID look correct and capture still 442 → open WebXPay support ticket with: merchant id, staging URL, error **442**, and that billing succeeds but **capturePay** fails.

Do **not** put Tokenize username/password into Vercel. Helpers: `scripts/webxpay-staging-smoke.mjs`, `scripts/webxpay-capture-gateway-probe.mjs`, `scripts/webxpay-staging-vs-live.mjs`.

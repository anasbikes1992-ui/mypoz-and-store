# Production env keys checklist

**Purpose:** Names only — fill values in Vercel / local `.env.local`. Never commit secrets.  
**App:** `mypoz-and-store-ui` · Supabase `veavfkjgtkbnggukzjds`  
**Date:** 2026-08-25

Legend: ✅ present on Vercel Production (CLI `env ls`) · ⏳ add when ready · ⏸ deferred

---

## Required for production commerce

| Variable | Prod | Preview | Dev | Notes |
|----------|:----:|:-------:|:---:|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ | ⏳ | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ | ⏳ | |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ✅ | ⏳ | Server only |
| `WEBXPAY_PUBLIC_KEY` | ✅ | ✅ `production-hardening` | ⏳ | Staging keys OK until live cutover |
| `WEBXPAY_SECRET_KEY` | ✅ | ✅ `production-hardening` | ⏳ | Staging keys OK until live cutover |
| `WEBXPAY_ENV` | ⏳ | ⏳ | ⏳ | Omit or `staging`; set `live` only after RSA E2E |

**Manual WebXPay dashboard:** Return URL = `{APP_URL}/api/payments/webhook/WEBXPAY`

---

## Strongly recommended (P1)

| Variable | Prod | Notes |
|----------|:----:|-------|
| `UPSTASH_REDIS_REST_URL` | ⏳ | Distributed rate limit |
| `UPSTASH_REDIS_REST_TOKEN` | ⏳ | Pair with URL |
| `SUPABASE_DB_PASSWORD` | ✅ local | Gate 5 logical export — **not** for Vercel runtime (export ran 2026-08-26) |
| `NEXT_PUBLIC_APP_URL` | ⏳ | Canonical https://mypoz-and-store-ui.vercel.app |
| `GMS_ADMIN_EMAILS` | ✅ | HQ allowlist |

---

## Integrations (optional / already present)

| Variable | Prod | Notes |
|----------|:----:|-------|
| `WHATSAPP_TOKEN` | ✅ | Meta Cloud |
| `WHATSAPP_PHONE_NUMBER_ID` | ✅ | |
| `WHATSAPP_APP_SECRET` | ✅ | |
| `WHATSAPP_VERIFY_TOKEN` | ✅ | |
| `OPENAI_API_KEY` | ✅ | Features that need it |
| `RESEND_API_KEY` | ⏳ | Managed email when enabling transactional mail |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | ⏸ | Observability next |

---

## Local-only / cert tooling

| Variable | Notes |
|----------|-------|
| `GATE3_TEST_PASSWORD` | Cert fixtures only — rotate after windows |
| `SUPABASE_PROJECT_REF` | Default `veavfkjgtkbnggukzjds` |

---

## Cutover order (when you add missing keys)

1. Preview: WebXPay staging + Supabase (parity with prod).  
2. Upstash REST pair on Production (and Preview).  
3. Local `SUPABASE_DB_PASSWORD` → run `scripts/gate5-logical-export.mjs` → off-site copy.  
4. One staging card pay → confirm signed webhook → stock.  
5. Only then: `WEBXPAY_ENV=live` + live merchant keys.  
6. Rotate Gate 3 test passwords.

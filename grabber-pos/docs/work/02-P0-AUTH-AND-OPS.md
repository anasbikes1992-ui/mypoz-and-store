# 02 — P0 Auth & ops closeout

**Status:** PARTIAL — A-OP-01 ready to close; email + Gate 5 still open (email **LAST**)

| Item | Owner | Status | Notes |
|------|-------|--------|-------|
| A-OP-01 Auth Site URL + redirects | **You** | Ready to mark PASS | Site URL + redirects verified in dashboard |
| **Resend FROM / sending domain** | **You** | **DEFERRED LAST** | Creating verified domain. Do **not** use `@gmail.com` as From. Until then: Settings → Change password / HQ reset |
| Gate 5 off-site copy | **You** | OPEN (parallel) | Copy gate5 logical export off this machine |
| PITR / backup note | **You** | OPEN (parallel) | Supabase Database backups / PITR |
| Disposable restore drill | **You** | OPEN (parallel) | Against disposable branch only |
| Thin monitoring (Sentry) | Eng later | Not a COD blocker | |

## Email (LAST — with cards)

Do not block Owner Completeness / WhatsApp / KPI on this.

When domain is ready:

1. Resend → Domains → verify (e.g. `mypoz.lk` or new domain)
2. Vercel `RESEND_FROM_EMAIL` = `MyPoz <noreply@VERIFIED_DOMAIN>` (never `@gmail.com`)
3. Redeploy / promote
4. `/api/payments/status` → `email.fromSet: true`
5. `/forgot-password` with `anasbikes1992@gmail.com`

## Parallel note

Pilot #2 frozen. Continue `05-OWNER-COMPLETENESS`. Email + WebXPay stay in the LAST bucket with `12`.

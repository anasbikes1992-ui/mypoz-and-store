# 02 — P0 Auth & ops closeout

**Status:** ENG CLOSED / OPERATOR OPEN (2026-08-27)

| Item | Owner | Notes |
|------|-------|-------|
| A-OP-01 Auth Site URL + redirects | **You** | Site URL + redirects look set on `veavfkjgtkbnggukzjds`. Reply `A-OP-01: PASS` when confirmed |
| **Resend FROM (password email)** | **You** | `RESEND_API_KEY` is on Vercel Production, but **`RESEND_FROM_EMAIL` is missing**. Default `noreply@mypoz.lk` is not verified → forgot-password returns 500 for real accounts. See below |
| Gate 5 off-site copy of logical export | **You** | Copy `data/backups/gate5-logical-2026-08-26T11-19-36-896Z.json` (+ meta) off this machine (drive/cloud) |
| PITR / backup dashboard note | **You** | Supabase → Project Settings → Database → confirm PITR / backups enabled; note retention |
| Disposable restore drill | **You** | Run checks in `data/backups/gate5-restore-verify.sql` against a disposable branch/clone — not production wipe |
| Thin monitoring (Sentry) | Eng later | **Not** a COD / Pilot blocker |

Auth route residuals are **already closed**. Proxy public path for forgot-password is **deployed**.

## Fix password-reset email (required for forgot-password)

1. Open [Resend → Domains](https://resend.com/domains) and **verify** the domain you will send from (e.g. `mypoz.lk`).
2. Vercel → project **`mypoz-and-store-ui`** → Settings → Environment Variables → Production:
   - `RESEND_FROM_EMAIL` = `MyPoz <noreply@YOUR_VERIFIED_DOMAIN>`  
     Example: `MyPoz <noreply@mypoz.lk>`
   - Optional: `RESEND_REPLY_TO` = `support@mypoz.lk`
3. **Redeploy** (or promote) so the new env is live — changing env alone does not update a running deployment.
4. Retest `/forgot-password` with a **real** Auth user email (e.g. `anasbikes1992@gmail.com` — one `s`, not `anass…`).
5. Probe: `GET /api/payments/status` → `email.fromSet` should be `true`.

**Temporary workaround** until FROM is set: sign in and use **Settings → Change password**, or HQ → tenant → reset password.

## Eng check

- [x] Confirm listed APIs use `requireTenantSession` / `requireRoles`
- [ ] Operator checklist above (blocks CLIENT READY, not Pilot #2 coding)

## Parallel note

Pilot #2 **passed** while this stays open. Complete before declaring CLIENT READY.

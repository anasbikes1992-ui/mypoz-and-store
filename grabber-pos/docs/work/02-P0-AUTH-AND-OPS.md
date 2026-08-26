# 02 — P0 Auth & ops closeout

**Status:** ENG CLOSED / OPERATOR OPEN (2026-08-26)

| Item | Owner | Notes |
|------|-------|-------|
| A-OP-01 Auth Site URL + redirects | **You** | Supabase → Auth → URL config. Expected Site URL `https://mypoz-and-store-ui.vercel.app` + redirects for `/login`, `/update-password`, localhost. Reply `A-OP-01: PASS` |
| Gate 5 off-site copy of logical export | **You** | Copy `data/backups/gate5-logical-2026-08-26T11-19-36-896Z.json` (+ meta) off this machine (drive/cloud) |
| PITR / backup dashboard note | **You** | Supabase → Project Settings → Database → confirm PITR / backups enabled; note retention |
| Disposable restore drill | **You** | Run checks in `data/backups/gate5-restore-verify.sql` against a disposable branch/clone — not production wipe |
| Thin monitoring (Sentry) | Eng later | **Not** a COD / Pilot blocker |

Auth route residuals are **already closed**.

## Eng check

- [x] Confirm listed APIs use `requireTenantSession` / `requireRoles`
- [ ] Operator checklist above (blocks CLIENT READY, not Pilot #2 coding)

## Parallel note

Pilot #2 **passed** while this stays open. Complete before declaring CLIENT READY.

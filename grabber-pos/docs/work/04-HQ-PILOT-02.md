# 04 — HQ Pilot #2

**Status:** **FROZEN PASS** (2026-08-27)  
**Tenant:** `pilot-02` · org `0aba445f-94e6-4a64-aea9-883475f90d9d`  
**Owner:** `pilot-02-owner@mypoz.test`  
**Evidence:** `data/backups/hq-pilot-02-*.json`, `hq-pilot-02-ops-*.json`  
**Deploy:** `production-hardening` → promote on `mypoz-and-store-ui`

## Preflight

- [x] P0 UI smoke / HQ roster truth  
- [x] Production: idempotent provision + CMS seed-if-missing + unknown-slug **404** + forgot-password API public  
- [x] Pre-card smoke `ops:smoke:prod` **11/11**  
- [ ] A-OP-01 reply `A-OP-01: PASS` (URLs already look correct — operator confirm)  
- [ ] Gate 5 off-site / PITR / restore (parallel; not foundation)  
- [ ] Resend domain + WebXPay (**LAST** — `02` / `12`)

## Exit criterion

> HQ can create a tenant that can operate tomorrow (COD).

**Met.** Foundation frozen — no architecture reopen. Next: `05-OWNER-COMPLETENESS.md`.

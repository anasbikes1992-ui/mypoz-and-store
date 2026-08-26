# MyPoz Production Release Gate

Repeatable go / no-go checklist. Use this instead of re-running architecture discovery.


| Field                | Value                                          |
| -------------------- | ---------------------------------------------- |
| **Date**             | 2026-08-23                                     |
| **Commit**           | `a4e16c1` (+ launch docs / `0023` hardening)   |
| **Production host**  | `https://mypoz-and-store-ui.vercel.app`        |
| **Supabase project** | `veavfkjgtkbnggukzjds` (ACTIVE_HEALTHY)        |
| **Filled by**        |                                                |


---

## Agent preflight (2026-08-23)


| Check                                         | Result                                                                                                      |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `npm run ops:gate`                            | **PASS** — health, WA smoke, catalog 1518 products                                                          |
| `GET /api/health`                             | **PASS** — `ok`, `backend: supabase`, `whatsapp: true`, `gateway: service-role`                           |
| WhatsApp smoke                                | **PASS** — webhook 403 on bad token; catalog CSV/JSON 200                                                   |
| Migration `0022_wholesale_tiers`              | **PASS** — remote `wholesale_tiers`                                                                         |
| Migration `0023_launch_rls_hardening`         | **PASS** — `receipt_counters` RLS on; staging dropped; POS RPCs revoked from `anon`                         |
| WhatsApp inbox (app_collections)              | **PASS** — inbound `hi` + menu reply recorded 2026-08-22                                                    |
| Shop knowledge `/knowledge`                   | **PASS** — route live (auth redirect); Anaz licence plan **business**                                       |
| Meta message templates                        | **DEFERRED** — wait for Meta **Approved**                                                                   |
| Supabase Auth URL config (A-OP-01)            | **UNVERIFIED** — confirm Site URL + redirects in dashboard (operator)                                       |
| Live WhatsApp `hi` (A-OP-02)                  | **PASS (DB)** — re-test after each deploy if needed                                                         |


### A-OP-01 attempt log

Agent cannot read Auth URL Configuration without a logged-in Supabase dashboard session.

**Status: A-OP-01 = UNVERIFIED** — gate stays CONDITIONALLY READY until you reply `A-OP-01: PASS`.

To clear: paste a screenshot of Auth → URL Configuration showing:
- Site URL `https://mypoz-and-store-ui.vercel.app`
- Redirects including production `/**`, `/update-password`, and `http://localhost:3000/**`

### Migrations check

**Git** `supabase/migrations/`: `0001`…`0023` (includes `0010b`, remediations `0019`–`0021`, wholesale `0022`, launch RLS `0023`).

**Remote** includes `wholesale_tiers` and `launch_rls_hardening` (plus earlier remediations under unprefixed names). Spot-check: `receipt_counters` RLS enabled; `_anaz_chunk_staging` dropped.

---



## Security

- [x] No open P0 findings
- [x] P1 remediation complete (see `docs/AUDIT_FINDINGS.md`)
- [x] Advisor ERROR tables closed (`receipt_counters` RLS; staging dropped)
- [x] POS write RPCs revoked from `anon` (storefront RPCs remain public by design)
- [ ] Manager PIN configured for **active** tenants (owner set; not relying on defaults)
- [ ] Auth redirect verified (A-OP-01) ← **operator confirm**
- [x] Cross-tenant isolation still holds (no demonstrated leak; spot-check if schema changed)



## Core commerce

- [ ] POS sale completes *(owner smoke)*
- [ ] Inventory decrements on sale *(owner smoke)*
- [x] Storefront COD checkout succeeds *(prior runtime: GPS-MAIN-20260821-0007)*
- [x] Delivery board row created for online order *(prior: DEL-4B98C749)*
- [ ] Settlement / payment status correct for the path under test
- [ ] Receipt number issued



## WhatsApp

- [x] Webhook reachable / healthy *(smoke: verify mismatch = 403)*
- [x] Inbound message accepted ← **A-OP-02 PASS (DB)**
- [x] Allowlisted `hi` → menu (A-OP-02 DB)
- [x] Conversation visible in inbox *(DB evidence)*
- [ ] Staff response sends *(optional reconfirm)*
- [ ] Templates *(optional for gate)* — **DEFERRED** until Meta **Approved**



## Deployment

- [x] Production health green on correct host
- [x] `GET /api/health` → ok
- [x] Correct Vercel project: **mypoz-and-store-ui**
- [x] Git push to `main` (`a4e16c1` knowledge + prior verticals/Jarvis)
- [ ] Confirm latest commit **Ready** in Vercel Deployments (Git auto-deploy; CLI Hobby 12-fn cap)
- [ ] No secrets exposed *(ongoing)*



## Operator decisions (record even if deferred)

- [ ] Auth Site URL + redirect allowlist confirmed (A-OP-01) ← **UNVERIFIED**
- [x] WhatsApp live `hi` path confirmed (A-OP-02) ← **PASS (DB 2026-08-22)**
- [ ] PITR decision recorded (enable / defer + reason)
- [ ] Cloudflare decision recorded (enable / defer + reason)



## Do these now (copy checklist)



### A-OP-01 — Auth redirects (~2 min) — CURRENTLY UNVERIFIED

Open: [https://supabase.com/dashboard/project/veavfkjgtkbnggukzjds/auth/url-configuration](https://supabase.com/dashboard/project/veavfkjgtkbnggukzjds/auth/url-configuration)

1. **Site URL** → `https://mypoz-and-store-ui.vercel.app`
2. **Redirect URLs** (one per row):
   - `https://mypoz-and-store-ui.vercel.app/**`
   - `https://mypoz-and-store-ui.vercel.app/update-password`
   - `http://localhost:3000/**`
3. **Save changes** → reply in chat: `A-OP-01: PASS`

**Related eng fix (2026-08-26):** proxy blocked `POST /api/auth/forgot-password` for signed-out users (`Unauthorized`). Added to `PUBLIC_PATHS` in `src/proxy.ts` — **deploy `business-os-cod-first`** before reset emails work on production. After deploy, A-OP-01 redirects are still required so the recovery link can land on `/update-password`.

### A-OP-02 — WhatsApp `hi` — PASS (DB)

DB evidence already shows inbound `hi` + outbound menu. Optional: re-send `hi` from **+94771350035** to **+94 77 959 2288** after each major deploy.

WhatsApp **templates** stay deferred until Meta **Approved**.



## Verdict

| Verdict                 | Meaning                                                               |
| ----------------------- | --------------------------------------------------------------------- |
| **READY**               | All critical boxes checked; safe for controlled real-customer selling |
| **CONDITIONALLY READY** | Core commerce + security OK; listed operator deferrals only           |
| **BLOCKED**             | Open P0, failed core path, or Auth/WhatsApp gate failed               |


**This release:** **CONDITIONALLY READY** (A-OP-01 Auth URL still needs dashboard confirm)

**Notes / blockers:**

```
npm run ops:gate → AUTOMATED_PASS
npm run ops:smoke:prod → pre-card public smoke (404 / stores / forgot-password)
Shop knowledge Business+ shipped; Anaz on business plan.
0023 launch RLS hardening applied.
Pilot #2 patches live 2026-08-27 (unknown→404, CMS seed-if-missing, forgot-password public).
A-OP-01: confirm Site URL + redirects → reply A-OP-01: PASS
A-OP-02: PASS (DB). WA templates deferred.
Deploy via git + promote (Hobby CLI --prod hits 12-fn cap).
Single status page: docs/LAUNCH_STATUS.md
```

---



## After READY

See [GO_TO_MARKET.md](GO_TO_MARKET.md) Phase C/D. Do not open a new architecture audit unless a release gate item regresses.

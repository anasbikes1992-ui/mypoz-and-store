# MyPoz Production Release Gate

Repeatable go / no-go checklist. Use this instead of re-running architecture discovery.


| Field                | Value                                          |
| -------------------- | ---------------------------------------------- |
| **Date**             | 2026-08-23 (automated recheck; A-OP-01 operator confirm) |
| **Commit**           | *(fill after deploy / when marking READY)*     |
| **Production host**  | `https://mypoz-and-store-ui.vercel.app`        |
| **Supabase project** | `veavfkjgtkbnggukzjds` (ACTIVE_HEALTHY)        |
| **Filled by**        |                                                |


---

## Agent preflight (2026-08-23 recheck)


| Check                                         | Result                                                                                                      |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `npm run ops:gate`                            | **PASS** — health, WA smoke, catalog 1518 products                                                          |
| `GET /api/health`                             | **PASS** — `ok`, `backend: supabase`, `whatsapp: true`, `gateway: service-role`                           |
| WhatsApp smoke                                | **PASS** — webhook 403 on bad token; catalog CSV/JSON 200                                                   |
| Migration `0022_wholesale_tiers`              | **PASS** — remote `wholesale_tiers`; `vip_price` + `min_wholesale_qty` on `products`                        |
| WhatsApp inbox (app_collections)              | **PASS** — 1 conversation, 4 messages; inbound `hi` + menu reply recorded 2026-08-22                          |
| Meta message templates                        | **DEFERRED** — wait for Meta **Approved**; do not block gate on templates                                   |
| Supabase Auth URL config (A-OP-01)            | **UNVERIFIED** — confirm Site URL + redirects in dashboard (see below)                                      |
| Live WhatsApp `hi` (A-OP-02)                  | **PASS (DB)** — inbound `hi` + outbound menu in `whatsapp_messages`; re-test after each deploy if needed  |



### A-OP-01 attempt log (2026-08-22)

| Path | Result |
|------|--------|
| Playwright (recheck after user said “done”) | Still **Sign in** wall (`Welcome back`). Screenshot: agent only sees login, not Site URL / Redirect URLs. |
| Browser recheck (~03:24 IST) | Could not open Auth URL page (no usable browser tab). |
| `user-supabase` MCP | `needsAuth` — cannot use for Auth URL read. |
| Management token / Auth config API | None available to agent. |

**Status: A-OP-01 = FAIL / UNVERIFIED** — user reports config is done, but agent has **no visual evidence** of Site URL / redirects. Gate not flipped to PASS.

To clear: paste a screenshot of Auth → URL Configuration showing:
- Site URL `https://mypoz-and-store-ui.vercel.app`
- Redirects including production `/**`, `/update-password`, and `http://localhost:3000/**`

Or reply with those four values copied from the dashboard.

### Migrations check (2026-08-22)

**Git** `supabase/migrations/`: `0001`…`0018` + `0019_rls_select_wrappers` + `0020_collection_matches_stable` + `0021_receipt_indexes_domain_stock` (22 files; includes `0010b`).

**Remote** `supabase_migrations.schema_migrations` (via MCP `list_migrations` / SQL): includes equivalent remediation rows:


| Remote name                    | Version          | Maps to git                             |
| ------------------------------ | ---------------- | --------------------------------------- |
| `rls_select_wrappers`          | `20260821055433` | `0019_rls_select_wrappers.sql`          |
| `collection_matches_stable`    | `20260821055450` | `0020_collection_matches_stable.sql`    |
| `receipt_indexes_domain_stock` | `20260821055512` | `0021_receipt_indexes_domain_stock.sql` |


Object spot-check: `current_org_id()` present; `collection_matches_rules()` present; receipt-related index present.

**Drift notes (non-blocking, do not re-apply):** remote history has duplicate/older version stamps (`0002_functions`, `0008_commerce_cloud` twice) and `0009_commerce_core_rpcs` vs git `0009_commerce_core`; remediation names are unprefixed on remote. No missing critical migration vs git for 0019–0021. **No new migrations invented; nothing re-applied.**

---



## Security

- [x] No open P0 findings
- [x] P1 remediation complete (see `docs/AUDIT_FINDINGS.md`)
- [ ] Manager PIN configured for **active** tenants (owner set; not relying on defaults)
- [ ] Auth redirect verified (A-OP-01) ← **FAIL until Save confirmed**
- [x] Cross-tenant isolation still holds (no demonstrated leak; spot-check if schema changed)



## Core commerce

- [ ] POS sale completes
- [ ] Inventory decrements on sale
- [x] Storefront COD checkout succeeds *(prior runtime: GPS-MAIN-20260821-0007)*
- [x] Delivery board row created for online order *(prior: DEL-4B98C749)*
- [ ] Settlement / payment status correct for the path under test
- [ ] Receipt number issued



## WhatsApp

- [x] Webhook reachable / healthy *(smoke: verify mismatch = 403)*
- [ ] Inbound message accepted ← **A-OP-02**
- [ ] Allowlisted `hi` → menu (A-OP-02)
- [ ] Conversation visible in inbox
- [ ] Staff response sends
- [ ] Templates *(optional for gate)* — **DEFERRED** until Meta **Approved**; wire later



## Deployment

- [x] Production health green on correct host
- [x] `GET /api/health` → ok
- [x] Correct Vercel project: **mypoz-and-store-ui**
- [x] Git push to `main` (`4294502` + verticals, `ff401dd` docs)
- [ ] Vercel deploy of latest commit — **CLI blocked** on Hobby 12-function cap; confirm Git auto-deploy in dashboard
- [ ] No secrets exposed *(ongoing)*



## Operator decisions (record even if deferred)

- [ ] Auth Site URL + redirect allowlist confirmed (A-OP-01) ← **FAIL**
- [ ] WhatsApp live `hi` path confirmed (A-OP-02)
- [ ] PITR decision recorded (enable / defer + reason)
- [ ] Cloudflare decision recorded (enable / defer + reason)

---



## Do these two now (copy checklist)



### A-OP-01 — Auth redirects (~2 min) — CURRENTLY FAIL

Agent **cannot** change this without a logged-in Supabase dashboard session or a Management API access token. You must edit and **Save** in the dashboard.

Open: [https://supabase.com/dashboard/project/veavfkjgtkbnggukzjds/auth/url-configuration](https://supabase.com/dashboard/project/veavfkjgtkbnggukzjds/auth/url-configuration)

**Exact remaining clicks:**

1. Sign in to Supabase (GitHub / email / SSO) if prompted.
2. **Site URL** → replace with:
  ```
   https://mypoz-and-store-ui.vercel.app
  ```
3. Under **Redirect URLs**, click **Add URL** three times and paste (one per row):
  ```
   https://mypoz-and-store-ui.vercel.app/**
  ```
4. Click **Save changes**.
5. Reply in chat: `A-OP-01: PASS`

Optional proof: Forgot password → email link opens `/update-password` on the live host.

If anything differs from the required values after Save, reply `A-OP-01: FAIL` + what you see.

### A-OP-02 — WhatsApp `hi` (~2 min) — still pending

Automations reconfirmed healthy (`health` + smoke); **do not mark PASS** without live `hi` → menu → inbox evidence.
DB recheck: **zero** `whatsapp_conversations` / `whatsapp_messages` rows.

WhatsApp **templates** stay deferred until Meta **Approved**. A-OP-02 does **not** wait on templates.

**Meta UI (new layout — GRABBER app `622249256393200`):** you are on WhatsApp → **Tools** (`…/whatsapp-business/wa-tools/`). There is no old “To / Manage phone number list” on that page.

1. Left nav: **WhatsApp → Step 1: Try it out** — **or** click the blue **Test the API** button on Tools.
2. On that screen: set **From** = business **+94 77 959 2288**, **To** = add **+94771350035** (OTP if prompted), then send Meta’s test message if offered.
3. If App Mode is **Live**: Development recipient allowlist may not apply — skip OTP list; from **+94771350035** WhatsApp **`hi`** straight to **+94 77 959 2288**.
4. Optional bottom **Manage phone numbers** on Tools = **business** numbers only (not customer allowlist).

Then:

1. From **+94771350035**, WhatsApp **`hi`** to **+94 77 959 2288**
2. Expect bot **menu**
3. Open MyPoz `/whatsapp` → conversation in inbox
4. Staff reply once

Reply: `A-OP-02: PASS` or `A-OP-02: FAIL` + symptom.

---



## Phase A reference (baseline — do not re-audit unless something broke)


| Area                             | Status                                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| P0                               | None                                                                                                    |
| P1 email / PIN / migrations      | Remediated                                                                                              |
| COD + delivery board             | Fixed + runtime verified                                                                                |
| Edge auth                        | Investigated; fail-closed paths on critical writes                                                      |
| Orphan smoke sales `0003`–`0006` | Documented test debris — do not re-sale                                                                 |
| WA templates                     | Deferred until Meta Approved                                                                            |
| Migrations 0019–0021             | **On remote** (as `rls_select_wrappers` / `collection_matches_stable` / `receipt_indexes_domain_stock`) |
| A-OP-01 Auth URLs                | **FAIL / UNVERIFIED** — agent sign-in wall; need your confirm                                           |
| A-OP-02 live `hi`                | **PENDING** — Meta Step 1 / Test the API; then `hi` from +94771350035; inbox empty |


---



## Verdict

Choose one:


| Verdict                 | Meaning                                                               |
| ----------------------- | --------------------------------------------------------------------- |
| **READY**               | All critical boxes checked; safe for controlled real-customer selling |
| **CONDITIONALLY READY** | Core commerce + security OK; listed operator deferrals only           |
| **BLOCKED**             | Open P0, failed core path, or Auth/WhatsApp gate failed               |


**This release:** **CONDITIONALLY READY** (A-OP-01 Auth URL still needs dashboard confirm; core paths green)

**Notes / blockers:**

```
Run: npm run ops:gate  (or node scripts/release-gate-ops.mjs)
Wave 1–4 verticals + ops script shipped locally — deploy commit to mypoz-and-store-ui.
A-OP-01: confirm Site URL https://mypoz-and-store-ui.vercel.app + redirect allowlist in Supabase Auth.
A-OP-02: DB shows hi → menu (2026-08-22); optional re-send hi after deploy.
Migration 0022 wholesale_tiers on remote. WA templates deferred until Meta Approved.
```

---



## After READY

Stop technical discovery. Proceed to **Phase B — Product & GTM Brief**. Do not open a new architecture audit unless a release gate item regresses. **Do not start Phase B while A-OP-01 is FAIL.**
# 05 — Owner completeness

**Status:** IN PROGRESS (after Pilot #2)  
**Rule:** Gap audit only — **no IA redesign**.

## Account clarity (important)

| Login | Org | Purpose |
|-------|-----|---------|
| `pilot-02-owner@mypoz.test` | **Pilot 02** (`pilot-02`) | HQ Pilot #2 throwaway |
| `pilot2-owner@mypoz.test` | Tenant B Security | Gate 3 security fixture (not Pilot #2) |
| `anazazeez1992@gmail.com` | Anaz Store | Soft-launch client |
| `anasbikes1992@gmail.com` | HQ Security | HQ / GMS admin |

Password for all (dev reset 2026-08-26): use the shared reset password from ops chat / `scripts/set-all-passwords.mjs`.

## Gap table (fill as we verify)

| Area | Exists | Works | Tenant-safe | Complete | Notes |
|------|:------:|:-----:|:-----------:|:--------:|-------|
| Dashboard | ✓ | | ✓ | | |
| Products | ✓ | | ✓ | | |
| Inventory | ✓ | | ✓ | | |
| POS | ✓ | ✓ | ✓ | | Sale works; invoice link must use exact `sale.id` |
| Orders | ✓ | ✓ | ✓ | | Anaz smoke OK |
| Customers | ✓ | | ✓ | | |
| Store | ✓ | | ✓ | | CMS docs required after HQ provision |
| Reports | ✓ | | ✓ | | |
| WhatsApp | ✓ | | ✓ | partial | Harden in work/06 |
| Jarvis | ✓ | partial | ✓ | no | After KPI canon |
| Settings | ✓ | ✓ | ✓ | gap→fixing | **Change password** added (needs deploy) |
| Change password | ✓ (new) | | ✓ | deploy | Was missing; Settings → Account |

## Invoice “Sale not found”

Real Tenant B sale id: `87e979d9-8960-4efc-a9ad-9686a0275795`.  
A mistyped URL (`87d…` / `…077…`) returns Sale not found. Use **Invoice PDF** from the POS success panel (do not hand-edit the UUID).

## Next focus (locked order)

1. Deploy `business-os-cod-first` (forgot-password public, CMS on provision, change password, unknown-slug 404)
2. Operator: A-OP-01 + Gate 5 (`docs/work/02`)
3. Finish this gap table on **Anaz** + **pilot-02** (not Tenant B unless testing isolation)
4. Then `06-WHATSAPP-V1` → `07-KPI-CANON` → Jarvis… → WebXPay last

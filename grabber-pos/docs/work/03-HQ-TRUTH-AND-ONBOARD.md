# 03 — HQ truth & onboard

**Status:** HARDENED (2026-08-26) — UI re-test still recommended

## Truth model

```text
Organization
  ├── Owner (profiles.role=owner)
  ├── Branches / Registers
  ├── Licence (app_documents.tenant + reseller_licences view)
  ├── Plan / Status
  └── Storefront (optional)
```

Both `/hq/tenants` and `/hq/licences` call `listHqTenants()` → `reseller_licences`.  
Live DB (2026-08-26): **4** licence rows (Anaz + 3 security fixtures).

## Done

1. [x] Org-table fallback if `reseller_licences` empty
2. [x] Onboard wizard: name+contact validation + inline Continue hint
3. [x] Provision idempotent by slug/name; recover missing branch/register/storefront
4. [x] Provision audit event (`hq.provision.created` / `.recovered`) via service role
5. [ ] HQ admin UI smoke: `/hq/tenants` and `/hq/licences` show the same 4 orgs

## Exit

HQ shows the same roster everywhere; provision is idempotent and audited.

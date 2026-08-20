# Admin Account Provisioning Guide

Create or update Auth users for MyPoz (Supabase project `veavfkjgtkbnggukzjds`).

## Scripts

| Script | Use for |
|--------|---------|
| `scripts/provision-hq-admin.mjs` | GMS Super Admin (`app_metadata.role = gms_admin`) |
| `scripts/provision-tenant-owner.mjs` | Client owner (no HQ role) + org + storefront |
| `scripts/upsert-admin.mjs` | Legacy upsert via service role (sets `gms_admin` — prefer HQ script for HQ) |

```bash
# HQ
UPSERT_ADMIN_EMAIL=ops@example.com UPSERT_ADMIN_PASSWORD='…' \
  node --env-file=.env.local scripts/provision-hq-admin.mjs

# Tenant
UPSERT_ADMIN_EMAIL=owner@shop.lk UPSERT_ADMIN_PASSWORD='…' \
  UPSERT_ORG_NAME="Shop Name" UPSERT_ORG_SLUG=shop-name \
  node --env-file=.env.local scripts/provision-tenant-owner.mjs
```

Needs `SUPABASE_DB_PASSWORD` in `.env.local` (or run equivalent SQL with service access).

Also set Vercel `GMS_ADMIN_EMAILS` to include HQ emails (comma-separated).

Password resets for existing tenants: HQ → tenant detail → **Email reset** / **Temp password**.

See [HQ-PLAYBOOK.md](HQ-PLAYBOOK.md) and [CLIENT-PLAYBOOK.md](CLIENT-PLAYBOOK.md).

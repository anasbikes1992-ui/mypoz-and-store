# Anaz / Shopping Station import scripts

## Keep (supported)

| Script | Purpose |
|--------|---------|
| **`rebuild-anaz-store.mjs`** | **Primary:** recreate Anaz org (locked UUID) + apply `data/anaz-jsonb-batches` + publish SQL |
| `backup-shopping-station.mjs` | Excel-openable backup package under `data/backups/` |
| `whatsapp-smoke.mjs` | Public WA/catalog smoke checks |
| `rotate-chat-passwords.mjs` | Rotate HQ + Anaz owner passwords (service role) |
| `vercel-env-status.mjs` | Report which Vercel secrets are present |
| `provision-tenant-owner.mjs` | Generic tenant owner (new orgs) — prefer rebuild script for Anaz |

```bash
node --env-file=.env.local scripts/rebuild-anaz-store.mjs
# re-upsert products if Anaz already has rows:
node --env-file=.env.local scripts/rebuild-anaz-store.mjs --force
```

Requires `SUPABASE_DB_PASSWORD`. Optional: `ANAZ_OWNER_EMAIL`, `ANAZ_OWNER_PASSWORD`, `ANAZ_OWNER_NAME`.

Trusted artifacts (never Aug-24 JSON):

- `data/anaz-import-catalog.json` / `anaz-import-slim.json` (~1518)
- `data/anaz-jsonb-batches/00-setup.sql` + `10`–`17-chunk.sql`
- `data/anaz-storefront-publish.sql`

Org UUID locked: `304adc33-7279-4547-a73d-a2240333e814` · slug `anaz-store`.

## Removed / archive

Older runners (`import-anaz-shopping-station.mjs`, `build-anaz-jsonb-import.mjs`, `run-anaz-jsonb-chunks.mjs`, `publish-anaz-storefront.mjs`) are gone — use `rebuild-anaz-store.mjs`.

Helpers used during MCP chunk experiments live under
`scripts/_archive-import/` and should not be the default path.

**Forbidden:** restore `data/backups/mypoz-full-2026-08-24.json`.

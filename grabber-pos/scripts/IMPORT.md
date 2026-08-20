# Anaz / Shopping Station import scripts

## Keep (supported)

| Script | Purpose |
|--------|---------|
| `import-anaz-shopping-station.mjs` | Full CSV → Postgres import (needs `SUPABASE_DB_PASSWORD`) |
| `build-anaz-jsonb-import.mjs` | Build `data/anaz-jsonb-batches/*-chunk.sql` |
| `run-anaz-jsonb-chunks.mjs` | Apply chunks via DB URL / password |
| `publish-anaz-storefront.mjs` | Regenerate storefront publish SQL |
| `backup-shopping-station.mjs` | Excel-openable backup package under `data/backups/` |
| `whatsapp-smoke.mjs` | Public WA/catalog smoke checks |
| `rotate-chat-passwords.mjs` | Rotate HQ + Anaz owner passwords (service role) |
| `vercel-env-status.mjs` | Report which Vercel secrets are present |

## One-off / archive

Helpers used during MCP chunk experiments live under
`scripts/_archive-import/` and should not be the default path.

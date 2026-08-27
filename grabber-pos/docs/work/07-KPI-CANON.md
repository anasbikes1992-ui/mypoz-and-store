# 07 — KPI Canon

**Status:** PASS (thin layer) — 2026-08-27  
**Rule:** One shared vocabulary for Reports, Jarvis, and Agents.

## Shipped

- `src/lib/kpi/canon.ts` — shared ids/labels/units/windows (`sales_today`, `sales_7d`, `aov_7d`, `low_stock`, `whatsapp_open_threads`, …)
- Jarvis tool **`kpi_snapshot`** returns `canon` + live `values` from existing sales/inventory/WA ledgers (no second metrics DB)

## Next

- Reports UI can import the same ids when KPI tiles are expanded
- Agents must not invent alternate metric names — use `kpi_snapshot` / canon

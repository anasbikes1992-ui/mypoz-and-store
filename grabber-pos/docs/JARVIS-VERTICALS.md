# Jarvis ↔ verticals coverage

How sale modes connect to Jarvis today, and what time that saves.

| Vertical | Route | Live tools | KB / guide | Time save |
|----------|-------|------------|------------|-----------|
| Retail | `/pos` | period_sales, top_products, slow_movers, inventory, demand_hint | pos-register | Skip opening Reports for “today / top SKUs / low stock” |
| Wholesale | `/pos?mode=wholesale` | same sales/stock tools | wholesale-tiers | How-to for VIP/MOQ/credit without hunting Settings |
| Category | `/pos?mode=category` | same as retail | list_verticals | Quick “where is category mode?” |
| Restaurant | `/restaurant` | — (guide only) | restaurant-floor | Seat split / KOT steps without support call |
| KDS | `/kds` | — | restaurant-floor | Points staff to kitchen display |
| Delivery | `/delivery` | — | delivery-hub | Status/driver workflow; COD no double stock |
| Repair / Service | `/repair` `/service` | — | repair-alerts | SLA + WA status copy |
| Reloads | `/reloads` | — | repair-alerts (providers) | Settings-driven providers |
| Rooms / Rent | `/rooms` `/rent` | — | rooms-rent | Units / folio / housekeeping |
| Hire purchase | `/hire-purchase` | — | repair-alerts | Overdue → Alerts |
| Play | `/play` | — | repair-alerts | Capacity / zones |
| Layaway / Digital / C&C | modules | — | layaway-digital-cc | Where to settle holds / digital / picks |
| WhatsApp | `/whatsapp` | whatsapp_fleet_hint (HQ) | whatsapp-attach | Attach + webhook without re-reading WHATSAPP.md |
| Storefront | `/store/[slug]` | — | storefront | COD → delivery board |

## HQ plane (`/hq/jarvis`)

| Need | Tool | Time save |
|------|------|-----------|
| Who is quiet / low stock / WA attached | `fleet_pulse` | One answer vs opening every tenant |
| Deep dive one shop | `tenant_monitor` | God’s-view without SQL |
| Ticket backlog | `open_tickets` | Triage without tickets page first |
| How-to / vertical map | `kb_search`, `list_verticals` | Operator onboarding |

## Gaps (honest)

- No live **open tables / active deliveries / overdue HP count** tools yet — Jarvis routes you to the module.
- Metrics tools are strongest on **retail-like POS**; other verticals are **guided** via KB + `list_verticals`.
- Password reset stays on tenant UI (by design).

## Try prompts

**Owner:** “How do I split a restaurant bill by seat?” · “Wholesale MOQ?” · “List all verticals”  
**HQ:** “Which shops are quiet?” · “How do I attach WhatsApp?” · “What does delivery hub do?”

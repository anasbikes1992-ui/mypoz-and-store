# Product gap analysis & roadmap ideas

What GRABBER POS Studio already covers, what is thin, and ideas worth adding
before or after production cutover. Status is relative to the **web app** unless
noted. Feature inventory: [FEATURE-PLAN.md](FEATURE-PLAN.md). Credentials handoff:
[CREDENTIALS.md](CREDENTIALS.md).

Legend: ✅ shipped · 🟡 partial / thin · ⬜ not built · 💡 idea (not committed)

---

## 1. Already strong

| Area | Notes |
|------|--------|
| Sale-mode launcher | 12+ modes linked; plan gating on tiles |
| Retail / wholesale / category terminal | Barcode, cart, F-keys, split tender, hold/recall, non-stock, serials, print + WhatsApp |
| Register / shift | Open/close, X-report, Z on close, history |
| Void sales | Manager PIN + reason from sales history |
| Stocktake & transfers | Count worksheets + branch transfer approve |
| Permissions + idle lock | Manager PIN, idle minutes, overlay unlock |
| KDS / audit / backup / health | Kitchen display, audit log, JSON backup, licence/printer/WhatsApp flags |
| Barcode labels | Multi-select print · size templates |
| Quotation → POS | Convert deep-links custom line + customer |
| Restaurant modifiers | Prompt on add item |
| Repository seam | Demo JSON ↔ Supabase without UI forks |
| Licence enforcement | Server-side block on sell paths |
| Docs | PRODUCTION, ARCHITECTURE, USER, RESELLER, GMS-OPERATIONS, CUSTOMER-STOREFRONT, FEATURE-PLAN, DESIGN, PRODUCT, CREDENTIALS |
| Website CMS + storefront | `/website` themes/banners/SEO/checkout modes; `/store/[slug]` orders → C&C/Delivery; customer accounts |
| GMS HQ | `/hq` god-view (monitor, suspend, tickets, WA attach/detach, password reset) |

---

## 2. Gaps closed (Sprints A–D)

| Item | Status |
|------|--------|
| F1–F4 / INSERT shortcuts | ✅ |
| Split payment (cash + card) | ✅ |
| Non-stock / custom lines | ✅ |
| Held / parked bills | ✅ |
| Manager PIN on large discount | ✅ |
| Category mode banner + grid bias | ✅ |
| Open / close register + cash declare | ✅ |
| X / Z reports | ✅ |
| Void / return reasons (+ PIN) | ✅ |
| Session idle lock | ✅ |
| Stocktake / cycle count | ✅ |
| Branch transfer | ✅ |
| Restaurant modifiers | ✅ |
| Serial capture on bill lines | ✅ |
| Permissions / manager PIN settings | ✅ |
| Audit log UI | ✅ |
| KDS web view | ✅ |
| Usage-ish health + backup export | ✅ |
| Printer env flags on `/api/health` | ✅ |
| Quotation → sale | ✅ |
| **Barcode multi-select to print** | ✅ |
| Layaway / deposits | ✅ |
| Gift card balance check at terminal | ✅ |
| Customer second display (`/display`) | ✅ |
| Click & collect pick list | ✅ |
| Google / Meta product feeds | ✅ |
| Dead stock / aging + employee leaderboard | ✅ |
| Tax multi-rate fields + display estimate | ✅ |
| Reseller licence billing stub | ✅ |
| Training mode | ✅ |
| Offline queue + SW shell | ✅ |
| Cash drawer kick | ✅ |
| Label size templates | ✅ |
| Fiscal / e-invoice stub | ✅ |
| PII retention purge | ✅ |
| Usage metering (admin) | ✅ |
| Price override with PIN gate | ✅ |
| Multi-currency tender on bill | ✅ |
| FEFO expiry hints on sell | ✅ |
| Product image upload | ✅ |
| Packages collection (minimal) | ✅ |
| Course firing / seat split | ✅ |
| Role permission matrix UI | ✅ |
| Per-user permission overrides | ✅ |
| Product variants (SKU matrix) | ✅ |
| In-settings printer test panel | ✅ |
| Cash variance alert on close | ✅ |

---

## 3. Still open — none

No P1 gaps remain open. All prior backlog rows below are closed.

| Gap | Notes |
|-----|--------|
| ~~Product variants (SKU options)~~ | ✅ `/variants` + POS select before add |
| ~~Per-user permission overrides~~ | ✅ `userOverrides` + Permissions page + `resolvePermission` |

### Ideas (all shipped)

1. ~~Layaway / deposits~~ ✅  
2. ~~Gift card balance check at terminal~~ ✅  
3. ~~Customer second display~~ ✅  
4. ~~Click & collect pick list~~ ✅  
5. ~~Google/Meta feed~~ ✅  
6. ~~Dead stock / aging reports~~ ✅  
7. ~~Employee leaderboard~~ ✅  
8. ~~Cash variance alerts on close~~ ✅  
9. ~~Tax multi-rate lines~~ ✅  
10. ~~Reseller in-app licence billing~~ ✅ (stub)  
11. ~~Training mode (sandbox sales)~~ ✅  
12. ~~Web offline queue (SW)~~ ✅  
13. ~~Cash drawer kick~~ ✅  
14. ~~Label size templates~~ ✅  
15. ~~Fiscal / e-invoice hooks~~ ✅ (stub)  
16. ~~PII retention purge~~ ✅  

Next work is production cutover (real Supabase / WhatsApp / printers). Optional
polish: CRM lite mass-send, Agreement screen, live courier/telco APIs — see FEATURE-PLAN §7 P5–P8.

**Wave 1 verticals (2026-08)** ✅  
- Wholesale: customer `priceTier` (retail/wholesale/vip), product `vipPrice` + `minWholesaleQty`, MOQ warnings + qty presets, credit limit on bill, HQ `wholesaleEnabled` gates launcher/`/pos`  
- Rooms/Rent: booking units inventory, occupancy board, date conflict checks, check-in, folio/F&B extras, housekeeping dirty→clean  
- Retail: pricing-mode banner, licence-expired + register-closed banners, Take payment blocked when licence expired  
- Tests: `src/lib/__tests__/verticals-wave1.test.ts`; e2e paths `/pos?mode=wholesale`, `/rooms`, `/rent`  
- Migration: `0022_wholesale_tiers.sql` (`vip_price`, `min_wholesale_qty`)

**Wave 2–4 verticals (2026-08)** ✅  
- Repair/Service: SLA `dueAt`, status/overdue filters, deposit + diagnosis + WA status copy  
- Restaurant: floor grouped by table area; pay-by-seat partial settle  
- Delivery: status filters, driver active-load summary, drivers page workload  
- Hire purchase: installment due day (Settings), overdue days on list + Alerts  
- Play: zones + max capacity (Settings), capacity block on check-in  
- Reloads: provider list from Settings (not hardcoded)  
- Alerts API/page: stock + expiry + HP/job operational alerts unified  
- Tests: `src/lib/__tests__/verticals-wave2.test.ts`; e2e `/repair`, `/delivery`, `/hire-purchase`

**Sprint 4 product ideas (partial)**  
- Digital Mode ✅ `/digital` (catalog + custom-line settle + WA/email delivery)  
- Memberships ✅ collection + POS member badge · CRM lite 🟡 `/crm` (segments, no mass send)  
- Coupons schedule ✅ `startsAt` + `description` on discount codes  

---

## 4. Last sprints

**Sprint E — Catalog depth** ✅  
- Product variants (SKU options / matrix) ✅  
- Per-user permission overrides ✅  

**Sprint F — Storefront + GMS HQ** ✅  
- Tenant Website CMS (`/website`): themes, banners, SEO, social, WA templates, payment/fulfilment toggles ✅  
- Storefront checkout modes (cash / card / bank transfer × pickup / courier / PickMe / Uber) ✅  
- Customer email/password + magic link + order history ✅  
- Web orders → Click & collect / Delivery boards; WhatsApp catalog CSV/JSON + Meta/Google feeds ✅  
- GMS `/hq` portal (command center, tenants, licences, onboard, tickets stub, docs) ✅  
- Docs: [GMS-OPERATIONS.md](GMS-OPERATIONS.md), [CUSTOMER-STOREFRONT.md](CUSTOMER-STOREFRONT.md) ✅  

Still out of scope for this pass (see non-goals): live PickMe/Uber APIs, live card
capture / PayHere, full Shopify Liquid themes.

---

## 5. Explicit non-goals (for now)

- Full ERP (GL, fixed assets)  
- Replacing Shopify for complex DTC  
- Live PickMe / Uber booking APIs or PayHere production checkout (modes + staff confirm only)  
- Native Electron shell  

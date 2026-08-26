# 01 — P0 Transactional hardening

**Status:** MOSTLY CLOSED (2026-08-26)  
**Branch:** `business-os-cod-first`

## Audit claims vs codebase

| ID | Claim | Verdict | Action |
|----|-------|---------|--------|
| P0.1 | Zero-stock addable on POS | Soft-open client; **server sell blocked** | ✅ Client clamp |
| P0.2 | Line totals ≠ sale total | Live Anaz COD **reconciles** (500+600 delivery=1100); UI hid fees | ✅ Receipt + mapSaleRow show delivery/COD; `reconcileSaleTotals` helper |
| P0.3 | Online sales vs `/commerce/orders` empty | Dual-write OK; Anaz has `WEB-8CFB3CB1` / `GPS-MAIN-20260826-0001` in `app_collections` | ✅ Same `listStorefrontWebOrders` source; re-test as **Anaz owner** session |
| P0.4 | Stale customer display | Global localStorage, no TTL | ✅ Scoped payload + 15m expiry + clear on empty cart |
| P0.5 | `/store/main-store` → Anaz | **Intentional** launch alias | ✅ Reserved slugs; existing storefront wins |
| P0.6 | Auth residuals | **FALSE — already fixed** | No work |
| P0.7 | HQ tenants empty / licences full | **FALSE as dual-source**; live 4 licence rows | Org fallback if view empty |

## Done in this sprint slice

- [x] POS cart: refuse add when `quantity <= 0`; clamp `available || 9999`
- [x] Reserved storefront slugs: `main-store`, `shopping-station` blocked for new orgs
- [x] Alias resolve: if a real storefront owns the requested slug, do not redirect away
- [x] Receipt / sale mapping show delivery + COD (line sum alone ≠ total is expected)
- [x] Local createSale includes delivery/COD in formula; storefront no longer double-packs fees into serviceCharge
- [x] Customer display: tenant/session scope + TTL + clear on empty cart
- [x] Unit: `reconcileSaleTotals` + slug aliases
- [ ] Operator: open `/commerce/orders` logged in as Anaz owner and confirm `GPS-MAIN-20260826-0001`

## Exit

Server + client refuse zero-stock sell; unknown slug 404; reserved aliases cannot steal a real tenant storefront; Anaz owner sees COD orders on `/commerce/orders`.

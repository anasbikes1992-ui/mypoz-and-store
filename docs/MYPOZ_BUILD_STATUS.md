# MyPoz Commerce Cloud — Build Status

Live tracker for the master roadmap implementation.

**Last updated:** 2026-08-19 (remaining product pass: Jarvis tools, collections admin, discount codes, domain DNS verify, media library, PDP blocks, customer upsert)

---

## Phase 0 — Architecture freeze

| Task | Status |
|------|--------|
| Designate `grabber-pos/` as canonical app | ✅ Done |
| Document canonical systems | ✅ `MYPOZ_COMMERCE_ARCHITECTURE_V1.md` |
| Legacy compatibility policy | ✅ Documented |
| Build status tracker | ✅ This file |

---

## Phase 1 — Commerce core foundation

| Task | Status |
|------|--------|
| `sales.source` enum column | ✅ Migration `0009` |
| `sales.fulfillment_status` | ✅ Migration `0009` |
| `sales.payment_status` | ✅ Migration `0009` |
| `sales.channel` | ✅ Migration `0009` |
| Update `create_sale_internal` | ✅ Migration `0009` |
| Update `storefront_create_order` | ✅ Migration `0009` |
| TypeScript types + repo payload | ✅ |

---

## Phase 2 — Product system

| Task | Status |
|------|--------|
| `compare_at_price` | ✅ Migration `0010` |
| `tags[]` | ✅ Migration `0010` |
| SEO fields | ✅ Migration `0010` |
| `featured` flag | ✅ Migration `0010` |
| `online_status` | ✅ Migration `0010` |
| Storefront RPC returns new fields | ✅ Migration `0010` |

---

## Phase 3 — Product variants

| Task | Status |
|------|--------|
| `product_variants` table | ✅ Migration `0011` |
| `sale_lines.variant_id` | ✅ Migration `0011` |
| POS variant wiring | ✅ Product form matrix + POS picker (`0013` sale path) |
| Storefront variant selector | ✅ PDP option chips + cart `variantId` |

---

## Phase 4 — Collections engine

| Task | Status |
|------|--------|
| `store_collections` smart rules | ✅ Migration `0012` |
| Collections engine (TS) | ✅ `collections-engine.ts` |
| Smart collection evaluation | ✅ Storefront `[collectionSlug]` uses `filterCollectionProducts` |
| Collection admin UI | ✅ `/commerce/collections` CRUD on commerce JSON (same POS catalogue) |

---

## Phase 5 — Theme engine

| Task | Status |
|------|--------|
| Six commerce themes | ✅ Existing CSS + tokens |
| Theme pack format | ✅ `theme-pack.ts` |
| Design token system | ✅ Existing |
| Industry presets | ✅ Starter kits in theme-pack |
| Admin live preview + persist | ✅ `/commerce/themes` swatches, sample card, Preview store; `applyStoreTheme` writes draft + published |

---

## Phase 6 — Blocks system

| Task | Status |
|------|--------|
| Block type registry | ✅ `blocks.ts` |
| Product page blocks schema | ✅ |
| Section block nesting | ✅ Schema support |
| PDP reads enabled blocks | ✅ `ProductView` + builder toggles / reorder |

---

## Phase 7 — Visual store builder

| Task | Status |
|------|--------|
| Device preview (desktop/tablet/mobile) | ✅ Existing |
| Undo/redo | ✅ Existing |
| Navigation builder component | ✅ |
| Drag reorder sections | ✅ Existing |
| Block editor in builder | ✅ Product page block enable / reorder in `/commerce/builder` |

---

## Phase 8–12 — Checkout, delivery, orders

| Task | Status |
|------|--------|
| Dedicated `/cart` page | ✅ |
| Dedicated `/checkout` page | ✅ Coupon field → `final_discount` on `create_sale` |
| Delivery fee engine | ✅ `delivery.ts` |
| COD fee / min / max enforcement | ✅ |
| Order list with status filters | ✅ |
| Order detail view | ✅ |
| Fulfillment transitions | ✅ `update_sale_fulfillment` + order actions |
| Variant stock on `create_sale` | ✅ Migration `0013` |
| Discount codes | ✅ `discount_codes` collection + POS **Discount code** + checkout Apply |

---

## Phase 13+ — Onboarding & launch

| Task | Status |
|------|--------|
| Merchant onboarding wizard | ✅ `/commerce/onboarding` |
| One-click store launch flow | ✅ In onboarding |
| Realtime / live online-order alerts | ✅ POS toast + poll; Supabase Realtime when configured |
| Domain verification workflow | ✅ `/commerce/domains` + `POST /api/commerce/domains/verify` — Connected only after CNAME matches Vercel |
| Media library | ✅ `/commerce/media` + `/api/media` (local `public/uploads`; ephemeral on Vercel) |
| Storefront → POS customer upsert | ✅ Register/login writes `customers` collection by email/mobile |
| Theme marketplace | 🔲 Future |
| SaaS billing | 🔲 Future |

---

## POS sale UI (2026-08-18)

| Task | Status |
|------|--------|
| Thermal-ticket bill + compact shelf | ✅ Receipt tape chrome, dashed totals |
| Payment behind **Take payment** | ✅ Cash/card/split, walk-in, paid stay in tender sheet |
| Line expand for qty / price / discount | ✅ One-row lines by default |
| HQ platform config CRUD | ✅ `/hq/config` + `platform_settings` (`0015`) |
| HQ tenant extras + store/channel ops | ✅ Tenant detail extras + theme/announcement |
| Store chrome (Shopify-like) | ✅ Announcement, theme headers, 4-col footer, search |

---

## HQ (2026-08-18)

| Task | Status |
|------|--------|
| `/api/hq/me` 200 `{ allowed: false }` for non-admins | ✅ No more TopBar 403 |
| TopBar HQ link only when allowed | ✅ Label: MyPoz HQ |
| `/hq/whatsapp` fleet nav | ✅ |
| Command center storefront / WA / licence notes | ✅ |
| Tenant-facing chrome rebrand to MyPoz HQ | ✅ GMS ops docs unchanged |
| Provisioning empty-state note | ✅ HQ command center, tenants, onboard — run documented `upsert-admin.mjs`; no invented credentials |
| Full JSON backups (secrets redacted) | ✅ `/hq/backups`, `/api/hq/backup`, `/api/backup` |
| Light / dark theme cookie | ✅ `mypoz_theme` + TopBar toggle (not public storefront) |

---

## Jarvis (2026-08-19)

| Task | Status |
|------|--------|
| Owner tools: inventory, sales, low stock | ✅ |
| Period sales + channel split | ✅ `period_sales` (7/30/90d, optional source) |
| Top / slow SKUs | ✅ `top_products`, `slow_movers` from `sale_lines` |
| Demand hint | ✅ 28-day average × 7, labelled estimate |
| HQ quiet shops | ✅ `quiet_shops` + `tenant_health` sales totals |
| Tool arguments parsed | ✅ `runTool(name, plane, args)` |
| BYOK | ✅ Vercel `OPENAI_API_KEY` or org `app_documents` key `ai` |

---

## WhatsApp Cloud API (2026-08-18)

Ported domain logic from Whats App Auto into `grabber-pos` only (no nested tree, no Prisma).

| Task | Status |
|------|--------|
| `normalizeLkPhone` | ✅ `src/lib/whatsapp/phone.ts` |
| Greeting menu state machine + unit tests | ✅ `src/lib/whatsapp/menu.ts` |
| Bot uses `getRepository()` catalog | ✅ |
| Conversations in `app_collections` / local JSON | ✅ `whatsapp_conversations`, `whatsapp_messages` |
| Dedup by `waMessageId` | ✅ |
| Public webhook GET verify + POST HMAC | ✅ `/api/whatsapp/webhook` on `PUBLIC_PATHS` |
| Merchant `/whatsapp` settings + inbox | ✅ Launcher tile under Sales & comms |
| HQ `/hq/whatsapp` | ✅ |
| Checkout → `createSale` source `WHATSAPP` | ✅ Fallback POS hold if sale post fails |
| Durable webhook sales (no user JWT) | ✅ Service-role tenant + `whatsapp_create_order` (`0014`) |
| EN / SI / TA bot copy | ✅ `src/lib/whatsapp/i18n.ts` |
| Per-client phone + token CRUD (HQ + merchant) | ✅ `/hq/whatsapp`, `/whatsapp` |
| Staff handoff badge | ✅ `needsStaffReply` |
| Fulfillment WhatsApp ping | ✅ Commerce order status |
| Operating manual | ✅ `docs/MYPOZ_OPERATING_MANUAL.md` + `docs/WHATSAPP.md` |

Webhook env (names only): `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, optional `WHATSAPP_API_VERSION`. Applied `0014_whatsapp_orders.sql` and `0015_platform_settings.sql` on Anaz `vtawrxmkahpgwgydibox`.

Parked: Meta Live, Cloud API token, numeric Phone number ID (not a `+94…` display number).

---

## Verification

| Check | Status |
|-------|--------|
| TypeScript typecheck | Run this pass before push |
| Vitest | Run this pass before push |

---

## Next phases (out of this remaining-build pass)

1. **SaaS billing** — plans, invoices, dunning.
2. **Theme marketplace** — third-party packs after the live theme loop stays green.
3. **WhatsApp Live / Cloud API token** — `WHATSAPP_TOKEN` + numeric `WHATSAPP_PHONE_NUMBER_ID` on Vercel.
4. **Durable media** — Supabase Storage when local `public/uploads` is not enough (Vercel disk is ephemeral).
5. **Org attachment** — if login works but the tenant has no org, run `scripts/upsert-admin.mjs` as documented in `grabber-pos/docs/ADMIN_PROVISIONING_GUIDE.md`.

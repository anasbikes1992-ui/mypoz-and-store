# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Cashiers / counter staff** — bill customers quickly under time pressure, often with a barcode scanner and receipt printer.
- **Shop owners / managers** — stock, staff, expenses, reports, and day-end cash.
- **Resellers / Grabber operators** — onboard client organizations, set plans, branding, and licence expiry.
- **Secondary:** Flutter handheld users (companion app), public storefront shoppers (`/store/[slug]`).

## Product Purpose

GRABBER POS Studio is a multi-vertical point-of-sale and back-office platform. It lets a single tenant run retail, restaurant, repair, delivery, rooms, rentals, and related sale modes on one catalog and one billing engine, with optional multi-tenant licensing for resellers.

Success = a cashier completes a correct sale in seconds; stock and money stay consistent; a reseller can hand a branded, licence-gated instance to a client.

## Positioning

One **sale-mode launcher** + **shared billing engine** + **server-authoritative totals** (Postgres `create_sale` / local seam) + **plan/licence gating**, with a Flutter offline companion and a per-tenant public storefront. Not a single-vertical checkout widget.

## Operating Context

- Desktop / tablet browsers at the counter; dark ambient shop lighting is common.
- Demo mode (bundled JSON) for evaluation; production on Supabase + Vercel.
- Currency and copy frequently LKR / Sri Lankan retail conventions.
- Printers: ESC/POS receipt, KOT/BOT; optional WhatsApp invoice send.
- Auth: demo cookie or Supabase Auth; proxy is optimistic, RLS is authoritative.

## Capabilities and Constraints

**Confirmed in product today**
- 12+ sale-mode entry points (retail/wholesale/category via `/pos`, restaurant, delivery, repair, service, reloads, rooms, rent, hire purchase, play).
- Back-office modules via launcher + collection CRUD + specialized screens (inventory, PO/GRN, products import, barcode, reports, admin/licence).
- Cart with line discount caps, cash/change, customer + loyalty hooks, print/WhatsApp after sale.
- White-label brand + plan keys; expired licence blocks selling server-side.

**Constraints**
- Web app must stay runnable with zero Supabase config (demo).
- Client cart prices are never trusted.
- Prefer native controls and Operate-mode density over marketing chrome on authenticated screens.

**Open decisions (inferred — confirm with Grabber)**
- Exact public pricing tiers and SLAs on `/welcome`.
- Whether Digital Mode / Register Mode remain separate from retail.
- Depth of offline sync on web vs mobile-only.

## Brand Commitments

- Name: **GRABBER POS Studio**
- Company: **Grabber Mobility Solutions (Pvt) Ltd**
- No competitor product names in customer-facing copy.
- Accent identity: mint/teal on deep green-charcoal surfaces (see DESIGN.md).

## Evidence on Hand

- Seed catalog (~2,509 products) in demo data.
- Docs: `docs/PRODUCTION.md`, `CREDENTIALS.md`, `ARCHITECTURE.md`, `USER-GUIDE.md`, `RESELLER-GUIDE.md`, `GMS-OPERATIONS.md`, `CUSTOMER-STOREFRONT.md`, `FEATURE-PLAN.md`, `PRODUCT-GAP.md`.
- Do not invent testimonials or live client logos.

## Product Principles

1. **Counter speed first** — barcode, keyboard, and clear totals beat decoration.
2. **One engine, many modes** — verticals specialize; money math stays shared and server-checked.
3. **Honest states** — empty, loading, error, and licence expiry must teach the next action.
4. **Reseller-safe tenancy** — org isolation and licence enforcement are product features, not admin afterthoughts.
5. **Demo equals prod behavior** — same UI and rules; only the persistence seam changes.

## Accessibility & Inclusion

Target WCAG 2.2 Level AA on web: skip links, landmarks, labeled forms, focus-visible, contrast, `prefers-reduced-motion`. Touch targets ≥24×24 CSS px on primary POS controls.

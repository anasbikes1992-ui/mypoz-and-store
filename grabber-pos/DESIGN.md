---
name: GRABBER POS Studio
description: Apple-inspired colorful operate UI — light marketing, vivid dark terminal
colors:
  surface-0: "oklch(14% 0.012 250)"
  surface-1: "oklch(18% 0.014 250)"
  surface-2: "oklch(22% 0.016 250)"
  surface-3: "oklch(28% 0.018 250)"
  line: "oklch(36% 0.02 250)"
  text-strong: "oklch(98% 0.004 95)"
  text-body: "oklch(86% 0.01 95)"
  text-dim: "oklch(62% 0.016 250)"
  accent: "oklch(62% 0.19 250)"
  accent-strong: "oklch(54% 0.2 250)"
  accent-ink: "oklch(99% 0.01 250)"
  tint-blue: "oklch(62% 0.19 250)"
  tint-teal: "oklch(72% 0.14 180)"
  tint-coral: "oklch(68% 0.18 35)"
  tint-pink: "oklch(70% 0.16 350)"
  tint-amber: "oklch(78% 0.15 75)"
  tint-green: "oklch(72% 0.16 145)"
  warn: "oklch(80% 0.14 85)"
  danger: "oklch(66% 0.2 25)"
  info: "oklch(72% 0.12 230)"
  glow-cool: "oklch(55% 0.14 250 / 0.14)"
  glow-warm: "oklch(60% 0.12 35 / 0.1)"
  print-bg: "#ffffff"
  marketing-bg: "oklch(97% 0.008 95)"
  marketing-surface: "oklch(100% 0 0)"
typography:
  body:
    fontFamily: "Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "-0.011em"
  heading:
    fontFamily: "Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, SF Pro Display, Segoe UI, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.022em"
  mono:
    fontFamily: "JetBrains Mono, SF Mono, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0"
rounded:
  sm: "10px"
  md: "14px"
  lg: "20px"
  xl: "28px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.accent-strong}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-dim}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  input:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text-strong}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  panel:
    backgroundColor: "{colors.surface-1}"
    rounded: "{rounded.lg}"
    backdropFilter: "blur(16px)"
---

# Design System — GRABBER POS Studio

## 1. Purpose

Operate-mode UI for cashiers and managers with an **Apple HIG–inspired** language: soft depth, glass panels, spring motion, and **colorful mode tiles** (iOS home-screen energy) without purple marketing sludge. Authenticated POS stays a **refined dark charcoal** for shop lighting and bill readability; `/welcome` and `/login` use a **light colorful** marketing surface.

## 2. Color

- **Operate surfaces:** `surface-0` page → `surface-1` glass panels → `surface-2` inputs → `surface-3` chips. Borders use `line` (cool blue-gray).
- **Text:** `text-strong` titles, `text-body` content, `text-dim` meta. Target ≥ 4.5:1 contrast.
- **Primary accent:** vivid system-blue for CTAs, selected nav, live totals — not mint wash on every tile.
- **Tile tints:** cycle `tint-blue` / `teal` / `coral` / `pink` / `amber` / `green` per launcher mode (letter mark only — no emoji as structure).
- **Semantics:** `warn` upgrade/licence, `danger` errors/destructive, `info` neutral metrics.
- **Marketing light:** cream-white page (`marketing-bg`), white glass cards, same accent blues/corals for CTAs.
- Ambient dual radial glows (cool + warm) once on operate `surface-0`; do not stack glow inside every card.

## 3. Typography

- **Plus Jakarta Sans** via `next/font` (rounded Apple-adjacent), stacked with `-apple-system, BlinkMacSystemFont, "SF Pro Text" / "SF Pro Display"`.
- **JetBrains Mono** (with `SF Mono` fallback) for money, barcodes, IDs.
- Scale ~1.15: 12 / 14 / 16 / 20 / 24 / 30. Headings semibold, tracking ≤ −0.022em.
- Uppercase labels only for tiny section tags (tracking ~0.12–0.14em).

## 4. Layout

- Page max width **72rem** (`max-w-6xl`) for back office; POS uses full viewport under the 3.5rem top bar.
- Module screens: header row → search/filters → content. Gap 16–24px.
- POS: catalog flex-1 + bill panel fixed ~24rem; stack on narrow viewports.
- Radii: iOS-like `rounded-2xl` / `rounded-3xl` on panels and tiles.
- Touch targets ≥ 36px height on primary actions.

## 5. Components

- **Primary button:** accent fill, white/near-white ink, 14px radius, soft shadow, hover → accent-strong.
- **Ghost / secondary:** line border, dim text, hover border-accent.
- **Inputs:** surface-2 fill, line border, focus border-accent + subtle ring.
- **Tiles (launcher):** colorful tinted letter marks, glass surface, staggered spring enter.
- **Panels:** `backdrop-blur` + translucent surface-1; bill panel springs in from the right.
- **Empty states:** dashed panel + one sentence + primary action.
- **Modals:** dim backdrop, spring 360/30.

## 6. Motion

- Framer Motion springs (`type: "spring", stiffness: 380, damping: 28`) for welcome, login, launcher stagger, TopBar, BillPanel enter.
- Always gate with `useReducedMotion()` — skip transforms when reduced.
- 150–250ms ease-out for hover/focus; no endless loops on operate screens (login ambient blobs only when motion allowed).

## 7. Do / Don't

**Do**
- Use semantic tokens from `globals.css` / `@theme`.
- Brand-first welcome: GRABBER name is the hero signal.
- Keep cashier path scannable: search, categories, product card, bill total.
- Match ModuleHeader + TopBar patterns on every module.

**Don't**
- Purple-indigo gradient sludge as the default look.
- Emoji as the only visual system for tiles.
- Cards nested in cards; zero-offset neon glow shadows.
- `outline: none` without a focus-visible replacement.
- Break POS billing logic or APIs for cosmetics.

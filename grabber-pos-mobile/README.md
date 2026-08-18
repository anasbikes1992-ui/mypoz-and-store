# GRABBER POS Studio — Mobile

**By Grabber Mobility Solutions (Pvt) Ltd**

Offline-first handheld/tablet POS. Flutter 3 · Riverpod · go_router ·
supabase_flutter. Shares the same Supabase backend as the
[web app](../grabber-pos/README.md).

## Run

```bash
flutter pub get
flutter run \
  --dart-define=SUPABASE_URL=https://<ref>.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=<anon key>
```

Sign in with a Supabase user created by the web seed (`npm run seed`).
Without the `--dart-define` flags the app shows a configuration screen.

## Features

- **Auth** — Supabase email/password; `go_router` redirects on session change.
- **Catalog** — search + barcode scan, per-branch stock, tap to add to cart.
- **Cart** — quantity steppers and per-unit discount (capped at each product's
  max discount).
- **Checkout** — cash/card/wholesale, change calculation, confirm.
- **Offline-first** — if the network fails at checkout, the sale is persisted to
  a durable local queue and reported as "will sync". Queued sales flush
  automatically on next launch; the server RPC is idempotent on a per-sale
  `client_uuid`, so retries never double-post.
- **Sales** — recent transactions with expandable line detail.

## Architecture

```
lib/
├── core/        config (dart-define), theme, money
├── data/
│   ├── models/  Product, CartLine, Sale (immutable)
│   ├── pos_repository.dart   Supabase RPC/REST + offline fallback
│   └── offline_queue.dart    durable FIFO (shared_preferences)
├── state/       Riverpod providers + CartController (Notifier)
├── features/    login · pos · checkout · sales
└── router.dart  go_router + auth redirect
```

State management is Riverpod 3 (`Notifier` / `NotifierProvider`). The repository
talks to Supabase via the shared `catalog`, `product_by_barcode`, and
`create_sale` RPCs — identical contracts to the web app.

## Quality

```bash
flutter analyze      # clean (1 forward-deprecation info on anonKey)
flutter test         # unit tests: cart totals + product parsing
dart format lib test
```

## Build

```bash
# Android (Play Store bundle)
flutter build appbundle --release \
  --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=... \
  --obfuscate --split-debug-info=build/debug-info

# iOS
flutter build ipa --release \
  --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...
```

The anon key is safe to embed (gated by RLS). The service-role key must never be
in the app. See [../grabber-pos/docs/DEPLOYMENT.md](../grabber-pos/docs/DEPLOYMENT.md).

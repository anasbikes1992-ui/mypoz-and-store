# PAYMENT STATE MACHINE

**Date:** 2026-08-25  
**Status:** AS-IS verified · TARGET design for Phase 2 (0028/0029) · **not implemented yet**

---

## AS-IS

### 1. Sale tender rows — `payments` table

- Inserted inside `create_sale_internal` when sale completes
- Columns: id, sale_id, method, amount, reference, created_at
- RLS SELECT-only for clients

### 2. Gateway lifecycle — `app_collections` / `gateway-payments`

File: `src/lib/server/gateway-payments-store.ts`

Statuses in app types: PENDING → PAID (and others via `PayStatus`)

Idempotency (unit-tested logic):

- If already PAID + webhook PAID → return success
- Licence: `meta.licenceAppliedAt`
- Sale complete: `meta.completedAt`
- Amount mismatch → reject

Completion: `completePendingSale` → `storefront_create_order` (service role) — stock only after PAID.

### 3. POS card pending

`SupabaseRepository.createSale` **throws** if `status === "pending"`  
→ POS card-on-counter **not** on durable path today.

### 4. Local demo

`sales.json` / `gateway-payments.json` when service role / Supabase off — forbidden in production (`requireSupabase`).

---

## TARGET STATE MACHINE

### Cash / COD (unchanged intent)

```text
create sale (PAID) → payments row → stock decrement (same txn) → audit
```

### Card / online

```text
DRAFT / INTENT
  → PENDING_PAYMENT   (no stock decrement)
  → PAID              (verified webhook)
  → COMPLETED         (sale committed + stock once)
```

Failure:

```text
PENDING_PAYMENT → FAILED | EXPIRED | CANCELLED
```

### Canonical tables (0028 — names final at implement time)

```text
payment_intents
payment_attempts
payment_events    UNIQUE (provider, provider_event_id)
payments          (settled; link sale_id / intent_id)
```

### Webhook transaction pattern

```text
BEGIN
  INSERT payment_event ON CONFLICT (provider, provider_event_id) DO NOTHING
  IF not inserted → COMMIT; return already_processed
  validate → lock intent → transition → complete sale/order → stock → audit
  mark event processed
COMMIT
```

Never: `clientUuid = null` for idempotent money ops.

### Inventory rule

**No stock decrement on payment initiation.** Only on committed PAID/COMPLETED.

---

## Required tests before Gate 4

- Same webhook ×2 and ×10  
- Concurrent duplicate webhook  
- Success then failure / failure then success  
- Wrong amount / unknown txn / bad signature  
- Licence extend once only  
- POS card pending → paid → one stock move  

---

## Migration note

Do not drop `payments` casually — extend and document tender vs intent. Migrate `gateway-payments` collection rows into SQL in a controlled cutover, then remove collection writer.

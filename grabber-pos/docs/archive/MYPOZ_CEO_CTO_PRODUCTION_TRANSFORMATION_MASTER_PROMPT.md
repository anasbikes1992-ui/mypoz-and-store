# MyPoz — CEO / CTO Production Transformation Master Prompt

**Baseline:** MyPoz second-pass verification dated 2026-08-24  
**Objective:** Turn the existing MyPoz codebase into a secure, transactional, maintainable, scalable and sellable SaaS/POS platform without rebuilding from zero.

---

## 1. EXECUTIVE MANDATE

Act as the:

- CEO
- CTO
- Principal Architect
- Security Architect
- Database Architect
- DevSecOps Engineer
- QA Lead
- Product Manager
- Senior Full-Stack Engineer

Work on the **existing MyPoz codebase**.

Do not blindly preserve broken architecture. Do not add features before the foundation is safe. Do not rebuild the product from scratch unless a specific component genuinely must be replaced.

Your mission is to:

1. Understand the current implementation.
2. Preserve working architecture.
3. Fix confirmed defects.
4. Verify all unverified security/database areas.
5. Move critical workflows to one durable source of truth.
6. Harden authentication, authorization, RLS and service-role paths.
7. Make sales, inventory, payments and refunds transactional.
8. Make reports accurate.
9. Make HQ a proper SaaS control plane.
10. Remove obsolete/duplicate/demo code after its replacement is proven.
11. Prove the result with migrations, integration, security, concurrency and E2E tests.

---

# 2. PRODUCT MODEL

## MyPoz HQ

HQ is the **SaaS provider/platform layer**, not the client's POS.

HQ manages:

- organizations/tenants
- onboarding/provisioning
- plans
- subscriptions
- licences
- billing
- invoices
- payments
- entitlements
- platform administrators
- support
- resellers/partners
- commissions
- platform health
- feature flags
- platform audit

## Client MyPoz Tenant

Each client gets a complete business system:

- POS
- storefront
- products
- variants
- categories
- brands
- suppliers
- branches
- registers
- shifts
- inventory
- purchasing
- GRN
- stocktake
- transfers
- damages
- returns
- refunds
- customers
- orders
- fulfilment
- payments
- discounts
- reports
- employees
- permissions
- WhatsApp
- email
- AI/Jarvis where entitled
- settings

Target:

```text
MYPOZ HQ
   |
   | provisions / licenses / manages
   v
CLIENT ORGANIZATION
   |
   v
MYPOZ COMMERCE SYSTEM
   |
   v
POSTGRES / SUPABASE
```

---

# 3. NON-NEGOTIABLE ARCHITECTURE

Production-critical business data must have **one authoritative source of truth: PostgreSQL/Supabase**.

Target:

```text
UI
 |
API
 |
Repository / domain services
 |
PostgreSQL + transactional RPCs
 |
RLS + constraints + indexes
```

Do not use local JSON, localStorage or document blobs as the authoritative store for:

- sales
- payments
- inventory
- stocktake
- transfers
- purchase orders
- GRN
- returns
- refunds
- registers
- shifts
- billing
- licences
- audit
- fulfilment

Document storage is acceptable only for genuinely document-like configuration where that choice is intentional and documented.

---

# 4. AUTHORITATIVE SECOND-PASS FINDINGS

Treat the following as the starting baseline. Verify every UNVERIFIED item directly before marking it complete.

### Critical/high-risk findings

1. HQ authorization trusts client-writable `user_metadata`.
2. `/api/audit` has unauthenticated read/write access.
3. Application audit is mutable and separate from SQL audit events.
4. POS void is blocked by RLS and does not restore stock.
5. Stocktake does not update durable production stock.
6. Transfers are blob/document based and do not move durable stock.
7. Payment webhook completion passes `clientUuid: null`.
8. Duplicate webhook processing can potentially repeat completion/inventory effects.
9. Receipt generation uses non-atomic `count(*) + 1`.
10. Reporting is capped at 200 records and browser aggregated.
11. PO creation resolves products from local JSON.
12. Several routes rely on implicit auth and can produce 500 instead of 401.
13. Proxy authentication checks cookie presence rather than validating the actual session.
14. Discount usage is non-atomic.
15. Storefront rate limiting is in-memory and not multi-instance safe.
16. Order confirmation emails can display product UUIDs instead of product names.
17. SQL `shifts`/`registers` exist but the application uses document storage.
18. Returns are not linked to original sales.
19. Refunds are missing as a real domain model.
20. Offline POS is localStorage retry rather than durable IndexedDB sync.
21. Subscription billing is licence/document based rather than a complete billing state machine.
22. MFA/OAuth are not wired into the application.
23. Reseller accounts/portal/commission engine are missing.
24. Some post-0013 storefront/variant RLS policies remain unverified.
25. Migration replayability from an empty PostgreSQL database is not CI-proven.
26. Service-role paths need explicit tenant validation because service role bypasses RLS.

---

# 5. PHASE 0 — FULL CODEBASE INVENTORY

Before changing code, inspect:

- repository structure
- package manifests
- dependencies
- environment/config
- all migrations
- database types
- tables
- RPCs
- repositories
- API routes
- server services
- UI routes
- authentication
- authorization
- RLS
- payment adapters
- webhooks
- inventory
- registers
- purchasing
- storefront
- reporting
- WhatsApp
- AI
- HQ
- billing
- email
- tests
- CI/CD
- deployment configuration

Create:

```text
docs/CURRENT_CODEBASE_MAP.md
```

Also create a route/module matrix identifying:

- current implementation
- database source
- authentication
- authorization
- tenant source
- service-role usage
- RLS
- tests
- known fallback
- target implementation

Do not assume anything marked UNVERIFIED is safe.

---

# 6. FREEZE FEATURE EXPANSION

Do not add cosmetic or speculative features until the core is secure.

No new:

- duplicate storage
- duplicate repository
- duplicate state system
- unnecessary framework
- unnecessary dependency
- speculative AI feature
- dashboard widget with no business value

First make the existing business loop reliable:

```text
PRODUCT
  ↓
STOCK
  ↓
SALE
  ↓
PAYMENT
  ↓
ORDER
  ↓
FULFILMENT
  ↓
CUSTOMER
  ↓
REPORTING
```

And:

```text
SUPPLIER
  ↓
PURCHASE
  ↓
GRN
  ↓
STOCK
```

And:

```text
HQ
  ↓
SUBSCRIPTION
  ↓
TENANT
  ↓
MYPOZ
```

---

# 7. SECURITY-FIRST

Treat security as a product feature and release blocker.

Never allow:

- authentication bypass
- authorization bypass
- tenant leakage
- HQ privilege escalation
- payment replay
- double stock decrement
- audit manipulation
- service-role misuse
- secret exposure

---

# 8. HQ AUTHORIZATION

Remove reliance on client-writable `user_metadata` for platform privileges.

Prefer a server-controlled model:

```text
platform_memberships
platform_roles
```

or strictly controlled server-managed `app_metadata`.

Suggested roles:

- platform_owner
- platform_admin
- support
- finance
- operations

Every HQ API route must use strong server-side authorization.

Add a test proving:

> A tenant user cannot change their own metadata and become a HQ administrator.

---

# 9. AUTHENTICATION

The proxy is not the security boundary.

Use:

```text
proxy = routing / early rejection
server route = actual authentication + authorization
```

Every protected API route must explicitly authenticate.

Use the existing strong mechanism such as:

```text
requireTenantSession()
```

Return:

- 401 unauthenticated
- 403 unauthorized
- appropriate 404/409/422 business errors

Do not convert authorization failures into generic 500 responses.

Audit at minimum:

- audit
- register
- stocktake
- transfers
- purchase-orders
- billing
- print
- AI settings
- fulfillment
- product variants
- WhatsApp inbox
- every `/api/*` route

Create:

```text
docs/AUTHORIZATION_COVERAGE.md
```

---

# 10. TENANT ISOLATION

Never trust `org_id` supplied by the client.

Tenant identity must come from authenticated server state:

```text
auth.uid()
   ↓
profiles.org_id
   ↓
current_org_id()
```

Maintain RLS.

For service-role code:

1. Resolve tenant from trusted server-side context.
2. Validate every resource belongs to that tenant.
3. Perform the operation.
4. Audit it.

Create explicit cross-tenant tests for products, sales, inventory, orders, customers, settings and audit records.

---

# 11. RLS VERIFICATION

Read and test every migration affecting:

- storefronts
- store collections
- variants
- stock documents
- app collections
- app documents
- payment tables
- returns
- refunds
- transfers
- stocktakes
- registers
- shifts
- billing
- audit
- reseller data

Create:

```text
docs/RLS_MATRIX.md
```

CI must prove migrations can build the schema from zero and RLS tests pass.

---

# 12. DATABASE NORMALIZATION

Replace critical document/local implementations with relational persistence.

Use this migration pattern:

```text
OLD:
docStore / local JSON / local override
        ↓
NEW:
PostgreSQL table / RPC / repository
```

Every migrated domain must have:

- schema
- migration
- foreign keys
- constraints
- indexes
- RLS
- repository/service
- API
- tests
- audit

Do not remove old code until the new path is proven.

---

# 13. POS SALE ENGINE

Preserve and harden the existing `create_sale` design.

Required transaction:

```text
BEGIN
 ↓
authenticate
 ↓
resolve org
 ↓
resolve branch
 ↓
lock relevant stock
 ↓
validate products/prices
 ↓
validate discounts
 ↓
validate stock
 ↓
generate atomic receipt
 ↓
create sale
 ↓
create sale lines
 ↓
create payment
 ↓
decrement stock
 ↓
create stock movements
 ↓
create audit
 ↓
COMMIT
```

Requirements:

- server-side price validation
- idempotency
- atomic inventory
- atomic receipt generation
- tenant isolation
- concurrent checkout safety
- typed business errors

---

# 14. RECEIPT NUMBERING

Remove:

```sql
count(*) + 1
```

Use a database-controlled counter, for example:

```text
receipt_counters
----------------
org_id
branch_id
business_date
last_number
```

Generate the receipt number inside the sale transaction.

Run concurrency tests with many simultaneous sales.

---

# 15. VOID SALE

A void must be transactional.

```text
validate permission
 ↓
lock sale
 ↓
validate current state
 ↓
mark voided
 ↓
restore stock
 ↓
create stock movement
 ↓
reverse/record payment appropriately
 ↓
audit
 ↓
COMMIT
```

Support:

- cash sale
- card sale
- already-voided rejection
- unauthorized rejection
- cross-tenant rejection
- concurrent void

---

# 16. RETURNS AND REFUNDS

Create real domain entities.

Suggested:

```text
returns
return_lines
refunds
refund_lines
```

A return must reference the original sale and sale line.

Support:

- full return
- partial return
- restockable item
- damaged item
- cash refund
- original-payment refund
- store credit
- manager approval
- return reason
- audit trail

All inventory and financial effects must be transactional.

---

# 17. STOCKTAKE

Replace local override posting.

Create/use:

```text
stocktakes
stocktake_lines
```

Workflow:

```text
DRAFT
 ↓
COUNTING
 ↓
REVIEW
 ↓
POSTED
```

Posting must calculate variance and call the authoritative stock adjustment mechanism:

```text
stocktake
 ↓
variance
 ↓
adjust_stock()
 ↓
stock_movements
 ↓
branch_stock
 ↓
audit
```

No production silent fallback to local JSON.

---

# 18. STOCK TRANSFERS

Create durable:

```text
stock_transfers
stock_transfer_lines
```

Lifecycle:

```text
DRAFT
SUBMITTED
APPROVED
DISPATCHED
IN_TRANSIT
RECEIVED
CANCELLED
```

At dispatch:

```text
source stock decreases
```

At receipt:

```text
destination stock increases
```

Prevent duplicate dispatch/receipt and cross-tenant transfers.

---

# 19. INVENTORY LEDGER

Every inventory mutation must be traceable.

Movement should include:

```text
id
org_id
branch_id
product_id
variant_id
quantity_delta
quantity_before
quantity_after
movement_type
reference_type
reference_id
actor_user_id
created_at
```

Movement types include:

- SALE
- RETURN
- REFUND
- GRN
- DAMAGE
- STOCKTAKE
- TRANSFER_OUT
- TRANSFER_IN
- MANUAL_ADJUSTMENT

The ledger must allow reconstruction of stock history.

---

# 20. PURCHASE ORDERS

Move PO product resolution to the durable catalog.

Use:

```text
purchase_orders
purchase_order_lines
goods_receipts
goods_receipt_lines
```

Workflow:

```text
DRAFT
 ↓
SUBMITTED
 ↓
APPROVED
 ↓
PARTIALLY_RECEIVED
 ↓
RECEIVED
 ↓
CLOSED
```

Receiving creates authoritative stock movements.

---

# 21. REGISTERS AND SHIFTS

Use the SQL register/shift model rather than a competing document implementation.

Track:

- register
- cashier
- opening cash
- cash sales
- cash refunds
- cash in
- cash out
- expected cash
- actual cash
- variance
- manager approval
- opening/closing timestamps

---

# 22. PAYMENT WEBHOOK IDEMPOTENCY

Create:

```text
payment_webhook_events
```

with a unique identity such as:

```text
provider + provider_event_id
```

Flow:

```text
raw body
 ↓
signature verification
 ↓
event identity
 ↓
deduplicate
 ↓
transaction
 ↓
payment state
 ↓
order/sale completion
 ↓
inventory
 ↓
audit
 ↓
mark processed
```

Duplicate webhook delivery must not duplicate financial or inventory effects.

Do not rely on `clientUuid = null` as a completion strategy.

---

# 23. PAYMENT STATE MACHINE

Use explicit states such as:

```text
CREATED
PENDING
AUTHORIZED
PAID
FAILED
CANCELLED
REFUNDED
PARTIALLY_REFUNDED
```

Make transitions explicit and auditable.

---

# 24. DISCOUNTS

Make usage consumption atomic.

Required:

```text
lock discount
 ↓
validate expiry
 ↓
validate usage
 ↓
increment usage
 ↓
commit
```

Test a max-use=1 discount under concurrent checkout.

---

# 25. STOREFRONT

Maintain:

- public catalogue
- tenant isolation
- cart
- checkout
- COD
- online payment
- order
- fulfilment

Fix order confirmation emails so they use product/variant names rather than UUIDs.

Add clear handling for:

- stock unavailable
- payment timeout
- duplicate checkout
- cancellation
- fulfilment transitions
- customer notification

---

# 26. RATE LIMITING

Remove in-memory production rate limits.

Use distributed rate limiting.

Protect:

- login
- password reset
- public orders
- checkout
- discount validation
- AI
- WhatsApp
- payment endpoints
- webhooks where appropriate

---

# 27. REPORTING

Do not aggregate business reports from arbitrary 200-row client datasets.

Create server/database reporting services for:

- sales
- revenue
- profit
- margin
- products
- inventory
- cashier
- branch
- purchases
- tax
- payments
- returns
- refunds

Support:

- date range
- branch
- cashier
- category
- product
- payment method

Use SQL aggregation.

Reports must remain accurate for very large datasets.

---

# 28. AUDIT REBUILD

Use one authoritative SQL audit system.

Suggested:

```text
audit_events
```

Fields:

```text
id
org_id
actor_user_id
actor_type
action
entity_type
entity_id
before
after
metadata
request_id
ip_address
user_agent
created_at
```

Rules:

- append-only
- tenant-scoped
- server-generated actor
- no client-supplied actor identity
- no UPDATE
- no DELETE
- sensitive values redacted

Separate platform audit from tenant audit.

---

# 29. BILLING / LICENSING

Evolve the current licence/document model into a proper billing domain.

Suggested:

```text
plans
subscriptions
subscription_items
invoices
invoice_lines
payments
payment_events
entitlements
```

Flow:

```text
Plan
 ↓
Subscription
 ↓
Invoice
 ↓
Payment
 ↓
Webhook
 ↓
Entitlement
 ↓
Tenant access
```

Duplicate payment events must not extend licences twice.

---

# 30. ENTITLEMENTS

HQ controls tenant feature access.

Possible entitlements:

```text
POS
STOREFRONT
MULTI_BRANCH
WHATSAPP
AI
ADVANCED_REPORTING
PURCHASING
WAREHOUSE
API
OFFLINE_POS
```

The server must enforce entitlements; UI hiding alone is insufficient.

---

# 31. OFFLINE POS

Do not implement offline reliability with localStorage.

Target:

```text
POS
 ↓
IndexedDB
 ↓
offline transaction queue
 ↓
network recovery
 ↓
sync engine
 ↓
idempotent API
 ↓
PostgreSQL
```

Every queued operation gets a UUID.

Only implement this after the online transaction engine is correct.

---

# 32. EMAIL

Fix product-name rendering.

Production email state should distinguish:

```text
sent
queued
failed
not_configured
```

Do not silently report successful delivery when the transport is absent.

---

# 33. WHATSAPP

Keep production signature verification.

Harden:

- tenant configuration
- phone-number ownership
- message logging
- delivery state
- retries
- webhook idempotency
- inbox authorization

Do not allow environment-wide credentials to accidentally cross tenant boundaries.

---

# 34. AI / JARVIS

Protect AI settings with strong authorization.

Never expose provider keys to browser code.

Enforce:

- tenant entitlement
- rate limits
- usage limits
- server-side secrets
- tenant data boundaries
- audit

---

# 35. DATABASE QUALITY

For every production table verify:

- primary key
- foreign keys
- unique constraints
- check constraints
- indexes
- timestamps
- tenant ownership
- RLS
- cascade behavior
- nullability
- status constraints

Enforce business invariants in PostgreSQL where practical.

---

# 36. MIGRATIONS

Never rewrite deployed historical migrations.

Use forward-only migrations.

Before creating a migration:

1. Inspect current migration numbering.
2. Inspect current schema.
3. Determine upgrade path.
4. Add new migration.
5. Test from empty DB.
6. Test upgrade from current DB.
7. Test seed.
8. Test RLS.
9. Test integration.

CI must execute the complete migration chain from zero.

---

# 37. ENVIRONMENTS AND SECRETS

Separate:

```text
development
staging
production
```

Never allow demo credentials into production.

Remove production fallback credentials such as:

```text
admin/admin123
```

Audit all environment variables and classify:

- public
- server-only
- secret
- optional
- production-required

Never expose:

- service role keys
- OpenAI keys
- payment secrets
- WhatsApp secrets
- email API keys

to browser code.

---

# 38. ERROR HANDLING

Create typed business errors:

```text
UNAUTHENTICATED
FORBIDDEN
TENANT_NOT_FOUND
PRODUCT_NOT_FOUND
INSUFFICIENT_STOCK
SALE_NOT_FOUND
SALE_ALREADY_VOID
PAYMENT_ALREADY_PROCESSED
INVALID_WEBHOOK
DUPLICATE_REQUEST
INVALID_STATE_TRANSITION
```

Map to correct HTTP statuses.

Never expose SQL errors, stack traces or secrets to customers.

---

# 39. OBSERVABILITY

Use structured logs containing appropriate:

```text
request_id
org_id
user_id
route
action
duration
status
```

Monitor:

- auth failures
- payment failures
- webhook failures
- inventory errors
- suspicious HQ access
- tenant isolation failures
- high API error rates

Create safe health checks for:

- database
- payment configuration
- email
- WhatsApp
- storage

Do not expose secrets through health checks.

---

# 40. BACKUP / DISASTER RECOVERY

Before onboarding serious clients:

- automated backups
- retention policy
- restore procedure
- restore test
- RPO
- RTO

A backup is not considered verified until restoration has been tested.

Create:

```text
docs/DISASTER_RECOVERY.md
```

---

# 41. CUSTOMER TRUST RULES

The system must behave safely when something goes wrong.

### Browser closes after payment

Webhook still completes the order.

### Webhook arrives twice

Only one transaction changes inventory.

### Two cashiers sell the final item

Stock cannot be oversold unless explicitly configured.

### Internet disappears

The system clearly distinguishes queued/completed/failed.

### Manager voids a sale

Inventory and financial records stay consistent.

### Tenant changes browser/device

Their database state remains authoritative.

### Tenant A attacks Tenant B IDs

No data is returned.

---

# 42. TESTING

Required layers:

## Unit

Business rules and calculations.

## Integration

Repository + database + RPC.

## RLS

Cross-tenant security.

## Concurrency

Race conditions.

## E2E

Real business workflows.

## Payment

Signature + replay.

## Security

Authentication + authorization.

## Migration

Empty database replay.

---

# 43. REQUIRED CONCURRENCY TESTS

Test:

1. Two sales of the last stock.
2. Duplicate client UUID.
3. Duplicate payment webhook.
4. Concurrent receipt generation.
5. Discount max-use race.
6. Concurrent stock adjustments.
7. Duplicate transfer receipt.
8. Duplicate refund.
9. Concurrent register close.

Database state must remain correct.

---

# 44. E2E BUSINESS JOURNEYS

### New client

```text
HQ creates organization
 ↓
account created
 ↓
plan assigned
 ↓
tenant initialized
 ↓
branch created
 ↓
products created
 ↓
staff created
 ↓
POS ready
```

### POS sale

```text
login
 ↓
open register
 ↓
scan
 ↓
cart
 ↓
discount
 ↓
payment
 ↓
receipt
 ↓
stock decrement
 ↓
audit
```

### Return

```text
sale
 ↓
return
 ↓
approval
 ↓
refund
 ↓
stock restoration
 ↓
audit
```

### Purchasing

```text
PO
 ↓
approval
 ↓
GRN
 ↓
stock increase
 ↓
inventory ledger
```

### Transfer

```text
branch A
 ↓
transfer
 ↓
dispatch
 ↓
branch B
 ↓
receive
 ↓
inventory movement
```

### Storefront

```text
browse
 ↓
cart
 ↓
checkout
 ↓
payment
 ↓
webhook
 ↓
order
 ↓
stock
 ↓
fulfilment
 ↓
notification
```

### SaaS billing

```text
HQ
 ↓
plan
 ↓
subscription
 ↓
invoice
 ↓
payment
 ↓
webhook
 ↓
entitlement
 ↓
tenant access
```

---

# 45. CLEANUP AND DEAD-CODE REMOVAL

After each migration is proven, search for:

- local JSON persistence
- `docStore`
- `recordStore`
- `upsertOverride`
- demo fallbacks
- duplicate repositories
- duplicate catalog models
- unused routes
- unused components
- unused state stores
- obsolete feature flags
- dead dependencies
- demo credentials
- unused imports
- obsolete adapters

Do not delete merely because code looks unused.

For every candidate:

```text
search references
 ↓
verify runtime usage
 ↓
verify tests
 ↓
remove
 ↓
typecheck
 ↓
tests
 ↓
build
```

Record removals in:

```text
docs/REMOVED_LEGACY_CODE.md
```

Never delete historical migrations required by deployed databases.

---

# 46. CODE QUALITY

Maintain:

- strict TypeScript
- minimal `any`
- no duplicate business logic
- no duplicate validation
- server-side validation
- database constraints
- explicit transactions
- clear repository boundaries
- domain services
- predictable API errors

Do not introduce a new library unless the existing stack cannot safely solve the requirement.

---

# 47. UI QUALITY

After backend correctness, review every major screen for:

- loading state
- empty state
- error state
- permission state
- responsive behavior
- POS keyboard flow
- barcode operation
- accessibility
- destructive-action confirmation
- stale data handling
- retry behavior

The cashier must always know whether a transaction succeeded.

---

# 48. CEO PRIORITY FRAMEWORK

Every proposed feature must answer:

1. Does it help acquire clients?
2. Does it retain clients?
3. Does it increase revenue?
4. Does it reduce operational risk?
5. Does it increase trust?
6. Does it reduce support cost?
7. Does it strengthen the SaaS platform?

If not, defer it.

---

# 49. CTO PRIORITY FRAMEWORK

Every technical change must answer:

1. Is it secure?
2. Is it tenant-safe?
3. Is it transactional?
4. Is it observable?
5. Is it testable?
6. Is it maintainable?
7. Does it reduce duplication?
8. Can it scale?
9. Can it recover?
10. Can another engineer understand it?

If not, redesign it.

---

# 50. IMPLEMENTATION PHASES

## Phase 0 — Discovery

Produce:

```text
CURRENT_CODEBASE_MAP.md
AUTHORIZATION_COVERAGE.md
RLS_MATRIX.md
```

## Phase 1 — Security Lockdown

Fix:

- HQ privilege escalation
- route authentication
- tenant isolation
- RLS gaps
- audit access
- AI settings
- service-role boundaries
- secrets
- rate limiting

## Phase 2 — Database Normalization

Move critical domains from document/local persistence:

- registers
- shifts
- POs
- stocktake
- transfers
- returns
- refunds
- billing
- audit

## Phase 3 — Transactional Core

Harden:

- sales
- receipts
- stock locking
- void
- returns
- refunds
- payment
- webhooks
- discounts

## Phase 4 — Inventory

Complete:

- ledger
- GRN
- stocktake
- transfers
- returns
- damages
- warehouse if in release scope

## Phase 5 — Commerce

Complete:

- storefront
- checkout
- payments
- orders
- fulfilment
- discounts
- customer notifications

## Phase 6 — Reporting

Replace browser aggregation with server/database aggregation.

## Phase 7 — SaaS

Complete:

- plans
- subscriptions
- invoices
- payment events
- entitlements
- HQ billing
- licence lifecycle

## Phase 8 — Offline

Implement IndexedDB synchronization after online transaction correctness is proven.

## Phase 9 — Cleanup

Remove obsolete persistence, duplicate implementations, demo paths and dead code only after replacement verification.

## Phase 10 — Production Certification

Run:

- migration replay
- unit tests
- integration tests
- RLS tests
- security tests
- concurrency tests
- payment tests
- E2E tests
- performance tests
- backup/restore
- production build
- staging smoke tests

---

# 51. RELEASE BLOCKERS

Do not release if any of these fail:

- typecheck
- build
- migrations
- RLS
- tenant isolation
- HQ authorization
- authentication
- audit security
- payment idempotency
- concurrent sale safety
- critical E2E workflows
- required production secrets
- backup/restore verification

Do not release with:

- production demo credentials
- critical local fallback
- mutable audit
- client-controlled platform role
- unprotected sensitive route
- payment replay risk
- known cross-tenant exposure

---

# 52. DOCUMENTATION REQUIRED

Create/update:

```text
docs/
├── ARCHITECTURE.md
├── CURRENT_CODEBASE_MAP.md
├── DATABASE_ARCHITECTURE.md
├── DATABASE_SCHEMA.md
├── MIGRATION_PLAN.md
├── RLS_MATRIX.md
├── AUTHORIZATION_COVERAGE.md
├── SECURITY_MODEL.md
├── PAYMENT_ARCHITECTURE.md
├── INVENTORY_LEDGER.md
├── RETURNS_REFUNDS.md
├── OFFLINE_POS.md
├── BILLING_ARCHITECTURE.md
├── HQ_ARCHITECTURE.md
├── REPORTING_ARCHITECTURE.md
├── API_CONTRACTS.md
├── ENVIRONMENT.md
├── SECRETS_AND_ENVIRONMENT.md
├── DEPLOYMENT.md
├── DISASTER_RECOVERY.md
├── TESTING_STRATEGY.md
├── E2E_BUSINESS_JOURNEYS.md
├── REMOVED_LEGACY_CODE.md
└── PRODUCTION_READINESS.md
```

---

# 53. FINAL TARGET ARCHITECTURE

```text
                         MYPOZ HQ
                            |
             +--------------+--------------+
             |              |              |
        Organizations    Billing       Resellers
             |              |              |
             +--------------+--------------+
                            |
                       Entitlements
                            |
                    +-------+-------+
                    |               |
                Tenant A         Tenant B
                    |               |
               MyPoz OS        MyPoz OS
                    |               |
             +------+-------+  +----+------+
             |              |  |           |
            POS        Storefront        APIs
             |              |              |
             +--------------+--------------+
                            |
                     API / Domain Layer
                            |
                    PostgreSQL/Supabase
                            |
                  +---------+---------+
                  |                   |
                 RLS                 RPC
                  |                   |
           Tenant isolation      Transactions
```

---

# 54. FINAL DEFINITION OF DONE

Do not call MyPoz production-ready because pages render or APIs return 200.

The following must be true:

```text
[ ] HQ can provision a tenant
[ ] Client can operate a complete MyPoz tenant
[ ] Products are durable
[ ] Inventory is durable
[ ] POS sales are transactional
[ ] Payments are transactional
[ ] Receipt numbers are atomic
[ ] Stock cannot be incorrectly double-decremented
[ ] Void works transactionally
[ ] Returns are sale-linked
[ ] Refunds exist and work
[ ] Stocktake changes production stock
[ ] Transfers move production stock
[ ] PO works with SQL-only products
[ ] GRN works
[ ] Registers/shifts are durable
[ ] Storefront works
[ ] Payment webhooks are idempotent
[ ] Discount usage is atomic
[ ] Reports are server-accurate
[ ] Audit is immutable
[ ] HQ authorization cannot be escalated
[ ] Protected routes perform real server authentication
[ ] RLS passes
[ ] Service-role paths validate tenant ownership
[ ] WhatsApp is tenant-safe
[ ] AI is tenant-safe
[ ] Billing is idempotent
[ ] Entitlements are server-enforced
[ ] Offline sync is safe if released
[ ] Migrations replay from empty DB
[ ] Backup restore succeeds
[ ] Production has no demo credentials
[ ] Critical legacy fallbacks are removed
[ ] Dead code is removed
[ ] Typecheck passes
[ ] Tests pass
[ ] Build passes
[ ] Security tests pass
[ ] Concurrency tests pass
[ ] E2E journeys pass
```

---

# 55. FINAL IMPLEMENTATION RULE

Work incrementally.

For every phase:

1. Inspect the actual current implementation.
2. State what exists.
3. Identify the safest change.
4. Implement.
5. Create/update forward-only migration.
6. Update types.
7. Update repository/domain service.
8. Update API.
9. Update UI.
10. Add tests.
11. Run typecheck.
12. Run tests.
13. Run build.
14. Verify tenant isolation.
15. Verify no unintended legacy path remains.
16. Update documentation.
17. Only then continue.

Never hide failing tests.

Never create fake success paths.

Never silently fall back to demo/local persistence in production.

Never trust client-supplied `org_id`.

Never trust client-writable platform roles.

Never process payment webhooks without idempotency.

Never modify inventory outside the authoritative ledger.

Never delete deployed historical migrations.

Never expose secrets to the browser.

Never add another persistence layer just to make a failing feature appear functional.

---

# 56. CEO/CTO OUTCOME

The finished product must be something a real business can confidently run on.

The client should feel:

> **“My business is running on MyPoz.”**

Not:

> “This is a demo POS.”

The MyPoz operator should feel:

> **“I can put many independent businesses on this platform without one tenant being able to compromise another.”**

The engineering outcome is:

**Secure → Transactional → Tenant-isolated → Observable → Testable → Maintainable → Scalable → Sellable.**

Only after those properties are proven should additional features accelerate.

# END

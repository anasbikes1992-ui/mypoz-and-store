# MYPOZ — EXISTING SYSTEM DISCOVERY, AUDIT & GAP ANALYSIS

You are working on the existing MyPoz codebase located at:

`D:\MyPoz & Store`

The original source was identified as:

`D:\Codebases\GrabberPoz-main`

We are planning to evolve this existing MyPoz POS into:

**MyPoz Commerce Cloud**

The goal is to add a powerful Shopify-style online-store capability while preserving and reusing the existing MyPoz POS, commerce engine, database, authentication, inventory, orders, payments, and existing storefront wherever possible.

## CRITICAL RULE

DO NOT MODIFY CODE YET.

DO NOT REFACTOR YET.

DO NOT DELETE ANYTHING.

DO NOT CREATE NEW TABLES YET.

DO NOT START IMPLEMENTING THE Commerce Cloud specification yet.

First perform a complete discovery and gap analysis.

We need to understand exactly what already exists before deciding what needs to be changed.

---

# 1. PROJECT STRUCTURE

Inspect the entire workspace.

Report:

- root folders
- applications
- packages
- libraries
- services
- scripts
- configuration files
- database folders
- Supabase folders
- migrations
- documentation
- tests
- deployment configuration

Create a complete tree of the relevant project structure.

Do not dump huge node_modules/build directories.

Ignore:

- node_modules
- .next
- dist
- coverage
- generated caches
- build artifacts

Identify all actual source code.

---

# 2. APPLICATIONS

Identify every application.

For each application report:

- name
- purpose
- framework
- language
- entry point
- package name
- development command
- production build command
- port
- major dependencies
- current status

Determine specifically:

- POS application
- mobile application
- web application
- storefront
- admin application
- API/backend
- shared packages

---

# 3. TECHNOLOGY STACK

Determine the actual stack from package files and source code.

Report:

Frontend:
- framework
- version
- routing
- state management
- UI library
- CSS system
- component system
- form system

Backend:
- framework
- API architecture
- server actions
- REST/RPC/GraphQL/etc.

Database:
- PostgreSQL/Supabase/etc.
- ORM/query system
- migrations

Infrastructure:
- storage
- caching
- queues
- realtime
- authentication
- deployment

Payments:
- current providers
- implementation status

Do not guess.

Use evidence from the actual files.

---

# 4. DATABASE DISCOVERY

This is extremely important.

Inspect all database migrations/schema definitions.

Create a complete inventory of existing tables/entities.

For each table provide:

| Table | Purpose | Tenant Key | Important Relationships | Used By | Status |

Identify:

- organizations
- businesses
- users
- memberships
- roles
- permissions
- products
- product variants
- categories
- brands
- collections
- inventory
- locations
- stock movements
- customers
- carts
- cart items
- orders
- order items
- payments
- refunds
- discounts
- promotions
- media
- reviews
- addresses
- shipping
- delivery
- stores
- storefronts
- themes
- pages
- CMS
- navigation
- settings

If any of these do NOT exist, explicitly say:

`NOT FOUND`

Do not assume they exist.

---

# 5. MULTI-TENANCY

Determine exactly how tenant isolation currently works.

Inspect:

- organization_id
- merchant_id
- business_id
- RLS
- Supabase policies
- API authorization
- server-side authorization
- frontend guards

Answer:

1. What identifies a merchant?
2. How is data scoped to the merchant?
3. Are RLS policies enabled?
4. Which tables have RLS?
5. Are policies actually correct?
6. Are there any potential cross-tenant access risks?

Provide evidence with file paths.

---

# 6. AUTHENTICATION

Inspect authentication.

Determine:

- Supabase Auth?
- custom auth?
- OAuth?
- email/password?
- magic links?
- session handling?
- role handling?
- organization membership?
- admin access?
- staff access?

Map:

User
↓
Organization
↓
Role
↓
Permissions

Explain exactly how it currently works.

---

# 7. POS DISCOVERY

Map the existing POS completely.

Find:

- product management
- barcode scanning
- sales
- cart
- payments
- receipts
- inventory
- stock adjustments
- customers
- discounts
- returns
- refunds
- staff
- branches/locations
- reports
- settings

For each feature:

- route/page
- component
- service/API
- database tables
- status

Classify:

WORKING
PARTIAL
MOCK
UNUSED
BROKEN
UNKNOWN

---

# 8. PRODUCT SYSTEM

Inspect the product architecture in detail.

Answer:

- Where are products stored?
- Where are variants stored?
- How are prices stored?
- How are images stored?
- How are categories stored?
- How are SKUs stored?
- How is stock linked?
- Can a product be hidden?
- Can products be published?
- Is there already a slug?
- Is there SEO metadata?
- Are products multi-location?

Show the actual relationships.

---

# 9. INVENTORY SYSTEM

Map inventory.

Determine:

- inventory tables
- stock quantity
- reserved quantity
- available quantity
- stock movements
- warehouses
- branches
- locations
- transfers
- low-stock alerts
- inventory synchronization
- concurrency protection

Most importantly:

Can POS and online sales safely share the same inventory?

Explain why.

---

# 10. ORDER SYSTEM

Map the existing order system.

Identify:

- order table
- order items
- order statuses
- payment status
- fulfillment status
- order source
- customer
- address
- totals
- discounts
- delivery
- refunds

Determine whether the existing order system can support:

`ONLINE_STORE`

as an order source.

If not, explain the minimum required change.

---

# 11. CUSTOMER SYSTEM

Determine:

- customer table
- customer accounts
- guest customers
- addresses
- customer history
- POS customer linkage
- online customer linkage
- duplicate customer handling

Can one customer purchase both:

POS
+
Online Store

and have one unified history?

Explain.

---

# 12. EXISTING STOREFRONT

This is one of the most important parts.

Find every storefront-related route and component.

Map:

- homepage
- product listing
- category
- collection
- product page
- cart
- checkout
- search
- navigation
- footer
- customer account
- order tracking
- wishlist
- reviews

For each route provide:

Route
Component
Data source
API
Database
Current status

---

# 13. EXISTING STORE BUILDER / CMS

Search the entire codebase for:

- theme
- themes
- CMS
- page builder
- sections
- blocks
- layout
- templates
- editor
- builder
- drag and drop
- visual editor
- page configuration
- JSON schema
- design tokens

Determine whether MyPoz already has a theme engine.

If it does:

EXPLAIN IT.

If it does not:

Say:

`NO EXISTING THEME ENGINE FOUND`

Do not create one yet.

---

# 14. EXISTING THEMES

Find all existing themes.

For each theme report:

- name
- location
- screenshots/assets if available
- components
- configurable properties
- responsive behavior
- reusable sections

Determine whether themes are:

- hardcoded
- configuration-driven
- component-driven
- database-driven
- CMS-driven

---

# 15. DESIGN SYSTEM

Inspect:

- colors
- typography
- spacing
- buttons
- cards
- forms
- modals
- drawers
- tables
- navigation
- product cards

Identify existing shared UI packages/components.

Report what can be reused for Commerce Cloud.

---

# 16. MEDIA / STORAGE

Determine how images/files are stored.

Inspect:

- Supabase Storage
- S3
- local filesystem
- CDN
- image optimization

Determine:

- product images
- merchant logos
- storefront images
- user uploads

How can the future Store Builder reuse the existing media infrastructure?

---

# 17. PAYMENTS

Inspect every payment implementation.

Find:

- PayHere
- Stripe
- LankaPay
- bank transfer
- COD
- card
- QR
- payment webhooks
- payment status
- refund handling

For each provider report:

Implemented
Partial
Mock
Not implemented

Also identify where secrets are stored.

Do NOT print actual secret values.

Only report:

`CONFIGURED`

or

`NOT CONFIGURED`

---

# 18. DELIVERY / SHIPPING

Determine whether MyPoz already has:

- delivery
- shipping
- delivery zones
- pickup
- courier
- delivery fees
- addresses
- shipping status

Map the current implementation.

---

# 19. DISCOUNTS / PROMOTIONS

Determine what already exists for:

- discount codes
- percentage discounts
- fixed discounts
- product discounts
- category discounts
- minimum order
- free delivery
- promotions
- scheduled sales

Map existing implementation.

---

# 20. SEARCH

Determine:

- current search implementation
- database search
- full text
- pg_trgm
- external search
- autocomplete
- filtering
- sorting

Report what exists.

---

# 21. SEO

Inspect the existing storefront SEO.

Check:

- metadata
- title
- description
- Open Graph
- sitemap
- robots.txt
- canonical
- structured data
- product schema
- collection schema

Report current state.

---

# 22. LOCALIZATION

Determine whether MyPoz supports:

- English
- Sinhala
- Tamil

Inspect:

- i18n library
- translation files
- locale routing
- database translations
- currency formatting

Report exactly what exists.

---

# 23. MOBILE

Inspect mobile responsiveness.

Determine:

- mobile-first CSS
- responsive components
- mobile navigation
- mobile cart
- mobile checkout
- POS mobile app
- PWA if any

Do not change anything yet.

---

# 24. REALTIME / EVENTS

Search for:

- Supabase Realtime
- WebSockets
- event bus
- Redis
- queues
- background workers
- webhooks

Determine whether inventory/order updates already have realtime infrastructure.

---

# 25. EXISTING TESTS

Inspect:

- unit tests
- integration tests
- E2E tests
- Playwright
- Vitest
- Jest
- Cypress

Report:

- number of tests
- test commands
- current passing/failing state

Do not modify tests yet.

---

# 26. BUILD HEALTH

Run only safe read/verification commands.

Check:

- typecheck
- lint
- tests
- build

Record exact results.

If something fails:

do not fix it yet.

Document:

COMMAND
RESULT
ERROR
FILE
LIKELY CAUSE

---

# 27. ENVIRONMENT

Inspect environment templates and configuration.

Report variable NAMES only.

Never expose values.

Classify each as:

CONFIGURED
NOT CONFIGURED
UNKNOWN

Do not print:

API keys
tokens
passwords
private credentials
service-role keys

---

# 28. DUPLICATE / LEGACY CODE

Identify:

- duplicate apps
- duplicate POS implementations
- duplicate storefronts
- old components
- abandoned routes
- legacy APIs
- unused packages
- old Supabase migrations
- conflicting schemas

Do not delete anything.

Just report it.

---

# 29. COMMERCE CLOUD GAP ANALYSIS

Compare the actual existing MyPoz system against the Commerce Cloud requirements.

Create this matrix:

| Capability | Existing | Partial | Missing | Reuse | Change Required | New Build |
|---|---|---|---|---|---|---|

Include:

Store
Storefront
Themes
Theme Engine
Store Builder
Pages
Sections
Navigation
Products
Variants
Collections
Inventory
Cart
Checkout
Orders
Customers
Payments
COD
Delivery
Discounts
Promotions
SEO
Analytics
Domains
Localization
WhatsApp
Media Library
Notifications

---

# 30. RECOMMENDED ARCHITECTURE

Based ONLY on the evidence discovered, recommend:

1. What should remain unchanged.
2. What should be extended.
3. What should be refactored.
4. What should be replaced.
5. What needs to be newly built.
6. What should NOT be built because it already exists.

Do not recommend rewriting working systems without a concrete reason.

---

# 31. DATA MIGRATION REQUIREMENTS

Determine whether migrations are required.

For each proposed new entity:

- why it is needed
- whether an existing entity can be reused
- migration complexity
- backwards compatibility risk

Do not run migrations yet.

---

# 32. FINAL RECOMMENDATION

End the report with:

## WHAT WE ALREADY HAVE

List the strongest existing MyPoz capabilities.

## WHAT WE CAN REUSE

List reusable code/services/components.

## WHAT NEEDS CHANGING

List required modifications.

## WHAT IS MISSING

List genuinely missing functionality.

## WHAT SHOULD NOT BE TOUCHED

List stable POS functionality that should remain unchanged.

## MVP RECOMMENDATION

Define the smallest safe implementation that creates:

MyPoz POS
+
MyPoz Online Store

using the existing architecture.

---

# 33. REQUIRED OUTPUT FILES

Create documentation ONLY.

Do not modify application logic.

Create:

`docs/MYPOZ_SYSTEM_DISCOVERY.md`

`docs/MYPOZ_DATABASE_MAP.md`

`docs/MYPOZ_STOREFRONT_MAP.md`

`docs/MYPOZ_THEME_AUDIT.md`

`docs/MYPOZ_COMMERCE_GAP_ANALYSIS.md`

`docs/MYPOZ_ARCHITECTURE_RECOMMENDATION.md`

`docs/MYPOZ_PHASE_1_RECOMMENDATION.md`

---

# 34. FINAL RESPONSE FORMAT

When finished, respond with:

## 1. EXECUTIVE SUMMARY

What MyPoz actually contains today.

## 2. CURRENT ARCHITECTURE

Show the architecture diagram.

## 3. DATABASE

Show the major entities and relationships.

## 4. EXISTING STOREFRONT

Explain exactly what already exists.

## 5. EXISTING THEME SYSTEM

Explain exactly what exists.

## 6. POS

Explain exactly what exists and what is stable.

## 7. PAYMENTS

Explain what exists.

## 8. INVENTORY

Explain what exists.

## 9. ORDERS

Explain what exists.

## 10. GAP ANALYSIS

Show what is missing for Commerce Cloud.

## 11. REUSE PLAN

Show what we should reuse.

## 12. CHANGE PLAN

Show exactly what needs changing.

## 13. RISK AREAS

Identify architectural/security/data risks.

## 14. RECOMMENDED MVP

Give the recommended implementation sequence.

## 15. FILES TO MODIFY

List the exact files/directories that would eventually need modification.

DO NOT modify them during this discovery phase.

---

# ABSOLUTE RULE

This task is DISCOVERY ONLY.

Do not:

- implement Commerce Cloud
- create new database tables
- modify existing database tables
- rewrite storefront
- change POS
- change authentication
- change payment systems
- change inventory
- change orders
- delete files
- rename files
- install major dependencies

We first need to understand exactly what exists.

After the discovery report is complete, stop and wait for the next instruction.

We will use the generated reports to decide precisely what to build and what to leave untouched.
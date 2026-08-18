# MYPOZ COMMERCE CLOUD
## Full Production Build Specification

You are building **MyPoz Commerce Cloud**, a production-grade Shopify-style commerce platform tightly integrated with the existing MyPoz POS system.

The goal is NOT to create a superficial Shopify visual clone.

The goal is to create a complete **merchant commerce operating system** where a business can operate its physical POS and online store from the same underlying commerce data.

---

# 1. PRODUCT VISION

MyPoz Commerce Cloud allows a merchant to:

1. Create a business.
2. Manage products through MyPoz POS.
3. Automatically create an online storefront.
4. Select a professionally designed theme.
5. Customize the storefront without coding.
6. Publish the store instantly.
7. Accept online orders.
8. Manage inventory across physical and online channels.
9. Manage customers.
10. Manage discounts and promotions.
11. Manage delivery and pickup.
12. Manage payments.
13. Receive order notifications.
14. Track sales and analytics.
15. Connect a custom domain.
16. Manage the entire business from one platform.

Core proposition:

> RUN YOUR SHOP WITH MYPOZ. SELL ONLINE WITH MYPOZ.

The storefront must feel like a premium modern ecommerce platform while remaining significantly easier for a small business owner to operate.

---

# 2. IMPORTANT PRODUCT PRINCIPLE

Do not implement a pixel-perfect copy of Shopify.

Use modern ecommerce SaaS conventions as inspiration, but create an original MyPoz design system, information architecture, components, theme system, terminology, and visual identity.

The product should feel:

- premium
- modern
- fast
- simple
- trustworthy
- mobile-first
- merchant-friendly
- Sri Lanka-ready
- globally extensible

---

# 3. PLATFORM ARCHITECTURE

Use the existing MyPoz architecture wherever possible.

Do not create a second independent product database for storefront products.

The storefront must consume the canonical commerce data from MyPoz.

Architecture:

MyPoz Core
|
+-- Products
+-- Variants
+-- Categories
+-- Inventory
+-- Pricing
+-- Orders
+-- Customers
+-- Discounts
+-- Payments
+-- Staff
+-- Locations
|
+-- Commerce API
|
+-- Storefront Engine
+-- Theme Engine
+-- Store Builder
+-- Checkout
+-- Customer Storefront
+-- Analytics

The online store is a sales channel of MyPoz.

---

# 4. MULTI-TENANCY

Every merchant must belong to an organization/business.

All commerce data must be tenant isolated.

Every relevant entity must have organization ownership.

Never allow cross-tenant data access.

Implement authorization at:

- API layer
- database layer where applicable
- server actions
- storefront resolution
- admin UI
- background jobs

Support:

- owner
- admin
- manager
- staff
- marketing
- inventory
- accountant
- custom roles where supported

---

# 5. STORE MODEL

Create a Store entity associated with an organization.

Store fields should include:

- id
- organization_id
- name
- slug
- description
- logo
- favicon
- status
- published_at
- theme_id
- theme_config
- currency
- locale
- timezone
- contact_email
- contact_phone
- address
- social_links
- SEO configuration
- custom domain
- subdomain
- checkout configuration
- delivery configuration
- payment configuration

Store statuses:

- draft
- published
- suspended
- archived

---

# 6. STOREFRONT URL SYSTEM

Every merchant receives a MyPoz-hosted storefront.

Example:

shopname.mypoz.lk

Architecture must support custom domains later:

www.shopname.lk

Implement domain resolution abstraction so custom domains can be added without rewriting the storefront.

The storefront must resolve:

domain -> store -> organization -> theme -> commerce data

Never expose another merchant's store.

---

# 7. STORE BUILDER

Build a visual storefront editor.

The merchant should be able to customize the website without writing code.

Editor structure:

LEFT SIDEBAR
- Pages
- Sections
- Navigation
- Theme settings

CENTER
- Live storefront preview

RIGHT SIDEBAR
- Section settings
- Typography
- Colors
- Images
- Buttons
- Spacing
- Layout

TOP BAR
- Device preview
- Undo
- Redo
- Save
- Preview
- Publish

Device modes:

- desktop
- tablet
- mobile

The preview must use the actual storefront components rather than a fake screenshot.

---

# 8. PAGE SYSTEM

Support pages:

- Home
- Products
- Collections
- Product
- Cart
- Checkout
- Search
- About
- Contact
- FAQ
- Shipping
- Returns
- Privacy
- Terms
- Custom pages
- Blog
- Blog article

Merchant must be able to create custom pages.

---

# 9. SECTION SYSTEM

Build reusable storefront sections.

Initial section library:

## Hero

Properties:

- heading
- subheading
- image
- mobile image
- CTA
- secondary CTA
- alignment
- height
- overlay
- background
- text alignment

## Announcement Bar

- message
- link
- dismissible
- background
- active state

## Featured Collection

- collection
- title
- product count
- grid columns
- card style

## Product Grid

- collection
- number of products
- columns
- pagination
- load more
- filters

## Image + Text

- image
- heading
- description
- CTA
- image position

## Promotional Banner

- image
- heading
- CTA
- background
- overlay

## Testimonials

- customer
- quote
- rating
- image

## Brand Logos

- logos
- links

## Categories

- category cards
- image
- title

## Newsletter

- heading
- description
- email capture

## Rich Text

- formatted content

## Video

- video URL
- poster image

## Spacer

- responsive spacing

## Custom HTML

Only enable for trusted/admin users and sanitize all content.

---

# 10. THEME ENGINE

Create a schema-driven theme system.

A theme consists of:

- metadata
- design tokens
- typography
- colors
- spacing
- components
- page templates
- section registry
- default configuration

Example conceptual structure:

theme
|
+-- theme.json
+-- tokens
+-- templates
+-- sections
+-- components
+-- assets

Do NOT make merchant stores dependent on arbitrary executable theme code.

Theme configuration should be validated.

---

# 11. DESIGN TOKENS

Each theme should define:

- primary color
- secondary color
- accent color
- background
- surface
- text
- muted text
- border
- success
- warning
- error

Typography:

- heading font
- body font
- button font
- font sizes
- line heights
- weights

Layout:

- max width
- spacing scale
- border radius
- shadows
- card style
- button style

Responsive breakpoints must be consistent.

---

# 12. INITIAL THEMES

Create at least these original themes:

## Theme 1 — Minimal

Clean ecommerce layout.

Ideal for:

- electronics
- general retail
- lifestyle

## Theme 2 — Fashion

Large photography.

Ideal for:

- clothing
- shoes
- jewellery
- accessories

## Theme 3 — Market

Dense catalogue.

Ideal for:

- grocery
- supermarkets
- household goods

## Theme 4 — Food

Restaurant/food ordering style.

Ideal for:

- restaurants
- bakeries
- cafes
- cloud kitchens

## Theme 5 — Luxury

Editorial layout.

Ideal for:

- jewellery
- premium fashion
- cosmetics

## Theme 6 — Local Business

Simple conversion-focused storefront.

Ideal for Sri Lankan SMEs.

Each theme must have different visual hierarchy and component styling.

Do not simply recolor the same template.

---

# 13. PRODUCT CATALOGUE

Storefront product data comes from MyPoz.

Support:

- product name
- SKU
- description
- images
- price
- compare-at price
- sale price
- categories
- collections
- variants
- options
- stock
- availability
- brand
- tags
- weight
- dimensions
- SEO metadata

---

# 14. PRODUCT VARIANTS

Support:

- size
- color
- material
- storage
- custom options

Example:

T-shirt

Color:
- Black
- White
- Red

Size:
- S
- M
- L
- XL

Each variant must have:

- SKU
- price
- stock
- image
- barcode where available

---

# 15. PRODUCT PAGE

Build a premium product page.

Desktop:

IMAGE GALLERY | PRODUCT INFORMATION

Mobile:

IMAGE GALLERY
PRODUCT TITLE
PRICE
OPTIONS
STOCK
ADD TO CART
BUY NOW

Include:

- image zoom
- thumbnails
- variant selector
- stock status
- quantity
- add to cart
- buy now
- wishlist
- share
- description
- specifications
- shipping information
- returns information
- related products
- recently viewed
- reviews when implemented

---

# 16. COLLECTIONS

Support merchant-created collections.

Examples:

- New Arrivals
- Best Sellers
- Men's
- Women's
- Sale
- Under LKR 5,000

Collection pages must support:

- sorting
- filtering
- search
- pagination
- responsive product grids

Filters:

- price
- category
- brand
- availability
- attributes
- variants

---

# 17. SEARCH

Implement fast storefront search.

Support:

- product names
- SKUs
- tags
- categories
- brands

Add:

- autocomplete
- recent searches
- popular searches
- typo tolerance where practical

---

# 18. CART

Cart must support:

- add product
- remove product
- update quantity
- variants
- discounts
- estimated delivery
- subtotal
- delivery fee
- taxes
- total

Persist cart appropriately.

Support guest carts.

Merge guest cart into customer account after login.

---

# 19. CHECKOUT

Build a clean mobile-first checkout.

Steps:

1. Customer information
2. Delivery method
3. Address
4. Payment method
5. Order review
6. Confirmation

Support:

- guest checkout
- customer account checkout
- saved addresses
- phone number
- email
- delivery notes

Keep checkout minimal.

Do not force unnecessary account creation.

---

# 20. SRI LANKA PAYMENT SUPPORT

Architecture must support payment adapters.

Initial abstraction:

PaymentProvider

Implement adapters for supported providers when credentials/API access is available.

Potential providers:

- PayHere
- LankaPay
- bank transfer
- cash on delivery
- card
- QR

Never hardcode gateway credentials.

Use environment variables/secrets.

Payment status:

- pending
- authorized
- paid
- failed
- refunded
- partially_refunded
- cancelled

---

# 21. CASH ON DELIVERY

COD must be first-class.

Merchant configuration:

- enable/disable
- maximum order value
- minimum order value
- allowed delivery zones
- COD fee
- confirmation requirement

---

# 22. DELIVERY

Build delivery configuration.

Support:

- store pickup
- local delivery
- islandwide delivery
- delivery zones
- flat fee
- percentage fee
- weight-based fee
- free delivery threshold

Example:

Colombo:
LKR 350

Outside Colombo:
LKR 600

Free delivery:
Orders above LKR 10,000

---

# 23. POS SYNCHRONIZATION

This is one of the most important requirements.

The POS and online store must share canonical inventory.

When a POS sale occurs:

inventory decreases.

When an online sale occurs:

inventory decreases.

When inventory is manually adjusted:

storefront availability updates.

When a product is disabled:

it disappears from the storefront where appropriate.

Implement an event-driven synchronization architecture.

Example events:

product.created
product.updated
product.deleted

inventory.updated
inventory.low_stock
inventory.out_of_stock

order.created
order.paid
order.cancelled
order.refunded

customer.created
customer.updated

discount.created
discount.updated

---

# 24. ORDER MANAGEMENT

Online orders must appear inside MyPoz.

Order fields:

- order number
- customer
- items
- variants
- quantities
- subtotal
- discounts
- delivery
- taxes
- total
- payment status
- fulfillment status
- delivery address
- notes
- source channel

Order source:

- POS
- ONLINE_STORE
- WHATSAPP
- OTHER

---

# 25. FULFILLMENT

Statuses:

- pending
- confirmed
- processing
- ready
- packed
- shipped
- delivered
- cancelled
- returned

Build merchant workflow for moving orders through these states.

---

# 26. CUSTOMER ACCOUNTS

Customers should be able to:

- register
- login
- view orders
- reorder
- manage profile
- manage addresses
- manage wishlist
- track orders

Merchant can see customer history across POS and online store.

A customer purchasing in-store and online should remain one customer where identity matching is reliable.

---

# 27. DISCOUNTS

Support:

- percentage discount
- fixed amount
- free delivery
- product-specific
- collection-specific
- minimum order
- first order
- customer-specific
- expiry
- usage limits

Examples:

SAVE10

WELCOME500

FREEDELIVERY

---

# 28. PROMOTIONS

Support merchandising tools:

- sale pricing
- featured products
- bundles
- buy X get Y
- flash sale
- scheduled campaign

---

# 29. SEO

Every storefront must be SEO-ready.

Generate:

- title
- meta description
- canonical URL
- Open Graph
- Twitter cards
- product structured data
- organization structured data
- breadcrumb structured data
- sitemap
- robots.txt

Product and collection URLs must be clean.

---

# 30. PERFORMANCE

Storefront performance is a critical requirement.

Target:

- fast first load
- optimized images
- lazy loading
- responsive images
- CDN-ready assets
- server rendering where appropriate
- caching
- incremental regeneration/revalidation where appropriate

Do not ship huge JavaScript bundles to storefront visitors.

---

# 31. MOBILE FIRST

The majority of target customers may arrive through mobile devices.

Every storefront must work perfectly at:

320px
375px
390px
414px
768px
1024px
1440px+

Pay special attention to:

- navigation
- product grids
- product images
- checkout
- cart drawer
- sticky purchase buttons
- touch targets

---

# 32. STOREFRONT ADMIN

Add a Store section inside MyPoz.

Navigation:

Commerce
|
+-- Store Overview
+-- Orders
+-- Products
+-- Collections
+-- Customers
+-- Discounts
+-- Store Builder
+-- Themes
+-- Navigation
+-- Pages
+-- Blog
+-- Domains
+-- Payments
+-- Delivery
+-- Settings
+-- Analytics

---

# 33. STORE OVERVIEW DASHBOARD

Display:

- today's sales
- online orders
- total orders
- conversion rate
- visitors
- average order value
- top products
- low-stock products
- recent orders
- abandoned carts
- sales trend

Use clean dashboard cards.

Avoid unnecessary complexity.

---

# 34. ANALYTICS

Track:

- storefront visitors
- product views
- add to cart
- checkout started
- purchases
- conversion rate
- revenue
- average order value
- top products
- top collections
- traffic source

Funnel:

Visitors
↓
Product Views
↓
Add to Cart
↓
Checkout
↓
Purchase

---

# 35. ABANDONED CART

Track abandoned carts.

Merchant can view:

- customer
- cart items
- cart value
- abandoned timestamp

Architecture must allow future automated recovery through:

- email
- WhatsApp
- SMS

Do not implement unsafe spam behavior.

---

# 36. WHATSAPP INTEGRATION

Design the platform so WhatsApp can become a native commerce channel.

Product page:

"Order via WhatsApp"

Customer can send product inquiry/order request.

Merchant receives notifications for:

- new online order
- payment
- cancellation
- low stock

Architecture should allow future official WhatsApp Business API integration.

---

# 37. LOCALIZATION

Initial storefront languages:

English
Sinhala
Tamil

All customer-facing text must be translatable.

Do not hardcode interface strings.

Support:

- RTL-ready architecture
- locale-aware dates
- locale-aware numbers
- currency formatting

---

# 38. THEME CUSTOMIZATION

Merchant controls:

Brand:
- logo
- favicon
- primary color
- secondary color

Typography:
- heading font
- body font

Layout:
- container width
- spacing
- corner radius

Buttons:
- shape
- size
- style

Products:
- card style
- image ratio
- quick add
- badges

Navigation:
- header style
- sticky header
- mobile menu

Footer:
- columns
- links
- social media
- newsletter

---

# 39. DRAG AND DROP

Where practical, implement section reordering.

Merchant should be able to:

- add section
- remove section
- duplicate section
- reorder section
- hide section
- edit section

Do not make the editor unnecessarily complicated.

The merchant should be able to publish a store in minutes.

---

# 40. PREVIEW AND PUBLISH

Changes should remain draft until published.

States:

DRAFT
↓
PREVIEW
↓
PUBLISH

Publishing creates a consistent storefront configuration.

Avoid partially published configurations.

---

# 41. VERSION HISTORY

Design the theme configuration system so it can eventually support:

- revision history
- restore previous version
- autosave
- draft/published comparison

For MVP, implement basic draft/published state.

---

# 42. MEDIA LIBRARY

Create a merchant media library.

Support:

- image upload
- folders
- search
- delete
- reuse existing images

Optimize uploaded images.

Generate appropriate sizes.

---

# 43. NAVIGATION BUILDER

Merchant can configure:

Header navigation:

Home
Shop
Collections
About
Contact

Support:

- links
- pages
- collections
- products
- external URLs

Nested menus should be supported.

---

# 44. CUSTOM DOMAIN

Architecture must support:

mypoz subdomain
+
custom domain

Domain workflow:

1. Enter domain
2. Show DNS instructions
3. Verify DNS
4. Provision SSL
5. Mark domain active

Do not claim a domain is active until verification succeeds.

---

# 45. TRUST AND SECURITY

Implement:

- authentication
- authorization
- tenant isolation
- CSRF protection
- XSS protection
- input validation
- rate limiting
- secure cookies
- webhook verification
- payment signature verification
- audit logs

Never expose secret keys to storefront clients.

---

# 46. ACCESSIBILITY

Target WCAG-friendly implementation.

Ensure:

- keyboard navigation
- semantic HTML
- labels
- focus states
- sufficient contrast
- alt text
- screen-reader compatibility

---

# 47. ERROR STATES

Every important interface needs:

- loading state
- empty state
- error state
- retry state
- success state

Never leave blank screens.

Examples:

No products:

"Your store doesn't have any products yet."

No orders:

"No online orders yet."

Out of stock:

"Currently unavailable."

---

# 48. STORE BUILDER UX

The builder should feel similar in simplicity to modern website builders.

Layout:

-------------------------------------------------
| MyPoz | Preview | Desktop Tablet Mobile | Save |
-------------------------------------------------
|       |                                      |
| Pages |                                      |
|       |          LIVE STOREFRONT             |
| Home  |                                      |
| Shop  |                                      |
|       |                                      |
|Sections                                    |
| Hero  |                                      |
| Grid  |                                      |
| Text  |                                      |
| Image |                                      |
|       |                                      |
-------------------------------------------------

Clicking a section opens its settings.

Changes update the live preview.

---

# 49. STORE THEME DATA MODEL

Create normalized database structures where appropriate.

Suggested entities:

Store
StoreDomain
StoreTheme
StoreThemeVersion
StorePage
StorePageSection
StoreNavigation
StoreNavigationItem
StoreMedia
StoreSetting
StoreSEO

Do not store arbitrary unvalidated JSON as the only source of truth for everything.

Use JSON configuration where flexible theme settings are genuinely appropriate.

Validate theme schemas.

---

# 50. API DESIGN

Create clean API boundaries.

Examples:

GET /storefront/{store}
GET /storefront/{store}/products
GET /storefront/{store}/collections
GET /storefront/{store}/products/{slug}

POST /storefront/{store}/cart

POST /storefront/{store}/checkout

POST /storefront/{store}/orders

Admin:

GET /stores/{store}/analytics
PUT /stores/{store}/theme
POST /stores/{store}/publish
POST /stores/{store}/pages
POST /stores/{store}/media

Use consistent validation and error responses.

---

# 51. CACHING

Cache public storefront data aggressively where safe.

Cache:

- theme configuration
- published pages
- product catalogue
- collections
- navigation

Invalidate caches when:

- product changes
- inventory changes
- theme publishes
- collection changes

Do not serve stale inventory information during checkout.

Checkout must revalidate stock and price.

---

# 52. INVENTORY SAFETY

Never trust client-side product prices or inventory.

At checkout:

1. Fetch canonical product.
2. Validate variant.
3. Validate current price.
4. Validate stock.
5. Calculate discounts server-side.
6. Calculate delivery.
7. Calculate taxes.
8. Calculate final amount.
9. Create order.
10. Reserve/decrement inventory safely.

Prevent overselling with transactional inventory handling.

---

# 53. PRODUCT URLS

Use SEO-friendly URLs.

Example:

/products/nike-air-max

/collections/mens-shoes

/pages/about

/blog/how-to-choose-running-shoes

Do not expose database IDs unnecessarily.

---

# 54. DEFAULT STORE

Every newly created merchant should receive a ready-to-edit store.

Default content:

Hero:
"Welcome to your new online store"

Subheading:
"Start selling online with MyPoz."

CTA:
"Shop Now"

Featured products:
Automatically populated from merchant catalogue.

The merchant should not see a blank website.

---

# 55. DEMO STORE

Create a fully populated demo store for development.

Example business:

"Lanka Streetwear"

Products:

- Classic Black Tee
- Oversized White Tee
- Cargo Pants
- Denim Jacket
- Sneakers
- Cap

Collections:

- New Arrivals
- Men's
- Streetwear
- Sale

Use realistic placeholder content.

---

# 56. DESIGN SYSTEM

Create reusable MyPoz UI primitives.

Examples:

Button
Input
Select
Modal
Drawer
Tabs
Card
Badge
Toast
Dropdown
DataTable
EmptyState
Skeleton
Pagination
ProductCard
Price
Rating
ImageGallery
CartDrawer
CheckoutForm

Storefront components must be separate from admin components where appropriate.

---

# 57. PRODUCT CARD VARIANTS

Support theme-controlled product cards:

Classic
Minimal
Image-first
Compact
Luxury
Dense

Properties:

- image
- title
- price
- compare price
- badge
- rating
- quick add
- wishlist
- sale label

---

# 58. CHECKOUT UX

Do not copy unnecessary complexity from large ecommerce systems.

Checkout must prioritize:

- speed
- clarity
- trust
- mobile usability

Display:

Order summary
Delivery
Payment
Total

Make the primary action obvious.

---

# 59. TRUST COMPONENTS

Themes can include:

- secure checkout
- cash on delivery
- islandwide delivery
- easy returns
- authentic products
- customer support

These should be configurable sections rather than hardcoded claims.

---

# 60. SOCIAL COMMERCE

Architecture should support:

- WhatsApp
- Instagram
- Facebook
- TikTok

Merchant can add social links.

Future architecture can support social catalogue feeds.

---

# 61. EMAIL/SMS NOTIFICATIONS

Design notification abstraction.

Events:

order.created
order.confirmed
order.shipped
order.delivered
order.cancelled
payment.success
payment.failed

Channels:

email
SMS
WhatsApp

Provider-specific implementations must be isolated.

---

# 62. WEBHOOKS

Create webhook architecture for:

- payment providers
- delivery providers
- future external integrations

Verify signatures.

Make handlers idempotent.

Never process duplicate payment webhooks as separate payments.

---

# 63. TESTING

Implement tests for:

- tenant isolation
- authentication
- authorization
- product retrieval
- theme rendering
- theme configuration validation
- cart
- checkout
- price calculation
- discount calculation
- inventory reservation
- order creation
- payment callbacks
- webhook idempotency
- store publishing
- domain resolution

Include integration tests.

---

# 64. SECURITY TESTS

Test:

- cross-tenant access
- unauthorized admin access
- malicious theme configuration
- XSS
- CSRF
- forged webhooks
- manipulated prices
- manipulated inventory
- duplicate checkout
- duplicate payment webhook
- invalid discount codes

---

# 65. PERFORMANCE TESTING

Test:

- storefront load
- product catalogue load
- search
- collection pages
- checkout
- concurrent inventory updates

The storefront should remain fast with thousands of products.

---

# 66. ADMIN EXPERIENCE

The merchant should never need to understand:

- databases
- APIs
- deployments
- DNS complexity
- technical configuration

Technical configuration should be progressively disclosed.

The product should feel simple.

---

# 67. BILLING ARCHITECTURE

Prepare for subscription plans.

Example:

FREE
- POS
- basic store
- limited products

STARTER
- online store
- custom branding
- online payments
- analytics

GROWTH
- custom domain
- advanced analytics
- automation
- WhatsApp commerce

PRO
- multiple locations
- advanced permissions
- advanced analytics
- priority support

Do not hardcode pricing into core business logic.

Create subscription capability abstractions.

---

# 68. FUTURE APP MARKETPLACE

Design integrations so future apps can be added.

Potential integrations:

- WhatsApp
- accounting
- delivery
- email marketing
- CRM
- loyalty
- reviews
- shipping
- analytics
- marketplaces

Do not implement the entire app marketplace now.

Build clean extension points.

---

# 69. THEME MARKETPLACE

Future architecture should support:

Theme
- author
- version
- screenshots
- category
- price
- license
- compatibility
- rating

Merchant can install a theme.

Never allow untrusted theme code to execute with unrestricted server access.

---

# 70. SEO-FRIENDLY STOREFRONT RENDERING

Prefer server-rendered or statically optimized storefront pages where appropriate.

Search engines must be able to see:

- product titles
- prices
- descriptions
- images
- structured data

Do not make the entire storefront dependent on client-side rendering.

---

# 71. IMAGE OPTIMIZATION

Every product image should support:

- original
- thumbnail
- card
- medium
- large

Use responsive image loading.

Lazy-load below-the-fold images.

Prevent layout shifts by preserving image dimensions.

---

# 72. STORE PREVIEW

Merchant can preview unpublished changes.

Preview must not affect public visitors.

Preview URLs must be protected.

---

# 73. PUBLISHING MODEL

Published storefront should reference a known published configuration.

Draft changes must not leak into production.

Publishing should be atomic.

If publishing fails, previous published version remains active.

---

# 74. AUDIT LOG

Track important merchant actions:

- product changes
- theme changes
- store publish
- domain changes
- payment settings
- discount creation
- order status changes

Include:

- actor
- organization
- action
- resource
- timestamp
- metadata

---

# 75. OBSERVABILITY

Add structured logging.

Track:

- storefront errors
- checkout failures
- payment failures
- webhook failures
- inventory conflicts
- publishing failures

Do not log secrets or payment credentials.

---

# 76. IMPLEMENTATION ORDER

Build in this order.

PHASE 1
Core Store model
Tenant isolation
Storefront routing
Basic product catalogue

PHASE 2
Theme engine
Theme schema
Design tokens
First three themes

PHASE 3
Store builder
Pages
Sections
Preview
Publish

PHASE 4
Cart
Checkout
Orders

PHASE 5
Inventory synchronization
POS integration

PHASE 6
Payments
COD
Delivery

PHASE 7
Customers
Discounts
Promotions

PHASE 8
SEO
Analytics
Media library
Navigation

PHASE 9
Custom domains
Localization
WhatsApp architecture

PHASE 10
Theme marketplace
Subscriptions
Advanced integrations

---

# 77. MVP DEFINITION

The MVP is complete when a merchant can:

1. Log into MyPoz.
2. Create/activate a store.
3. Have existing POS products appear automatically.
4. Select a theme.
5. Customize homepage sections.
6. Change logo/colors.
7. Publish the store.
8. Open the store publicly.
9. Browse products.
10. Add products to cart.
11. Checkout.
12. Place an order.
13. See the order inside MyPoz.
14. Have inventory update correctly.
15. Receive the configured notification.
16. View basic store analytics.

---

# 78. QUALITY BAR

Do not build a prototype disguised as a finished product.

Every feature must include:

- proper loading states
- proper errors
- validation
- authorization
- mobile responsiveness
- accessibility
- tests
- empty states
- production-safe handling

Do not use fake APIs when the real MyPoz infrastructure already exists.

Do not duplicate product/inventory/order databases.

Do not hardcode merchant data.

Do not hardcode theme configuration.

Do not expose secrets.

Do not sacrifice security for speed.

---

# 79. FINAL UX TEST

A non-technical Sri Lankan SME owner should be able to do this:

SIGN UP
↓
CONNECT/USE MYPOZ
↓
PRODUCTS AUTOMATICALLY APPEAR
↓
CHOOSE THEME
↓
ADD LOGO
↓
CHANGE BRAND COLOR
↓
CLICK PUBLISH
↓
GET ONLINE STORE

Target:

**under 10 minutes**

The merchant should immediately understand:

> "MyPoz runs my shop AND gives me my online store."

---

# 80. FINAL PRODUCT PRINCIPLE

The most important architectural decision is:

**MyPoz POS and MyPoz Online Store are not two products.**

They are two interfaces over the same Commerce Engine.

Physical Store
+
Online Store
+
WhatsApp Commerce
+
Future Marketplaces

all consume the same:

Products
Inventory
Customers
Orders
Payments
Pricing
Promotions

This is the foundation for the MyPoz Commerce Cloud platform.

Build it as a production-grade SaaS platform, not as a Shopify-themed website.
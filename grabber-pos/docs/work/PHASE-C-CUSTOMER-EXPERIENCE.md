# Phase C — E-receipts + storefront referral

**Status:** IMPLEMENTED

## Delivered

| Item | Path |
|------|------|
| Storefront CTA on invoice PDF + WA | `storefront-cta.ts`, `invoice-pdf.ts` |
| Plan-aware storefront footer | `plan-branding.ts`, `StoreChrome` |
| Product share (copy / native / WA) | `ProductShareButtons.tsx`, `blocks.ts` |

## Verify

1. Business/Enterprise tenant: storefront footer has no "Powered by MyPoz".
2. Product page shows Share + Copy link.
3. Invoice PDF / WA caption includes storefront URL when `storeSlug` set.

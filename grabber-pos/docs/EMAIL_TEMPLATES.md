# MyPoz email templates

Branded transactional emails use **Resend** (`RESEND_API_KEY`) and shared layout in `src/lib/email/base.ts`:

- **Header** — shop name, tagline, optional logo, accent gradient
- **Body** — template-specific content (tables, CTAs, info boxes)
- **Footer** — support email, app link, privacy, “Powered by Grabber Mobility Solutions”

Forgot-password no longer uses Supabase’s default mail (rate-limited, generic). It sends via **`POST /api/auth/forgot-password`** → Resend + MyPoz template.

## Configure (Vercel → mypoz-and-store-ui)

| Variable | Example |
|----------|---------|
| `RESEND_API_KEY` | `re_…` |
| `RESEND_FROM_EMAIL` | `Anaz Store <noreply@mypoz.lk>` |
| `RESEND_REPLY_TO` | `support@mypoz.lk` |

Verify the sender domain in Resend before production sends.

## Template catalog (17)

| ID | Purpose |
|----|---------|
| `password-reset` | Forgot password / HQ reset link |
| `password-changed` | Security notice after password update |
| `email-verification` | Confirm storefront signup email |
| `magic-link` | Passwordless sign-in link |
| `registration` | Welcome new store customer |
| `order-confirmation` | Online order receipt |
| `order-shipped` | Dispatch + tracking |
| `refund-confirmation` | Refund processed |
| `digital-delivery` | Codes / vouchers after digital sale |
| `staff-invite` | Invite cashier/manager |
| `new-tenant-welcome` | HQ onboard welcome |
| `low-stock-alert` | Inventory threshold alert |
| `daily-summary` | Owner end-of-day digest |
| `licence-invoice` | Plan payment request |
| `licence-renewed` | Licence extended |
| `licence-expiry-warning` | Expiry reminder |
| `compliance-data-request` | GDPR export/deletion ack |

Source: `src/lib/email/catalog.ts` · renderers in `src/lib/email/templates/`.

## Preview (owner / GMS)

While signed in:

```text
GET /api/email/preview?template=password-reset
GET /api/email/preview                    → JSON catalog
```

Uses your tenant brand colours when available.

## Send from app code

```typescript
import { sendEmail, passwordResetEmail } from "@/lib/email";

const mail = passwordResetEmail({ … });
await sendEmail({ to, subject: mail.subject, html: mail.html, text: mail.text });
```

Operational sends from the POS UI: `POST /api/email/send` with `{ template, to, data }` (owner/manager).

## Password reset script (operator)

```bash
RESET_PASSWORD='…' node --env-file=.env.local scripts/reset-user-password.mjs owner@shop.com
```

Requires `SUPABASE_SERVICE_ROLE_KEY` in the env file.

## Supabase Auth dashboard (optional)

You can still paste HTML into Supabase **Authentication → Email Templates** for backup, but production should prefer Resend + the templates above to avoid rate limits and “Powered by Supabase” footers.

# DDoS and WAF (MyPoz)

Defense in depth for the production host (`mypoz-and-store-ui.vercel.app`).

## Layers

1. **DNS / edge** — Prefer Cloudflare (or similar) in front of Vercel for L3/L4
   volumetric filtering and bot challenge pages.
2. **Vercel** — Platform DDoS protection + Deployment Protection for previews.
3. **Application WAF** — `src/lib/server/waf.ts` + `src/proxy.ts` inspect requests
   before auth; blocks suspicious patterns early.
4. **Rate limit / IP ban** — `src/lib/server/rate-limit.ts` adaptive limits on API
   paths; temporary bans on repeat abuse.
5. **Auth gate** — Unauthenticated callers only reach public paths (login, store,
   WhatsApp webhook, payment webhooks, health).

## Operator notes

- `/api/health` may return Unauthorized behind Deployment Protection — check in a
  logged-in browser or with a bypass token.
- WhatsApp webhook must stay public (`/api/whatsapp/webhook`) but requires
  `WHATSAPP_APP_SECRET` HMAC in production.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

## Related

[PRODUCTION.md](PRODUCTION.md) · [DEPLOYMENT.md](DEPLOYMENT.md) · HQ playbook §8

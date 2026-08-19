# Cloudflare Setup for MyPoz

MyPoz uses a two-layer defence: **Cloudflare** at the network edge and the
**app WAF** (`src/proxy.ts`) as the inner filter.  
Do **not** remove either layer. Cloudflare absorbs volumetric floods.  
The app WAF catches exploit paths and scanner probes that slip through.

---

## 1. DNS — orange-cloud every hostname

In Cloudflare DNS, set each A/CNAME record to **Proxied** (orange cloud):

| Hostname | Points to | Proxy |
|---|---|---|
| `mypoz.lk` (or your root) | Vercel `cname.vercel-dns.com` | Proxied |
| `shoppingstation.lk` (or tenant CNAME) | same Vercel target | Proxied |
| `www.*` variants | same | Proxied |

Never expose the origin IP.  
Tenant custom domains that CNAME to your Vercel project inherit protection
automatically once you orange-cloud them.

---

## 2. Firewall — enable managed rules

In **Security → WAF → Managed rules**, turn on:

- **Cloudflare Managed Ruleset** (OWASP Core Rule Set + Cloudflare rules)
- **Cloudflare Free Managed Ruleset** (if on Free tier — blocks the noisiest scanners)

Leave sensitivity at **Medium** to start; raise if false-positives are low.

---

## 3. DDoS — enable the Cloudflare DDoS plan

Under **Security → DDoS**, enable **HTTP DDoS Attack Protection**.  
On the Free plan this protects L7. Pro/Business adds advanced thresholds.

You do **not** need a Spectrum plan for HTTPS — Cloudflare reverse-proxy
already handles L3/L4 HTTPS at the edge.

---

## 4. Bot Fight Mode

Under **Security → Bots**, enable **Bot Fight Mode** (Free) or
**Super Bot Fight Mode** (Pro/Business).  
This blocks credential-stuffing, scraping, and card-testing bots
before they hit Vercel.

---

## 5. Real IP forwarding

Cloudflare sends the real client IP in `CF-Connecting-IP` and in
`X-Forwarded-For`. The app already reads `X-Forwarded-For` via
`clientIpFromHeaders()` in `src/lib/server/rate-limit.ts`.

On Vercel, `X-Forwarded-For` is trusted from upstream proxies automatically.  
No code change needed.  
**Do not** add Cloudflare's IP ranges to a custom trust list — Vercel
already strips headers that would allow IP spoofing.

---

## 6. Under Attack mode

When a volumetric flood is detected:

1. In Cloudflare dashboard → **Security level** → set to **I'm Under Attack**.
2. This adds a JS challenge to every page load (5-second browser check).
3. Shoppers who are real browsers pass. Bots do not.
4. Revert to **High** or **Medium** after the attack subsides.

Do **not** point any DNS record straight at the Vercel origin IP while
Under Attack mode is off. The origin IP should never be public.

---

## 7. Environment variables (no secrets required)

No Cloudflare API key is needed for the app to run behind Cloudflare.  
If you use **Cloudflare Turnstile** (CAPTCHA) on the login page, add:

```
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<your-site-key>
TURNSTILE_SECRET_KEY=<your-secret-key>
```

These are optional. The app WAF rate-limiter is the fallback.

---

## Verification checklist

After DNS propagation (up to 24 h):

- [ ] `curl -I https://mypoz.lk/api/health` — `cf-ray` header present
- [ ] `curl -I https://mypoz.lk/.env` — returns **403** (not 404)
- [ ] `curl -A "sqlmap/1.0" https://mypoz.lk/` — returns **403** from WAF
- [ ] Cloudflare Security dashboard shows traffic

The app WAF (`/.env` → 403) is a second check independent of Cloudflare.
Both layers must block the probe before the checklist passes.

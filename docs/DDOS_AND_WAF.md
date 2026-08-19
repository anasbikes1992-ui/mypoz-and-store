# DDoS and WAF plan

MyPoz sits behind two filters. Application code cannot absorb a volumetric flood by itself.

## Layers

1. **Cloudflare (or equivalent) in front of the hostname**  
   Proxy orange-cloud DNS. Enable Bot Fight, WAF managed rules, and the vendor DDoS plan on the zone that serves POS, store, and HQ. Do not point shoppingstation.lk (or any tenant domain) straight at the origin IP.

2. **Vercel**  
   Keep deployment protection off for the public store, on for preview. Vercel already sheds many L3/L4 floods at the edge. Do not disable the platform firewall.

3. **Application WAF** (`src/lib/server/waf.ts`, run from `src/proxy.ts`)  
   Blocks exploit paths (`.env`, `wp-admin`, PHP shells, traversal, SQLi probes) and known scanner user-agents before auth. Returns 403.

4. **Adaptive rate limit** (`src/lib/server/rate-limit.ts`)  
   Per-IP sliding windows. Login is 8 attempts per minute. Repeated 429s become a **15-minute temporary IP ban** with `Retry-After`. Memory is **per Vercel isolate**, so this stops noisy clients and scanners, not a botnet.

## What to do in an attack

- Raise Cloudflare security level / enable Under Attack mode.
- Confirm the custom domain CNAME still targets Vercel, not origin.
- Check `/api/health` from a clean network. If health is up and shoppers are not, the flood is at the edge.
- Do not widen `PUBLIC_PATHS` in `proxy.ts` during an incident.

## Session replay vs DDoS

`/api/observability/events` is public (storefront rage clicks) but rate-limited and only stores `error` and `ux_failure`. It is not a traffic dump.

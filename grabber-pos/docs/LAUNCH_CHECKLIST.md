# Anaz soft-launch checklist

**Live product host only:** [mypoz-and-store-ui](https://mypoz-and-store-ui.vercel.app)  
Do not deploy launch traffic to `mypoz-and-store` (leave undeployed / paused; do not delete without an explicit OK).

Storefront: `/store/anaz-store`  
WhatsApp ops: [WHATSAPP.md](WHATSAPP.md) · HQ attach: `/hq/whatsapp`

---

## After merge / deploy

1. **Deploy to `mypoz-and-store-ui` only**  
   Confirm Production URL is `https://mypoz-and-store-ui.vercel.app`.  
   Local CLI: from `grabber-pos/`, `.vercel/project.json` must name `mypoz-and-store-ui` (see [DEPLOYMENT.md](DEPLOYMENT.md)).

2. **Checkout / delivery smoke (desktop)**  
   - Place a **COD courier** order on `/store/anaz-store`  
   - Confirm a **GPS** receipt number  
   - See the order on **Online orders** and the **Delivery** board  
   - Walk status: `new → preparing → out → delivered`  
   - **Settle** as “Mark delivered / COD collected” — stock must **not** double-decrement

3. **Mobile smoke**  
   Cart + checkout on phone width (`100dvh` / safe-area footer; details step not covered by Place order).

4. **WhatsApp secrets + attach + smoke** (go-live gate — see below)

5. **Catalogue**  
   Anaz catalogue is live at **1518** products (confirm on `/products`). Re-import only if counts drop.

6. **Soft launch Anaz**  
   Optional: run password rotate when service role decryptable (`scripts/rotate-chat-passwords.mjs` after `vercel env pull`).

7. **Release gate (automated)**  
   From `grabber-pos/`:

```bash
npm run ops:gate
# strict (fail on operator reminders): node scripts/release-gate-ops.mjs --strict
```

Expect health + WhatsApp smoke + catalog PASS. See [RELEASE_GATE.md](RELEASE_GATE.md).

Product topology (HQ + clients + DB): [PRODUCT_FINALIZE.md](PRODUCT_FINALIZE.md).

---

## WhatsApp paste steps (Anaz gate)

Do this on **`mypoz-and-store-ui`** only, then redeploy Production.

| Step | Action |
|------|--------|
| 1 | Meta **GRABBER** app → permanent / system-user token → Vercel env `WHATSAPP_TOKEN` on **`mypoz-and-store-ui`** (still missing on that project if only phone/secret/verify were set) |
| 2 | Confirm `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` match Meta (webhook verify token = env verify token) |
| 3 | Redeploy Production on `mypoz-and-store-ui` |
| 4 | Open `/hq/whatsapp` → select **Anaz Store** → paste **phone number id** → Save |
| 5 | Smoke (no Meta send required for status/webhook/catalog): |

```bash
# from grabber-pos/
node scripts/whatsapp-smoke.mjs
# or explicit host:
node scripts/whatsapp-smoke.mjs https://mypoz-and-store-ui.vercel.app
```

Expect `failed: 0`. Then send `hi` from an allowlisted test number and confirm the menu / inbox path (Development mode limits who can message).

Optional status-only pull (SET/MISSING, no secret values printed):

```bash
node scripts/vercel-env-status.mjs
```

Full Meta wiring and multi-tenant attach rules: [WHATSAPP.md](WHATSAPP.md).

---

## Out of scope this launch

- Full courier ledger / HQ multi-tenant order search (later)
- Deleting the unused `mypoz-and-store` Vercel project

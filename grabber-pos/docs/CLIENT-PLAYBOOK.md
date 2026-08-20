# MyPoz — Client Playbook

For shop **owners and staff** using MyPoz POS + online store.

App: [https://mypoz-and-store-ui.vercel.app/login](https://mypoz-and-store-ui.vercel.app/login)

Companions: [USER-GUIDE.md](USER-GUIDE.md) · [CUSTOMER-STOREFRONT.md](CUSTOMER-STOREFRONT.md)

---

## 1. Sign in

1. Open the login page.
2. Use the **email and password** your GMS partner gave you (or that you set).
3. You land on the **Home launcher** — sale modes and business modules for your plan.

Forgot password? Ask Grabber Mobility Solutions support — they can email a reset
link or issue a temporary password from HQ. Do **not** use `/hq` (that portal is
GMS-only).

---

## 2. First-day setup (owner)

Do these once after handover:

| Step | Where | Done when |
|------|--------|-----------|
| 1. Brand your shop | Settings / Website | Logo + business name show on receipts & store |
| 2. Add products | Products | SKUs, prices, barcodes |
| 3. Stock the branch | Inventory | Quantities on Main Branch |
| 4. Open the register | Register / Retail | Shift open |
| 5. Make a test sale | Retail | Receipt prints / PDF works |
| 6. Publish online catalog | Website / Products | Items marked online-visible |
| 7. Check public store | `/store/your-slug` | Shoppers see products |
| 8. (Optional) WhatsApp | WhatsApp module | Status green; test `hi` from your phone |

---

## 3. Daily POS routine

1. **Open register** — declare opening float.
2. Sell on **Retail** (or Wholesale / other unlocked modes).
3. Attach **customer** when you want loyalty / WhatsApp invoice.
4. Prefer **barcode scan** for speed; use search as fallback.
5. End of day: **X-report** check, then **close register** (Z).
6. Spot-check **Sales** history for voids / refunds.

More detail: [USER-GUIDE.md](USER-GUIDE.md).

---

## 4. Online store (same stock)

- Public URL shape: `/store/<your-slug>`
- Shoppers checkout → orders appear on **Click & collect / Delivery** boards
  and in **Commerce / Orders**.
- Bank transfer: customer uploads a slip; approve payment proof before fulfill.
- Keep `online_visible` + published status in sync so the catalog stays accurate.

Guide: [CUSTOMER-STOREFRONT.md](CUSTOMER-STOREFRONT.md).

---

## 5. WhatsApp selling (if enabled)

1. Open **WhatsApp** from the launcher.
2. Confirm connection status (token / phone number may be set by GMS).
3. Set **locale**, **location reply**, and **offers** text.
4. Customers message your business number → numbered menu (order / track / staff).
5. Inbox shows conversations; “Talk to staff” flags need a human reply
   (reply from your normal WhatsApp Business app for now).
6. From a completed POS sale you can **send the invoice on WhatsApp**.

If the bot is silent, contact GMS — usually Meta webhook or phone mapping.

---

## 6. Staff & permissions

- Owner invites cashiers via Permissions / staff tools (or ask GMS to provision).
- Manager PIN gates large discounts, voids, and idle unlock.
- Never share the owner password with cashiers.

---

## 7. Licence & upgrades

- Plan tiles show **🔒 Upgrade** when locked.
- Ask GMS to raise plan / extras — or use **Billing** if self-serve is enabled.
- An expired licence may block new sales until renewed; you can still sign in.

---

## 8. When something breaks

| Symptom | Try first | Escalate to GMS if |
|---------|-----------|--------------------|
| Can’t sign in | Check email / caps lock | Reset from HQ |
| Empty catalog | Products → Import / refresh | Org not attached |
| Sale blocked | Licence expiry on Settings | Renew licence |
| Store 404 | Confirm slug & published | Storefront row missing |
| WA no reply | WhatsApp status page | Webhook / phone attach |
| Wrong prices online | Product online fields | Cache / RPC issue |

Support contact: the channel GMS gave you at onboarding (email / WhatsApp).

---

## 9. Security basics

- Sign out on shared counters.
- Idle lock will ask for PIN — don’t disable it on busy floors.
- Don’t paste API keys or payment secrets into chat.

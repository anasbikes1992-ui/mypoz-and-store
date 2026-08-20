import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "What is MyPoz? — Complete Software Overview",
  description: "A plain-English guide to everything MyPoz does — from the POS counter to the online store, GMS fleet management, and beyond.",
};

export default function HumanizerPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12 prose prose-zinc dark:prose-invert">
      <h1>What is MyPoz?</h1>
      <p className="lead">
        MyPoz is a <strong>unified retail operating system</strong> for Sri Lankan businesses. One account. One catalogue. One stock. Sell at the counter and online at the same time — no double-entry, no split brain.
      </p>

      <hr />

      <h2>The one-sentence pitch</h2>
      <blockquote>
        "Your till and your website share the same stock. An online order is a real sale — not a spreadsheet."
      </blockquote>

      <hr />

      <h2>Who it is for</h2>
      <ul>
        <li><strong>Shop owners</strong> — retail, grocery, pharmacy, electronics, fashion, food &amp; beverage</li>
        <li><strong>GMS operators</strong> — companies that manage a fleet of merchants on one platform</li>
        <li><strong>Shoppers</strong> — customers who browse the online store, place COD or card orders, and track delivery</li>
      </ul>

      <hr />

      <h2>Core modules</h2>

      <h3>🛒 Point of Sale (POS)</h3>
      <p>Touch-first retail terminal. Scan barcodes, add products, apply discounts, split payments (cash + card), print receipts, and post sales — all in seconds. Works for Retail, Wholesale, Restaurant (table/KDS), Rooms (hotel), Hire Purchase, Layaway, Service jobs, and more.</p>

      <h3>🛍️ Online Store (Commerce)</h3>
      <p>Every product in the POS is also available in the online store — same stock, same prices, updated in real time. Shoppers browse at <code>yourdomain.com</code> or <code>mypoz-and-store-ui.vercel.app/store/your-slug</code>. Orders flow directly into the POS order book. COD, bank transfer, and card gateways (PayHere, WebXPay, OnePay, LankaPay) supported.</p>

      <h3>📦 Inventory</h3>
      <p>Add products with variants (size, colour, weight), barcodes, cost prices, expiry dates, and reorder points. Stock is deducted on every sale — POS or online. Low-stock and expiry alerts keep shelves healthy.</p>

      <h3>📊 Reports &amp; Dashboard</h3>
      <p>Live sales dashboard, daily/weekly/monthly revenue, top products, channel breakdown (POS vs online vs WhatsApp), stock value, and profit margin. Export to PDF or XLSX.</p>

      <h3>🚚 Delivery &amp; Fulfilment</h3>
      <p>Online orders are automatically routed to a Click &amp; Collect board or a Delivery board. Drivers can be assigned. Status updates (ready, dispatched, delivered) flow back to the shopper.</p>

      <h3>👥 Customers &amp; Loyalty</h3>
      <p>One customer record shared between the counter and the online store. Loyalty points, credit limits, and purchase history in one place. Storefront shoppers are automatically linked to POS customer records.</p>

      <h3>💳 Billing &amp; Licencing</h3>
      <p>Three plans: Starter (Rs 4,500/mo), Business (Rs 9,500/mo), Enterprise (Rs 18,500/mo). Pay by bank transfer or PayHere. Expired licences block new sales but keep all data readable. HQ confirms and extends the licence.</p>

      <h3>📧 Email (Resend)</h3>
      <p>Transactional emails for: order confirmation, shipping update, customer registration, password reset, staff invite, low-stock alert, daily summary, refund confirmation, GDPR data request, licence invoice, and licence renewal. Powered by Resend. Set <code>RESEND_API_KEY</code> in Vercel to activate.</p>

      <h3>🔐 Security</h3>
      <ul>
        <li><strong>Application WAF</strong> — blocks exploit paths (<code>/.env</code>, SQL injection, PHP shells, traversal) before auth</li>
        <li><strong>Adaptive rate limiting</strong> — per-IP sliding window; repeated failures trigger a 15-minute IP ban</li>
        <li><strong>Cloudflare</strong> — recommended in front of production for L3/L4 DDoS absorption and Bot Fight Mode</li>
        <li><strong>Fail-closed repository</strong> — if Supabase is configured, the app never silently falls back to local demo data</li>
        <li><strong>Supabase RLS</strong> — every row is scoped to the organisation; no cross-tenant data leakage</li>
      </ul>

      <h3>🤖 AI Assistant</h3>
      <p>Natural-language assistant (GPT-4 or local) that answers questions about sales, stock, and operations. "What were my top 5 products last week?" gives an instant answer without navigating to reports.</p>

      <h3>📱 WhatsApp</h3>
      <p>Send invoices, order updates, and catalog links via WhatsApp. Incoming orders from WhatsApp are converted to POS sales. Requires a Meta WhatsApp Business API token.</p>

      <h3>🏢 HQ Console</h3>
      <p>Multi-tenant management for GMS operators. Provision new merchant accounts, set plan and expiry, view all tenants, handle support tickets, and white-label the platform.</p>

      <hr />

      <h2>Technology stack</h2>
      <ul>
        <li><strong>Frontend</strong> — Next.js 15 (App Router), React, Tailwind CSS, Framer Motion</li>
        <li><strong>Backend</strong> — Next.js API routes (Edge-compatible), Supabase (Postgres + RLS + Auth)</li>
        <li><strong>Email</strong> — Resend transactional email API</li>
        <li><strong>Payments</strong> — PayHere, WebXPay, OnePay, LankaPay, Stripe (optional)</li>
        <li><strong>Hosting</strong> — Vercel (edge functions + static CDN), Cloudflare (DNS + WAF)</li>
        <li><strong>Database</strong> — PostgreSQL 17 via Supabase, RLS per organisation</li>
        <li><strong>Auth</strong> — Supabase Auth (email/password, magic link, SSO-ready)</li>
        <li><strong>Observability</strong> — Session replays, rage-click detection, error tracking, UX failure flags</li>
      </ul>

      <hr />

      <h2>Key links</h2>
      <ul>
        <li><a href="/pos">POS Terminal</a> — open the retail counter</li>
        <li><a href="/dashboard">Dashboard</a> — live sales and stock overview</li>
        <li><a href="/commerce/onboarding">Launch your store</a> — publish your online shop in under 10 minutes</li>
        <li><a href="/commerce/orders">Orders</a> — all online and COD orders</li>
        <li><a href="/billing">Billing</a> — plan, licence, and payment</li>
        <li><a href="/settings">Settings</a> — business profile, receipt, tax, printers, email</li>
        <li><a href="/help">Help</a> — how-to guides</li>
        <li><a href="/privacy-policy">Privacy Policy</a></li>
        <li><a href="/terms-of-service">Terms of Service</a></li>
        <li><a href="/data-deletion">Data Deletion Request</a></li>
      </ul>

      <hr />

      <h2>For GMS operators — provisioning a new tenant</h2>
      <ol>
        <li>Sign in to <a href="/hq">/hq</a> with your GMS admin credentials</li>
        <li>Create a new organisation and set the owner email</li>
        <li>Assign plan (Starter recommended for first-hour onboarding)</li>
        <li>Owner receives a welcome email with their login URL</li>
        <li>Owner completes the first-hour wizard: products → theme → COD → publish</li>
        <li>Invoice is sent on first billing cycle; PayHere or bank-slip accepted</li>
      </ol>

      <hr />

      <h2>Scorecard (current)</h2>
      <table>
        <thead><tr><th>Dimension</th><th>Score</th></tr></thead>
        <tbody>
          <tr><td>Idea / category fit</td><td>8 / 10</td></tr>
          <tr><td>Architecture discipline</td><td>8 / 10</td></tr>
          <tr><td>Code quality vs breadth</td><td>6.5 / 10</td></tr>
          <tr><td>Production hardening</td><td>7 / 10</td></tr>
          <tr><td>Ease for a new shop owner</td><td>7 / 10</td></tr>
          <tr><td>Ease for GMS fleet ops</td><td>7 / 10</td></tr>
          <tr><td>Sales readiness</td><td>6.5 / 10</td></tr>
        </tbody>
      </table>

      <hr />

      <p className="text-sm text-zinc-400">
        MyPoz is built and operated by GMS (Grabber Management Systems). For support: <a href="mailto:support@mypoz.lk">support@mypoz.lk</a>.
        <br />Last updated: August 2026.
      </p>
    </div>
  );
}

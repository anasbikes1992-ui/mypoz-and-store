"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  fadeUp,
  interactiveCard,
  staggerContainer,
  staggerItem,
} from "@/lib/motion";
import { ThemeToggle } from "@/components/shell/ThemeToggle";

const VERTICALS = [
  {
    mark: "R",
    title: "Retail & supermarket",
    body: "Barcode scanning, scale lines, cash drawer, and discount limits.",
    tint: "var(--tint-blue)",
  },
  {
    mark: "D",
    title: "Restaurant & cafe",
    body: "Floor plans, split bills, and ESC/POS kitchen order tickets.",
    tint: "var(--tint-coral)",
  },
  {
    mark: "S",
    title: "Service & repair",
    body: "Job sheets, status updates, parts and labour on one bill.",
    tint: "var(--tint-teal)",
  },
  {
    mark: "W",
    title: "Wholesale",
    body: "Tier pricing, credit balances, bulk qty, and purchase GRNs.",
    tint: "var(--tint-amber)",
  },
  {
    mark: "H",
    title: "Hotels & rooms",
    body: "Reservations, check-in/out, room service, and guest folios.",
    tint: "var(--tint-pink)",
  },
  {
    mark: "I",
    title: "Hire & rentals",
    body: "Installment schedules, deposits, and overdue alerts.",
    tint: "var(--tint-green)",
  },
] as const;

const STOREFRONT_POINTS = [
  "Real-time stock sync — web orders deduct POS inventory",
  "Google Shopping feed for ads and product discovery",
  "Meta & Google pixel hooks for retargeting",
  "Schema markup for richer search listings",
] as const;

export default function WelcomePage() {
  const [salesVolume, setSalesVolume] = useState(500000);
  const reduced = useReducedMotion();

  const timeSavedHours = Math.round((salesVolume / 100000) * 12);
  const stockLossPrevented = Math.round(salesVolume * 0.035);
  const extraWebSales = Math.round(salesVolume * 0.18);
  const hero = fadeUp(reduced, 0);
  const heroVisual = fadeUp(reduced, 0.08);

  return (
    <div className="theme-marketing min-h-screen text-text-body selection:bg-accent/25 selection:text-text-strong">
      <header className="sticky top-0 z-50 border-b border-line bg-surface-1/80 px-5 py-3.5 backdrop-blur-xl sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/welcome" className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-accent text-sm font-bold text-accent-ink shadow-[0_2px_10px_-2px_color-mix(in_oklch,var(--accent)_45%,transparent)]"
            >
              G
            </span>
            <span className="truncate text-lg font-semibold tracking-tight text-text-strong">
              MyPoz Commerce Cloud
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-text-dim md:flex">
            <a href="#features" className="transition hover:text-accent">
              Verticals
            </a>
            <a href="#storefront" className="transition hover:text-accent">
              Storefront
            </a>
            <a href="#calculator" className="transition hover:text-accent">
              ROI
            </a>
            <a href="#pricing" className="transition hover:text-accent">
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle compact />
            <Link
              href="/login"
              className="inline-flex rounded-2xl bg-accent px-4 py-2 text-sm font-semibold text-accent-ink shadow-[0_4px_14px_-4px_color-mix(in_oklch,var(--accent)_45%,transparent)] transition hover:bg-accent-strong"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(900px_420px_at_70%_15%,var(--glow),transparent_55%),radial-gradient(600px_320px_at_10%_80%,var(--glow-warm),transparent_50%)]" />
          <div className="fz-grid absolute inset-0 opacity-70" />
          <div className="fz-float absolute -left-16 top-4 h-72 w-72 rounded-full bg-[var(--glow)] blur-3xl" />
          <div className="fz-float absolute right-0 top-24 h-64 w-64 rounded-full bg-[var(--glow-cool)] blur-3xl" style={{ animationDelay: "1.4s" }} />
        </div>
        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14 lg:px-12 lg:pb-20 lg:pt-20">
          <motion.div {...hero} className="space-y-6">
            <span className="fz-hud-label inline-flex items-center gap-2 rounded-full border border-line bg-surface-1/70 px-3 py-1">
              <span className="fz-live inline-block h-1.5 w-1.5 rounded-full bg-accent" />
              Operate OS · Counters · Kitchens · Storefront
            </span>
            <h1 className="text-hero-gradient max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-[3.4rem] lg:leading-[1.08]">
              MyPoz Commerce Cloud
            </h1>
            <p className="text-sm font-semibold tracking-wide text-[oklch(78%_0.15_245)]">
              Grabber Mobility Solutions
            </p>
            <p className="max-w-md text-base leading-relaxed text-text-body sm:text-lg">
              One operate-mode OS for counters, kitchens, and back office —
              terminals, inventory, and a synced web storefront.
            </p>
            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-accent px-7 text-sm font-semibold text-accent-ink shadow-[0_6px_20px_-4px_color-mix(in_oklch,var(--accent)_55%,transparent)] transition hover:bg-accent-strong hover:shadow-[0_8px_24px_-4px_color-mix(in_oklch,var(--accent)_65%,transparent)] active:scale-[0.98]"
              >
                Open dashboard
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-line bg-surface-2/60 px-7 text-sm font-semibold text-text-strong transition hover:border-[var(--tint-teal)] hover:text-[var(--tint-teal)] active:scale-[0.98]"
              >
                Sign in to your store
              </Link>
            </div>
          </motion.div>

          <motion.div
            {...heroVisual}
            className="panel-glass relative min-h-[16rem] overflow-hidden rounded-3xl border border-line lg:min-h-[22rem]"
            aria-hidden
          >
            <div className="absolute inset-0 bg-[linear-gradient(145deg,oklch(96%_0.02_250)_0%,transparent_45%,oklch(95%_0.04_35_/_0.45)_100%)]" />
            <div
              aria-hidden
              className="fz-scan pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-[color-mix(in_oklch,var(--accent)_22%,transparent)] to-transparent"
            />
            <div className="relative flex h-full flex-col p-5 sm:p-6">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <span className="text-sm font-semibold text-text-strong">
                  Retail terminal
                </span>
                <span className="flex items-center gap-1.5 font-mono text-xs text-accent">
                  <span className="fz-live inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                  Live
                </span>
              </div>
              <div className="mt-4 grid flex-1 grid-cols-3 gap-2">
                {["Milk 1L", "Bread", "Soap", "Rice 5kg", "Oil", "Tea"].map(
                  (name, i) => {
                    const tints = [
                      "var(--tint-blue)",
                      "var(--tint-teal)",
                      "var(--tint-coral)",
                      "var(--tint-amber)",
                      "var(--tint-pink)",
                      "var(--tint-green)",
                    ];
                    return (
                      <div
                        key={name}
                        className="rounded-2xl border border-line bg-surface-1-solid/90 p-2.5"
                      >
                        <p className="truncate text-[11px] text-text-body">
                          {name}
                        </p>
                        <p
                          className="mt-1 font-mono text-xs font-medium"
                          style={{ color: tints[i] }}
                        >
                          LKR {(120 + name.length * 17).toFixed(0)}
                        </p>
                      </div>
                    );
                  },
                )}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-line bg-surface-2 px-4 py-3">
                <span className="text-sm text-text-dim">Bill total</span>
                <span className="font-mono text-lg font-semibold text-accent">
                  LKR 2,840.00
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section
        id="features"
        className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:px-12"
      >
        <motion.div
          {...fadeUp(reduced, 0)}
          viewport={{ once: true, margin: "-40px" }}
          className="max-w-xl space-y-2"
        >
          <h2 className="text-2xl font-semibold tracking-tight text-text-strong sm:text-3xl">
            Built for how you sell
          </h2>
          <p className="text-sm text-text-dim">
            Switch vertical modes without changing your back office or inventory
            ledger.
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer(reduced)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-20px" }}
          className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {VERTICALS.map((v) => (
            <motion.div
              key={v.title}
              variants={staggerItem(reduced)}
              {...interactiveCard(reduced)}
              className="panel-glass cursor-default rounded-3xl border border-line p-5 will-change-transform hover:border-[color-mix(in_oklch,var(--accent)_45%,var(--line))] hover:shadow-[0_16px_36px_-14px_color-mix(in_oklch,var(--accent)_35%,transparent)]"
            >
              <span
                aria-hidden
                className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold transition-transform group-hover:scale-105"
                style={{
                  background: `color-mix(in oklch, ${v.tint} 22%, transparent)`,
                  color: v.tint,
                  boxShadow: `0 0 0 1px color-mix(in oklch, ${v.tint} 28%, transparent)`,
                }}
              >
                {v.mark}
              </span>
              <h3 className="mt-4 font-semibold tracking-tight text-text-strong">
                {v.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-text-body">
                {v.body}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section
        id="storefront"
        className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-12"
      >
        <div className="panel-glass grid grid-cols-1 items-center gap-10 rounded-3xl border border-line p-6 sm:p-8 lg:grid-cols-2 lg:gap-12 lg:p-10">
          <div className="space-y-5">
            <h2 className="text-2xl font-semibold tracking-tight text-text-strong sm:text-3xl">
              A storefront with every account
            </h2>
            <p className="text-sm leading-relaxed text-text-dim">
              Each tenant gets a public e-commerce site wired to the same catalog
              and stock — no separate Shopify stack required.
            </p>
            <ul className="space-y-3 text-sm text-text-body">
              {STOREFRONT_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2.5">
                  <span
                    aria-hidden
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                  />
                  {point}
                </li>
              ))}
            </ul>
            <Link
              href="/login"
              className="inline-flex h-11 items-center rounded-2xl bg-accent px-5 text-sm font-semibold text-accent-ink transition hover:bg-accent-strong"
            >
              Open your workspace
            </Link>
          </div>

          <div className="rounded-3xl border border-line bg-surface-0 p-5">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span className="text-sm font-semibold text-text-strong">
                Your public store
              </span>
              <span className="font-mono text-[11px] text-accent">Same stock as POS</span>
            </div>
            <p className="mt-3 text-xs text-text-dim">
              Catalogue, prices, and delivery come from the live tenant — not a demo dump.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-line bg-surface-1-solid p-3">
                <p className="text-xs text-text-body">Featured product</p>
                <p className="mt-1 font-mono text-sm font-medium text-accent">Live price</p>
              </div>
              <div className="rounded-2xl border border-line bg-surface-1-solid p-3">
                <p className="text-xs text-text-body">In-stock SKU</p>
                <p
                  className="mt-1 font-mono text-sm font-medium"
                  style={{ color: "var(--tint-coral)" }}
                >
                  Deducts at checkout
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="calculator"
        className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:px-12"
      >
        <div className="max-w-xl space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-text-strong sm:text-3xl">
            Estimate monthly savings
          </h2>
          <p className="text-sm text-text-dim">
            Rough ROI from checkout speed, inventory control, and web orders.
          </p>
        </div>

        <div className="panel-glass mt-8 rounded-3xl border border-line p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium text-text-body">
              Estimated monthly sales
            </span>
            <span className="font-mono font-semibold text-accent">
              LKR {salesVolume.toLocaleString("en-LK")}
            </span>
          </div>
          <input
            type="range"
            min={100000}
            max={5000000}
            step={50000}
            value={salesVolume}
            onChange={(e) => setSalesVolume(Number(e.target.value))}
            aria-label="Estimated monthly sales volume"
            className="mt-4 w-full accent-[var(--accent)]"
          />

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-line bg-surface-2 p-5 text-center">
              <p className="text-xs text-text-dim">Time saved</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-text-strong">
                {timeSavedHours}h
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-surface-2 p-5 text-center">
              <p className="text-xs text-text-dim">Stock loss prevented</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-accent">
                LKR {stockLossPrevented.toLocaleString("en-LK")}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-surface-2 p-5 text-center">
              <p className="text-xs text-text-dim">Extra web revenue</p>
              <p
                className="mt-1 font-mono text-2xl font-semibold"
                style={{ color: "var(--tint-teal)" }}
              >
                LKR {extraWebSales.toLocaleString("en-LK")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="pricing"
        className="mx-auto max-w-6xl px-5 py-8 pb-20 sm:px-8 lg:px-12"
      >
        <div className="max-w-xl space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-text-strong sm:text-3xl">
            Simple plans
          </h2>
          <p className="text-sm text-text-dim">
            No setup fees. Upgrade or cancel when you need to.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          <PricingCard
            name="Starter"
            price="4,900"
            blurb="Single-terminal retail shops."
            features={[
              "Single branch POS",
              "Public e-commerce site",
              "Up to 1,000 products",
              "Cash & card billing",
            ]}
          />
          <PricingCard
            name="Growth"
            price="9,900"
            blurb="Multi-branch stores and dining."
            featured
            features={[
              "Multi-branch terminals",
              "Unlimited catalog",
              "AI marketing suite",
              "KOT & repair job cards",
              "Ads pixel matrix",
            ]}
            cta="Start 14-day trial"
          />
          <PricingCard
            name="Enterprise"
            price="24,900"
            blurb="Custom domain and dedicated ops."
            features={[
              "Everything in Growth",
              "Custom domain mapping",
              "White-label reseller",
              "Dedicated DB branch",
              "Priority support SLA",
            ]}
            cta="Contact sales"
          />
        </div>
      </section>

      <footer className="border-t border-line px-5 py-10 text-center text-xs text-text-dim sm:px-8 lg:px-12">
        <p className="text-sm font-semibold text-text-strong">
          MyPoz Commerce Cloud
        </p>
        <p className="mt-2">
          © {new Date().getFullYear()} Grabber Mobility Solutions (Pvt) Ltd. All
          rights reserved.
        </p>
        <p className="mt-3 space-x-3">
          <Link href="/privacy-policy" className="hover:text-accent">
            Privacy
          </Link>
          <Link href="/terms-of-service" className="hover:text-accent">
            Terms
          </Link>
          <Link href="/data-deletion" className="hover:text-accent">
            Data deletion
          </Link>
        </p>
      </footer>
    </div>
  );
}

function PricingCard({
  name,
  price,
  blurb,
  features,
  featured,
  cta = "Get started",
}: {
  name: string;
  price: string;
  blurb: string;
  features: string[];
  featured?: boolean;
  cta?: string;
}) {
  return (
    <div
      className={`panel-glass flex flex-col rounded-3xl border p-6 ${
        featured
          ? "border-accent shadow-[0_0_0_1px_color-mix(in_oklch,var(--accent)_35%,transparent)]"
          : "border-line"
      }`}
    >
      <div className="mb-3 min-h-4">
        {featured ? (
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
            Most popular
          </p>
        ) : null}
      </div>
      <h3 className="text-lg font-semibold text-text-strong">{name}</h3>
      <p className="mt-1 text-sm text-text-dim">{blurb}</p>
      <p className="mt-4 font-mono text-3xl font-semibold text-text-strong">
        LKR {price}
        <span className="text-sm font-normal text-text-dim"> / mo</span>
      </p>
      <ul className="mt-5 flex-1 space-y-2 border-t border-line pt-5 text-sm text-text-body">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span aria-hidden className="text-accent">
              ✓
            </span>
            {f}
          </li>
        ))}
      </ul>
      <Link
        href={cta === "Contact sales" ? "mailto:sales@grabber.lk?subject=Enterprise%20Plan%20Inquiry" : "/login"}
        className={`mt-6 inline-flex h-11 items-center justify-center rounded-2xl text-sm font-semibold transition ${
          featured
            ? "bg-accent text-accent-ink hover:bg-accent-strong"
            : "border border-line text-text-body hover:border-accent hover:text-accent"
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}

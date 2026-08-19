"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { fadeUp, springSoft } from "@/lib/motion";

const FEATURES = [
  {
    title: "POS + online store",
    body: "One catalogue. Live stock at the counter and on the web.",
    tint: "var(--tint-blue)",
  },
  {
    title: "Server-authoritative totals",
    body: "Prices and stock checked before every sale",
    tint: "var(--tint-teal)",
  },
  {
    title: "Reseller-ready licensing",
    body: "Plans, branding, and expiry enforced on the server",
    tint: "var(--tint-coral)",
  },
];

function safeNextPath(): string {
  if (typeof window === "undefined") return "/";
  const raw = new URLSearchParams(window.location.search).get("next");
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const reduced = useReducedMotion();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (isSupabaseEnabled) {
        const supabase = createClient();
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: username,
          password,
        });
        if (authError) {
          setError(authError.message);
          return;
        }
      } else {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const json = await res.json();
        if (!json.success) {
          setError(json.error ?? "Login failed");
          return;
        }
      }
      router.push(safeNextPath());
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  const brandMotion = fadeUp(reduced, 0);
  const formMotion = fadeUp(reduced, 0.06);

  return (
    <main className="theme-marketing relative flex min-h-screen items-stretch">
      <a href="#login-form" className="skip-link">
        Skip to main content
      </a>
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      <section className="relative hidden flex-1 flex-col justify-center overflow-hidden px-12 xl:px-16 lg:flex">
        {!reduced && (
          <>
            <motion.div
              aria-hidden
              className="absolute -top-40 -left-40 h-130 w-130 rounded-full bg-accent/15 blur-3xl"
              animate={{ scale: [1, 1.12, 1], opacity: [0.45, 0.85, 0.45] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              aria-hidden
              className="absolute -bottom-32 right-0 h-96 w-96 rounded-full blur-3xl"
              style={{ background: "color-mix(in oklch, var(--tint-coral) 18%, transparent)" }}
              animate={{ scale: [1.05, 1, 1.05], opacity: [0.35, 0.7, 0.35] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        )}
        <motion.div {...brandMotion}>
          <div className="mb-8 flex items-center gap-3">
            <span
              aria-hidden
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-base font-bold text-accent-ink shadow-[0_4px_14px_-4px_color-mix(in_oklch,var(--accent)_45%,transparent)]"
            >
              G
            </span>
            <p className="text-sm font-semibold tracking-wide text-accent">
              MyPoz Commerce Cloud
            </p>
          </div>
          <h1 className="text-hero-gradient max-w-lg text-5xl font-semibold tracking-tight xl:text-6xl">
            Run your shop. Sell online.
          </h1>
        </motion.div>
        <motion.p
          {...fadeUp(reduced, 0.08)}
          className="mt-4 max-w-md text-base leading-relaxed text-text-body"
        >
          One platform for the counter and the online store — same products, stock, and orders.
        </motion.p>
        <ul className="mt-12 space-y-5">
          {FEATURES.map((f, i) => (
            <motion.li
              key={f.title}
              initial={reduced ? false : { opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={
                reduced ? { duration: 0 } : { ...springSoft, delay: 0.15 + i * 0.08 }
              }
              className="flex items-start gap-3"
            >
              <span
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                style={{ background: f.tint }}
              />
              <div>
                <p className="font-medium text-text-strong">{f.title}</p>
                <p className="text-sm text-text-body">{f.body}</p>
              </div>
            </motion.li>
          ))}
        </ul>
        <p className="mt-16 text-xs text-text-body">
          Looking for product details?{" "}
          <Link
            href="/welcome"
            className="font-medium text-tint-teal transition hover:text-accent hover:underline"
          >
            View the overview
          </Link>
        </p>
      </section>

      <section className="flex flex-1 items-center justify-center px-5 py-10 sm:px-6">
        <motion.form
          id="login-form"
          onSubmit={handleSubmit}
          {...formMotion}
          className="panel-glass w-full max-w-md rounded-3xl border border-line p-6 sm:p-8"
        >
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <span
              aria-hidden
              className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent text-sm font-bold text-accent-ink"
            >
              G
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight text-text-strong">
                MyPoz
              </p>
              <p className="text-xs text-text-dim">Sign in to continue</p>
            </div>
          </div>

          <h2 className="hidden text-2xl font-semibold tracking-tight text-text-strong lg:block">
            Sign in
          </h2>
          <p className="mt-1 hidden text-sm text-text-dim lg:block">
            Access your terminal and back office
          </p>

          <label
            className="mt-6 block text-sm font-medium text-text-body lg:mt-8"
            htmlFor="login-username"
          >
            {isSupabaseEnabled ? "Email" : "Email / username"}
            <input
              id="login-username"
              type={isSupabaseEnabled ? "email" : "text"}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              className="mt-2 w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 text-text-strong outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </label>
          <label
            className="mt-5 block text-sm font-medium text-text-body"
            htmlFor="login-password"
          >
            Password
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="mt-2 w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 text-text-strong outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </label>

          <div className="mt-2 text-right">
            <a
              href="mailto:support@grabber.lk?subject=Password%20Reset%20/%20Account%20Help"
              className="text-xs text-text-dim hover:text-accent hover:underline transition"
            >
              Forgot password or need help?
            </a>
          </div>

          {error && (
            <motion.p
              initial={reduced ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </motion.p>
          )}

          <Button type="submit" disabled={pending} size="lg" className="mt-8 w-full">
            {pending ? "Signing in…" : "Sign in"}
          </Button>
          <p className="mt-6 text-center text-xs text-text-dim">
            {isSupabaseEnabled
              ? "Grabber Mobility Solutions (Pvt) Ltd"
              : process.env.NODE_ENV === "development"
                ? "Local demo — use POS_USER / POS_PASSWORD from .env"
                : "Sign in with your provisioned account"}
          </p>
          <p className="mt-3 text-center text-xs text-text-dim lg:hidden">
            <Link href="/welcome" className="text-accent hover:underline">
              Product overview
            </Link>
          </p>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center text-[11px]">
            <div className="rounded-xl border border-line bg-surface-2/70 px-2 py-2 text-text-dim">
              <p className="font-semibold text-text-strong">99.9%</p>
              Uptime
            </div>
            <div className="rounded-xl border border-line bg-surface-2/70 px-2 py-2 text-text-dim">
              <p className="font-semibold text-text-strong">RLS</p>
              Secured data
            </div>
            <div className="rounded-xl border border-line bg-surface-2/70 px-2 py-2 text-text-dim">
              <p className="font-semibold text-text-strong">Cloud</p>
              Daily backups
            </div>
          </div>
        </motion.form>
      </section>
    </main>
  );
}

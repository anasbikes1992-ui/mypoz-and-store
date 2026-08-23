"use client";

import { useState } from "react";
import Link from "next/link";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/shell/ThemeToggle";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (!isSupabaseEnabled) {
        setError(
          "Password reset is available on cloud accounts. Email support@mypoz.lk for help.",
        );
        return;
      }
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
      };
      if (!res.ok || !json.success) {
        setError(json.error ?? "Could not send reset email");
        return;
      }
      setSent(true);
    } catch {
      setError("Could not reach the server. Try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="theme-marketing relative flex min-h-screen items-center justify-center px-5 py-10">
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      <form
        onSubmit={handleSubmit}
        className="panel-glass w-full max-w-md rounded-3xl border border-line p-6 sm:p-8"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-text-strong">
          Reset password
        </h1>
        <p className="mt-2 text-sm text-text-dim">
          Enter the email on your store account. We&apos;ll send a secure link to
          choose a new password.
        </p>

        {sent ? (
          <div
            className="mt-6 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-text-strong"
            role="status"
          >
            If an account exists for that email, a reset link is on its way. Check
            your inbox and spam folder.
          </div>
        ) : (
          <>
            <label
              className="mt-6 block text-sm font-medium text-text-body"
              htmlFor="forgot-email"
            >
              Email
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 text-text-strong outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>

            {error ? (
              <p
                className="mt-4 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={pending} size="lg" className="mt-6 w-full">
              {pending ? "Sending…" : "Send reset link"}
            </Button>
          </>
        )}

        <p className="mt-6 text-center text-sm text-text-dim">
          <Link href="/login" className="font-medium text-accent hover:underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </main>
  );
}

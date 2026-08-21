"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { PasswordField } from "@/components/ui/PasswordField";
import { ThemeToggle } from "@/components/shell/ThemeToggle";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isSupabaseEnabled) {
      setError("Password update requires a cloud account.");
      return;
    }
    const supabase = createClient();
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (!data.session) {
        setError(
          "This reset link is invalid or expired. Request a new one from the sign-in page.",
        );
        return;
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    try {
      const { error: updateError } = await createClient().auth.updateUser({
        password,
      });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setDone(true);
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1200);
    } catch {
      setError("Could not update password. Try again.");
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
          Choose a new password
        </h1>
        <p className="mt-2 text-sm text-text-dim">
          You&apos;re signed in via the reset link. Set a password you&apos;ll
          remember.
        </p>

        {done ? (
          <p
            className="mt-6 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-text-strong"
            role="status"
          >
            Password updated. Taking you to your store…
          </p>
        ) : (
          <>
            <PasswordField
              className="mt-6"
              label="New password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!ready || pending}
              hint="At least 8 characters"
            />
            <PasswordField
              className="mt-5"
              label="Confirm password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={!ready || pending}
            />

            {error ? (
              <p
                className="mt-4 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={!ready || pending}
              size="lg"
              className="mt-6 w-full"
            >
              {pending ? "Saving…" : "Update password"}
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

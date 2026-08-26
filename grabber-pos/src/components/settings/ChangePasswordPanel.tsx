"use client";

import { useState } from "react";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { PasswordField } from "@/components/ui/PasswordField";

/** Signed-in owner/staff can set a new password without the email reset flow. */
export function ChangePasswordPanel() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!isSupabaseEnabled) {
    return (
      <section className="rounded-2xl border border-line bg-surface-1 p-5">
        <h2 className="text-sm font-semibold text-text-strong">Account</h2>
        <p className="mt-1 text-sm text-text-dim">
          Password changes are available on cloud accounts.
        </p>
      </section>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (password.length < 8) {
      setMsg({ ok: false, text: "Use at least 8 characters." });
      return;
    }
    if (password !== confirm) {
      setMsg({ ok: false, text: "Passwords do not match." });
      return;
    }
    setPending(true);
    try {
      const supabase = createClient();
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        setMsg({ ok: false, text: "Session expired. Sign in again." });
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMsg({ ok: false, text: error.message });
        return;
      }
      setPassword("");
      setConfirm("");
      setMsg({ ok: true, text: "Password updated." });
    } catch {
      setMsg({ ok: false, text: "Could not update password. Try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-surface-1 p-5">
      <h2 className="text-sm font-semibold text-text-strong">Account</h2>
      <p className="mt-1 text-sm text-text-dim">
        Change the password for the account you are signed in with.
      </p>
      <form onSubmit={submit} className="mt-4 max-w-md space-y-4">
        <PasswordField
          label="New password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={pending}
          hint="At least 8 characters"
        />
        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={pending}
        />
        {msg ? (
          <p
            className={`rounded-xl border px-3 py-2 text-sm ${
              msg.ok
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-danger/40 bg-danger/10 text-danger"
            }`}
            role={msg.ok ? "status" : "alert"}
          >
            {msg.text}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Change password"}
        </Button>
      </form>
    </section>
  );
}

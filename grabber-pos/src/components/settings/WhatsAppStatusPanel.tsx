"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Status = {
  configured: boolean;
  envToken: boolean;
  envPhoneNumberId: boolean;
  envVerifyToken: boolean;
  envAppSecret: boolean;
  webhookPath: string;
  settings?: { phoneNumberId?: string; locale?: string };
};

/** Simple connection readout for Settings — no secrets shown. */
export function WhatsAppStatusPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/whatsapp/status")
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok || !json.success) {
          setError(json.error ?? `Status ${r.status}`);
          return;
        }
        setStatus(json.data as Status);
      })
      .catch(() => setError("Could not load WhatsApp status"));
  }, []);

  const rows = status
    ? [
        { label: "Access token", ok: status.envToken },
        { label: "Phone number ID (platform)", ok: status.envPhoneNumberId },
        { label: "Webhook verify token", ok: status.envVerifyToken },
        { label: "App secret", ok: status.envAppSecret },
        {
          label: "Shop number attached",
          ok: Boolean(status.settings?.phoneNumberId),
        },
      ]
    : [];

  return (
    <section className="rounded-2xl border border-line bg-surface-1 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-text-strong">WhatsApp</h2>
          <p className="mt-1 text-sm text-text-dim">
            Cloud API connection for orders and inbox. Secrets stay on the
            server — manage them in Vercel / Meta.
          </p>
        </div>
        {status ? (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              status.configured
                ? "bg-accent/15 text-accent"
                : "bg-warn/15 text-warn"
            }`}
          >
            {status.configured ? "Connected" : "Setup needed"}
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {status ? (
        <ul className="mt-4 space-y-2">
          {rows.map((row) => (
            <li
              key={row.label}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="text-text-dim">{row.label}</span>
              <span
                className={
                  row.ok ? "font-medium text-accent" : "font-medium text-warn"
                }
              >
                {row.ok ? "Ready" : "Missing"}
              </span>
            </li>
          ))}
        </ul>
      ) : !error ? (
        <p className="mt-3 text-sm text-text-dim">Checking…</p>
      ) : null}

      {status?.settings?.phoneNumberId ? (
        <p className="mt-3 text-xs text-text-dim">
          Shop phone number id:{" "}
          <code className="text-text-body">{status.settings.phoneNumberId}</code>
        </p>
      ) : null}

      <p className="mt-3 break-all text-xs text-text-dim">
        Webhook:{" "}
        <code className="text-text-body">
          https://mypoz-and-store-ui.vercel.app
          {status?.webhookPath ?? "/api/whatsapp/webhook"}
        </code>
      </p>

        <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/whatsapp"
          className="inline-flex min-h-11 items-center rounded-xl border border-line px-4 text-sm font-medium text-text-strong transition hover:border-accent hover:text-accent"
        >
          Open WhatsApp inbox
        </Link>
      </div>
    </section>
  );
}

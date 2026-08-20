"use client";

import { useEffect, useState } from "react";
import { COMMERCE_THEME_IDS } from "@/lib/commerce/schema";
import type { HqPlatformConfig } from "@/lib/hq-config";

const INPUT =
  "w-full rounded-lg border border-line bg-surface-1 px-4 py-2.5 text-sm text-text-strong outline-none focus:border-accent";

export default function HqConfigPage() {
  const [cfg, setCfg] = useState<HqPlatformConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/hq/config")
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) throw new Error(j.error || "Failed");
        setCfg(j.data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!cfg) return;
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/hq/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || "Save failed");
      setCfg(j.data);
      setMsg("Saved platform config.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (!cfg) {
    return <p className="text-sm text-text-dim">{error || "Loading platform config…"}</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-strong">Platform config</h1>
      <p className="mt-1 text-sm text-text-dim">
        Super-admin defaults for every tenant. Per-client store theme, WhatsApp,
        and extras live on the tenant record.
      </p>

      <form onSubmit={(e) => void save(e)} className="mt-6 grid max-w-2xl gap-5">
        {error && <p className="text-sm text-danger">{error}</p>}
        {msg && <p className="text-sm text-accent">{msg}</p>}

        <label className="block">
          <span className="mb-1.5 block text-xs text-text-dim">Support email</span>
          <input
            className={INPUT}
            type="email"
            value={cfg.supportEmail}
            onChange={(e) => setCfg({ ...cfg, supportEmail: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs text-text-dim">Support phone</span>
          <input
            className={INPUT}
            value={cfg.supportPhone}
            onChange={(e) => setCfg({ ...cfg, supportPhone: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs text-text-dim">
            Webhook base URL (no trailing path)
          </span>
          <input
            className={INPUT}
            placeholder="https://mypoz-and-store-ui.vercel.app"
            value={cfg.webhookBaseUrl}
            onChange={(e) => setCfg({ ...cfg, webhookBaseUrl: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs text-text-dim">
            Default store announcement
          </span>
          <input
            className={INPUT}
            maxLength={200}
            value={cfg.announcement}
            onChange={(e) => setCfg({ ...cfg, announcement: e.target.value })}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs text-text-dim">Default locale</span>
            <select
              className={INPUT}
              value={cfg.defaultLocale}
              onChange={(e) =>
                setCfg({
                  ...cfg,
                  defaultLocale: e.target.value as HqPlatformConfig["defaultLocale"],
                })
              }
            >
              <option value="en">English</option>
              <option value="si">Sinhala</option>
              <option value="ta">Tamil</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs text-text-dim">Default theme</span>
            <select
              className={INPUT}
              value={cfg.defaultThemeId}
              onChange={(e) =>
                setCfg({
                  ...cfg,
                  defaultThemeId: e.target.value as HqPlatformConfig["defaultThemeId"],
                })
              }
            >
              {COMMERCE_THEME_IDS.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="rounded-2xl border border-line p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-text-dim">
            Feature flags
          </legend>
          {(
            [
              ["storefront", "Online store"],
              ["whatsapp", "WhatsApp Cloud API"],
              ["wholesale", "Wholesale sale"],
              ["hqTickets", "HQ tickets"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={cfg.flags[key]}
                onChange={(e) =>
                  setCfg({
                    ...cfg,
                    flags: { ...cfg.flags, [key]: e.target.checked },
                  })
                }
              />
              {label}
            </label>
          ))}
        </fieldset>

        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save platform config"}
        </button>
      </form>
    </div>
  );
}

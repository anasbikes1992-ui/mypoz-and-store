"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface FleetStatus {
  webhookPath: string;
  envToken: boolean;
  envPhoneNumberId: boolean;
  envVerifyToken: boolean;
  envAppSecret: boolean;
  tenants: {
    orgId: string;
    name: string;
    slug: string;
    phoneNumberIdSet: boolean;
    tokenSet: boolean;
    locale: string;
  }[];
}

export default function HqWhatsAppPage() {
  const [data, setData] = useState<FleetStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [locale, setLocale] = useState("en");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function load() {
    fetch("/api/hq/whatsapp")
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) throw new Error(j.error || "Failed");
        setData(j.data);
        if (!orgId && j.data.tenants?.[0]?.orgId) setOrgId(j.data.tenants[0].orgId);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function attach() {
    if (!orgId) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/hq/whatsapp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          phoneNumberId: phoneNumberId.trim() || undefined,
          accessToken: accessToken.trim() || undefined,
          locale,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setAccessToken("");
      setMsg("Client WhatsApp saved.");
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-strong">WhatsApp fleet</h1>
      <p className="mt-1 text-sm text-text-dim">
        Official Cloud API only. Attach a phone number id to each registered
        client. Merchants continue at{" "}
        <Link href="/whatsapp" className="text-accent hover:underline">
          /whatsapp
        </Link>
        . Checkout stamps sales.source = WHATSAPP on that client&apos;s inventory.
      </p>

      <section className="mt-6 rounded-2xl border border-line bg-surface-1 p-5">
        <h2 className="text-sm font-semibold text-text-strong">
          Pitch shops (HQ → owners)
        </h2>
        <p className="mt-1 text-xs text-text-dim">
          This is copy for you to send from your own WhatsApp until the Cloud
          API key is connected. It is not an auto-broadcast.
        </p>
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg bg-surface-2 p-3 text-xs text-text-body">
{`Hi — this is MyPoz.

One POS + one online store + WhatsApp orders, same stock.

I can onboard your shop this week:
1) products & stock
2) store theme
3) WhatsApp menu for your customers (order / track / staff)

Reply YES and I’ll send the login.`}
        </pre>
      </section>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {msg && <p className="mt-4 text-sm text-accent">{msg}</p>}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Platform token" value={yn(data?.envToken)} />
        <Stat label="Default phone id" value={yn(data?.envPhoneNumberId)} />
        <Stat label="Verify token" value={yn(data?.envVerifyToken)} />
        <Stat label="App secret" value={yn(data?.envAppSecret)} />
      </div>

      <p className="mt-4 text-xs text-text-dim">
        Shared webhook: <code className="text-text-body">{data?.webhookPath ?? "/api/whatsapp/webhook"}</code>
      </p>

      <section className="mt-8 rounded-2xl border border-line bg-surface-1 p-5">
        <h2 className="text-sm font-semibold text-text-strong">Attach to a client</h2>
        <p className="mt-1 text-xs text-text-dim">
          Super admin only. Tokens are never shown after save. Leave token blank to keep the existing one.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-text-dim">Client</span>
            <select
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong"
            >
              {(data?.tenants ?? []).map((t) => (
                <option key={t.orgId} value={t.orgId}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-text-dim">Locale</span>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong"
            >
              <option value="en">English</option>
              <option value="si">Sinhala</option>
              <option value="ta">Tamil</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-text-dim">Phone number id</span>
            <input
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-text-dim">Access token (optional override)</span>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              autoComplete="off"
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={busy || !orgId}
          onClick={() => void attach()}
          className="mt-4 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-ink disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save for client"}
        </button>
      </section>

      <h2 className="mt-8 text-sm font-semibold text-text-strong">Registered clients</h2>
      {!data?.tenants?.length ? (
        <p className="mt-2 text-sm text-text-dim">
          No organizations yet. Onboard a tenant, then attach their WhatsApp number here.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface-1">
          {data.tenants.map((c) => (
            <li key={c.orgId} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-text-strong">{c.name}</p>
                <p className="text-xs text-text-dim">
                  /store/{c.slug} · {c.locale}
                </p>
              </div>
              <p className="text-xs text-text-dim">
                {c.phoneNumberIdSet ? "Number set" : "No number"}
                {c.tokenSet ? " · token" : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function yn(value: boolean | undefined): string {
  if (value == null) return "…";
  return value ? "Set" : "Missing";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-1 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-dim">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-text-strong">{value}</p>
    </div>
  );
}

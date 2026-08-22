"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { sanitizeMetaPhoneNumberIdInput } from "@/lib/whatsapp/phone-number-id";

interface FleetTenant {
  orgId: string;
  name: string;
  slug: string;
  phoneNumberId: string;
  phoneNumberIdSet: boolean;
  tokenSet: boolean;
  locale: string;
}

interface FleetStatus {
  webhookPath: string;
  envToken: boolean;
  envPhoneNumberId: boolean;
  envVerifyToken: boolean;
  envAppSecret: boolean;
  webhookAudit?: {
    at: string;
    ok: boolean;
    reason?: string;
    phoneNumberId?: string;
    messageCount?: number;
    wabaId?: string;
    hasSignatureHeader?: boolean;
  }[];
  tenants: FleetTenant[];
}

function tenantFormDefaults(tenants: FleetTenant[], selectedOrgId: string) {
  const row = tenants.find((t) => t.orgId === selectedOrgId);
  return {
    phoneNumberId: row?.phoneNumberId ?? "",
    locale: row?.locale ?? "en",
  };
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

  function applyTenantForm(tenants: FleetTenant[], selectedOrgId: string) {
    const defaults = tenantFormDefaults(tenants, selectedOrgId);
    setPhoneNumberId(defaults.phoneNumberId);
    setLocale(defaults.locale);
  }

  function load() {
    fetch("/api/hq/whatsapp")
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) throw new Error(j.error || "Failed");
        const fleet = j.data as FleetStatus;
        setData(fleet);
        const tenants = fleet.tenants ?? [];
        const anaz = tenants.find((t) => t.slug === "anaz-store");
        const selectedOrgId = orgId || anaz?.orgId || tenants[0]?.orgId || "";
        if (!orgId && selectedOrgId) setOrgId(selectedOrgId);
        if (selectedOrgId) applyTenantForm(tenants, selectedOrgId);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!orgId || !data?.tenants?.length) return;
    applyTenantForm(data.tenants, orgId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, data?.tenants]);

  useEffect(() => {
    if (!orgId || !data?.tenants?.length) return;
    const saved = tenantFormDefaults(data.tenants, orgId).phoneNumberId;
    if (!saved) return;
    const timer = window.setTimeout(() => {
      setPhoneNumberId((current) => (current !== saved ? saved : current));
    }, 150);
    return () => window.clearTimeout(timer);
  }, [orgId, data?.tenants]);

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
      if (json.data?.phoneNumberId) {
        setPhoneNumberId(json.data.phoneNumberId);
      }
      setMsg("Client WhatsApp saved.");
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function detach(targetOrgId: string) {
    if (!confirm("Detach WhatsApp credentials from this client?")) return;
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/hq/whatsapp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: targetOrgId, detach: true }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setMsg("WhatsApp detached.");
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not detach");
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

      {!data?.envToken ? (
        <p className="mt-4 rounded-xl border border-warn/40 bg-surface-2 px-3 py-2 text-sm text-text-body">
          <span className="font-semibold text-text-strong">WHATSAPP_TOKEN</span> is
          missing on Vercel. Webhook verify may work, but send/receive and bot
          replies will fail until you add a permanent Meta system-user token,
          then redeploy.
        </p>
      ) : null}

      <p className="mt-4 text-xs text-text-dim">
        Shared webhook:{" "}
        <code className="text-text-body">
          https://mypoz-and-store-ui.vercel.app{data?.webhookPath ?? "/api/whatsapp/webhook"}
        </code>
      </p>

      {data?.webhookAudit?.length ? (
        <section className="mt-6 rounded-2xl border border-line bg-surface-1 p-4">
          <h2 className="text-sm font-semibold text-text-strong">
            Recent Meta webhook deliveries
          </h2>
          <p className="mt-1 text-xs text-text-dim">
            Dashboard “Send to server” tests use a fake phone id — they will not
            appear in merchant inbox. Real customer messages show phone id{" "}
            <code>101779492851300</code> and{" "}
            <code>reason: processed</code>.
          </p>
          <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto text-xs">
            {data.webhookAudit.slice(0, 8).map((row) => (
              <li
                key={row.at}
                className={`rounded-lg px-2 py-1 ${row.ok ? "bg-surface-2 text-text-body" : "bg-danger/10 text-danger"}`}
              >
                <span className="font-mono">{row.at.replace("T", " ").slice(0, 19)}</span>
                {" · "}
                {row.ok ? "ok" : "fail"}
                {row.reason ? ` · ${row.reason}` : ""}
                {row.phoneNumberId ? ` · phone ${row.phoneNumberId}` : ""}
                {row.messageCount != null ? ` · msgs ${row.messageCount}` : ""}
                {row.wabaId ? ` · waba ${row.wabaId}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8 rounded-2xl border border-line bg-surface-1 p-5">
        <h2 className="text-sm font-semibold text-text-strong">
          Meta app (GRABBER) — paste these, not /welcome everywhere
        </h2>
        <p className="mt-1 text-xs text-text-dim">
          /welcome is only the public site URL. WhatsApp will not verify if you
          put that path in the webhook or App domains field.
        </p>
        <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
          <MetaField
            label="App domains"
            value="mypoz-and-store-ui.vercel.app"
          />
          <MetaField
            label="Site URL (Basic / Facebook Login)"
            value="https://mypoz-and-store-ui.vercel.app/welcome"
          />
          <MetaField
            label="Privacy policy URL"
            value="https://mypoz-and-store-ui.vercel.app/privacy-policy"
          />
          <MetaField
            label="Terms of Service URL"
            value="https://mypoz-and-store-ui.vercel.app/terms-of-service"
          />
          <MetaField
            label="Data deletion instructions URL"
            value="https://mypoz-and-store-ui.vercel.app/data-deletion"
          />
          <MetaField
            label="WhatsApp webhook callback"
            value="https://mypoz-and-store-ui.vercel.app/api/whatsapp/webhook"
          />
        </dl>
        <p className="mt-3 text-xs text-text-dim">
          Verify token and App secret live in Vercel env (
          <code>WHATSAPP_VERIFY_TOKEN</code>, <code>WHATSAPP_APP_SECRET</code>
          ). Token + phone number id come from WhatsApp → API Setup, not Basic
          Settings.
        </p>
        <div className="mt-4 rounded-xl border border-warn/50 bg-warn/10 px-4 py-3 text-sm text-text-body">
          <p className="font-semibold text-text-strong">
            If customers send hi and nothing happens
          </p>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-xs">
            <li>
              WhatsApp → <strong>Step 2: Production setup</strong> → Webhook fields
              → subscribe <strong>messages</strong> (toggle On).{" "}
              <code>account_alerts</code> alone does not deliver chat.
            </li>
            <li>
              Callback URL must be exactly the webhook above; verify token must
              match Vercel <code>WHATSAPP_VERIFY_TOKEN</code>, then{" "}
              <strong>Verify and save</strong>.
            </li>
            <li>
              App is in <strong>Development</strong>: add the customer number under
              Step 1 → Test the API, or switch to Live after business verification.
            </li>
            <li>
              Leave org access token blank on attach — platform{" "}
              <code>WHATSAPP_TOKEN</code> is used (do not paste verify token there).
            </li>
          </ol>
        </div>
      </section>

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
              onChange={(e) =>
                setPhoneNumberId(sanitizeMetaPhoneNumberIdInput(e.target.value))
              }
              autoComplete="off"
              inputMode="numeric"
              name="meta-wa-phone-number-id"
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong"
              placeholder="101779492851300"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-text-dim">
              Access token (optional override)
            </span>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              autoComplete="off"
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong"
              placeholder="Meta token (EAA…) — leave blank to use platform token"
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
              <div className="flex items-center gap-3">
                <p className="text-xs text-text-dim">
                  {c.phoneNumberIdSet
                    ? `Number ${c.phoneNumberId}`
                    : "No number"}
                  {c.tokenSet ? " · token" : ""}
                </p>
                {(c.phoneNumberIdSet || c.tokenSet) && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void detach(c.orgId)}
                    className="rounded-lg px-2.5 py-1 text-[11px] text-danger hover:bg-danger/10 disabled:opacity-50"
                  >
                    Detach
                  </button>
                )}
              </div>
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

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 p-3">
      <dt className="text-text-dim">{label}</dt>
      <dd className="mt-1 break-all font-mono text-text-strong">{value}</dd>
    </div>
  );
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

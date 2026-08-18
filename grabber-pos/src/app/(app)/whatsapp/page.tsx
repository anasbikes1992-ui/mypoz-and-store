"use client";

import { useEffect, useState } from "react";
import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

interface WaSettings {
  phoneNumberId: string;
  verifyTokenSet: boolean;
  accessTokenSet: boolean;
  locale: string;
  greeting: string;
  locationText: string;
  offersText: string;
  staffNotify: boolean;
}

interface Conversation {
  id: string;
  waId: string;
  phone: string;
  name?: string;
  state: string;
  lastMessage: string;
  lastSaleId?: string;
  needsStaffReply?: boolean;
  updatedAt: string;
}

interface ThreadMessage {
  id: string;
  direction: "in" | "out";
  body: string;
  createdAt: string;
}

export default function WhatsAppPage() {
  const [settings, setSettings] = useState<WaSettings | null>(null);
  const [status, setStatus] = useState<{
    configured: boolean;
    envToken: boolean;
    envPhoneNumberId: boolean;
    envVerifyToken: boolean;
    envAppSecret: boolean;
    webhookPath: string;
  } | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [locale, setLocale] = useState("en");
  const [locationText, setLocationText] = useState("");
  const [offersText, setOffersText] = useState("");

  function loadInbox() {
    fetch("/api/whatsapp/inbox")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setConversations(j.data);
      })
      .catch(() => undefined);
  }

  useEffect(() => {
    fetch("/api/whatsapp/status")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setStatus(j.data);
          const s = j.data.settings as WaSettings;
          setSettings(s);
          setPhoneNumberId(s.phoneNumberId ?? "");
          setLocale(s.locale ?? "en");
          setLocationText(s.locationText ?? "");
          setOffersText(s.offersText ?? "");
        }
      })
      .catch(() => undefined);
    loadInbox();
  }, []);

  useEffect(() => {
    if (!activeId) {
      setThread([]);
      return;
    }
    fetch(`/api/whatsapp/inbox?id=${encodeURIComponent(activeId)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setThread(j.data.messages);
      })
      .catch(() => undefined);
  }, [activeId]);

  async function saveSettings() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/whatsapp/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumberId,
          verifyToken: verifyToken.trim() || undefined,
          accessToken: accessToken.trim() || undefined,
          locale,
          locationText,
          offersText,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setSettings(json.data);
      setVerifyToken("");
      setAccessToken("");
      setMsg("Settings saved.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <ModuleHeader
        title="WhatsApp"
        subtitle="Official Cloud API inbox. Orders post to the same sales ledger as POS."
      />

      {msg ? <p className="mt-4 text-sm text-accent">{msg}</p> : null}

      <section className="mt-6 rounded-2xl border border-line bg-surface-1 p-5">
        <h2 className="text-sm font-semibold text-text-strong">Connection</h2>
        <p className="mt-1 text-xs text-text-dim">
          Callback URL: <code className="text-text-body">{status?.webhookPath ?? "/api/whatsapp/webhook"}</code>
          . Set Meta verify token to match WHATSAPP_VERIFY_TOKEN (or the org override below).
        </p>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <StatusRow
            label="Access token"
            ok={Boolean(status?.envToken)}
          />
          <StatusRow
            label="Phone number id (env)"
            ok={Boolean(status?.envPhoneNumberId)}
          />
          <StatusRow
            label="Verify token (env)"
            ok={Boolean(status?.envVerifyToken)}
          />
          <StatusRow
            label="App secret (signatures)"
            ok={Boolean(status?.envAppSecret)}
          />
        </dl>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-text-dim">Phone number id (org override)</span>
            <input
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
              placeholder="From Meta WhatsApp product"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-text-dim">
              Org verify token {settings?.verifyTokenSet ? "(set — leave blank to keep)" : "(optional override)"}
            </span>
            <input
              type="password"
              value={verifyToken}
              onChange={(e) => setVerifyToken(e.target.value)}
              autoComplete="off"
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
              placeholder="Same value as Meta hub.verify_token"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-text-dim">Bot language</span>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
            >
              <option value="en">English</option>
              <option value="si">Sinhala</option>
              <option value="ta">Tamil</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-text-dim">
              Org access token {settings?.accessTokenSet ? "(set — leave blank to keep)" : "(optional; else platform token)"}
            </span>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              autoComplete="off"
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-text-dim">Location reply</span>
            <textarea
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-text-dim">Offers reply</span>
            <textarea
              value={offersText}
              onChange={(e) => setOffersText(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
            />
          </label>
        </div>
        <Button className="mt-4" disabled={busy} onClick={() => void saveSettings()}>
          {busy ? "Saving…" : "Save settings"}
        </Button>
      </section>

      <section className="mt-6 grid min-h-[24rem] gap-4 lg:grid-cols-[18rem_1fr]">
        <div className="overflow-hidden rounded-2xl border border-line bg-surface-1">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold text-text-strong">Inbox</h2>
            <button
              type="button"
              onClick={loadInbox}
              className="text-xs text-text-dim hover:text-accent"
            >
              Refresh
            </button>
          </div>
          {conversations.length === 0 ? (
            <p className="px-4 py-8 text-sm text-text-dim">No conversations yet.</p>
          ) : (
            <ul className="max-h-[28rem] overflow-y-auto">
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(c.id)}
                    className={`w-full border-b border-line px-4 py-3 text-left ${
                      activeId === c.id ? "bg-accent/10" : "hover:bg-surface-2"
                    }`}
                  >
                    <p className="truncate text-sm font-medium text-text-strong">
                      {c.name || c.phone}
                      {c.needsStaffReply ? (
                        <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-warn">
                          Staff
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-text-dim">{c.lastMessage}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface-1">
          {!activeId ? (
            <EmptyState
              title="Select a conversation"
              body="Inbound Cloud API messages appear here. Checkout creates a sale with source WHATSAPP."
            />
          ) : (
            <ul className="flex-1 space-y-2 overflow-y-auto p-4">
              {thread.map((m) => (
                <li
                  key={m.id}
                  className={`max-w-[80%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${
                    m.direction === "out"
                      ? "ml-auto bg-accent/15 text-text-strong"
                      : "bg-surface-2 text-text-body"
                  }`}
                >
                  {m.body}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2">
      <span className="text-text-dim">{label}</span>
      <span className={ok ? "text-accent" : "text-warn"}>{ok ? "Set" : "Missing"}</span>
    </div>
  );
}

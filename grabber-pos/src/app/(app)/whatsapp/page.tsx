"use client";

import { useEffect, useState } from "react";
import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { WhatsAppAutomationGraph } from "@/components/whatsapp/WhatsAppAutomationGraph";
import {
  DEFAULT_ENABLED_PATHS,
  normalizeEnabledPaths,
  type AutomationPathEnabled,
} from "@/lib/whatsapp/automation-graph";
import {
  DEFAULT_ENABLED_EVENTS,
  normalizeEnabledEvents,
  type WaEventEnabled,
  type WaEventKey,
} from "@/lib/whatsapp/event-automations";
import type { Locale } from "@/lib/whatsapp/i18n";
import { sanitizeMetaPhoneNumberIdInput } from "@/lib/whatsapp/phone-number-id";

interface WaSettings {
  phoneNumberId: string;
  verifyTokenSet: boolean;
  accessTokenSet: boolean;
  locale: string;
  greeting: string;
  locationText: string;
  offersText: string;
  staffNotify: boolean;
  enabledPaths?: Partial<AutomationPathEnabled>;
  enabledEvents?: Partial<WaEventEnabled>;
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
  assignedTo?: string;
  updatedAt: string;
}

interface ThreadMessage {
  id: string;
  direction: "in" | "out";
  body: string;
  createdAt: string;
}

interface EmployeeRow {
  id: string;
  name?: string;
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
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [assignBusy, setAssignBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [locale, setLocale] = useState<Locale>("en");
  const [greeting, setGreeting] = useState("");
  const [locationText, setLocationText] = useState("");
  const [offersText, setOffersText] = useState("");
  const [staffNotify, setStaffNotify] = useState(true);
  const [enabledPaths, setEnabledPaths] =
    useState<AutomationPathEnabled>(DEFAULT_ENABLED_PATHS);
  const [enabledEvents, setEnabledEvents] =
    useState<WaEventEnabled>(DEFAULT_ENABLED_EVENTS);
  const [orgName, setOrgName] = useState("Your store");
  const [assignDraft, setAssignDraft] = useState("");
  const [replyDraft, setReplyDraft] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);

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
          setLocale((s.locale as Locale) || "en");
          setGreeting(s.greeting ?? "");
          setLocationText(s.locationText ?? "");
          setOffersText(s.offersText ?? "");
          setStaffNotify(s.staffNotify !== false);
          setEnabledPaths(normalizeEnabledPaths(s.enabledPaths));
          setEnabledEvents(normalizeEnabledEvents(s.enabledEvents));
        }
      })
      .catch(() => undefined);
    loadInbox();
    fetch("/api/collections/employees")
      .then((r) => r.json())
      .then((j) => {
        if (j.success && Array.isArray(j.data)) {
          setEmployees(j.data as EmployeeRow[]);
        } else if (j.success && Array.isArray(j.data?.items)) {
          setEmployees(j.data.items as EmployeeRow[]);
        }
      })
      .catch(() => undefined);
    fetch("/api/settings")
      .then((r) => r.json())
      .then((j) => {
        const name = j?.data?.businessName || j?.businessName;
        if (typeof name === "string" && name.trim()) setOrgName(name.trim());
      })
      .catch(() => undefined);
  }, []);

  // Re-apply server value if the browser autofill injects an email address.
  useEffect(() => {
    const saved = settings?.phoneNumberId ?? "";
    if (!saved) return;
    const timer = window.setTimeout(() => {
      setPhoneNumberId((current) =>
        current !== saved ? saved : current,
      );
    }, 150);
    return () => window.clearTimeout(timer);
  }, [settings?.phoneNumberId]);

  useEffect(() => {
    if (!activeId) {
      setThread([]);
      setAssignDraft("");
      setReplyDraft("");
      return;
    }
    const active = conversations.find((c) => c.id === activeId);
    setAssignDraft(active?.assignedTo ?? "");
    setReplyDraft("");
    fetch(`/api/whatsapp/inbox?id=${encodeURIComponent(activeId)}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setThread(j.data.messages);
          const convo = j.data.conversation as Conversation | undefined;
          if (convo) {
            setAssignDraft(convo.assignedTo ?? "");
            setConversations((prev) =>
              prev.map((c) => (c.id === convo.id ? { ...c, ...convo } : c)),
            );
          }
        }
      })
      .catch(() => undefined);
  }, [activeId]);

  const active = conversations.find((c) => c.id === activeId) ?? null;

  async function saveSettings(opts?: { connectionOnly?: boolean }) {
    setBusy(true);
    setMsg(null);
    try {
      const body: Record<string, unknown> = {
        phoneNumberId,
        verifyToken: verifyToken.trim() || undefined,
        accessToken: accessToken.trim() || undefined,
        locale,
      };
      if (!opts?.connectionOnly) {
        body.greeting = greeting;
        body.locationText = locationText;
        body.offersText = offersText;
        body.staffNotify = staffNotify;
        body.enabledPaths = enabledPaths;
        body.enabledEvents = enabledEvents;
      }
      const res = await fetch("/api/whatsapp/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setSettings(json.data);
      setPhoneNumberId(json.data.phoneNumberId ?? "");
      setVerifyToken("");
      setAccessToken("");
      if (json.data?.enabledPaths) {
        setEnabledPaths(normalizeEnabledPaths(json.data.enabledPaths));
      }
      if (json.data?.enabledEvents) {
        setEnabledEvents(normalizeEnabledEvents(json.data.enabledEvents));
      }
      setMsg(opts?.connectionOnly ? "Connection saved." : "Automations saved.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function assignStaff(assignTo: string) {
    if (!activeId) return;
    setAssignBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/whatsapp/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activeId, assignTo }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Assign failed");
      const updated = json.data as Conversation;
      setConversations((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
      );
      setAssignDraft(updated.assignedTo ?? "");
      setMsg(
        updated.assignedTo
          ? `Assigned to ${updated.assignedTo}`
          : "Assignment cleared",
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not assign");
    } finally {
      setAssignBusy(false);
    }
  }

  async function sendStaffReply() {
    if (!activeId || !replyDraft.trim()) return;
    setReplyBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/whatsapp/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeId,
          reply: replyDraft.trim(),
          resolveStaff: true,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Send failed");
      const updated = json.data.conversation as Conversation;
      const messages = json.data.messages as ThreadMessage[];
      setConversations((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
      );
      setThread(messages);
      setReplyDraft("");
      setMsg("Reply sent on WhatsApp.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not send reply");
    } finally {
      setReplyBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <ModuleHeader
        title="WhatsApp"
        subtitle="Official Cloud API inbox. Orders post to the same sales ledger as POS."
      />

      {msg ? <p className="mt-4 text-sm text-accent">{msg}</p> : null}

      <aside className="mt-6 rounded-2xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-text-body">
        <p className="font-medium text-text-strong">Meta phone catalog</p>
        <p className="mt-1 text-xs text-text-dim">
          Native WhatsApp shopping uses catalog{" "}
          <strong className="text-text-body">Anaz Store MyPoz</strong> in Meta
          (not MyPoz POS data). After connect, Meta can take up to{" "}
          <strong className="text-text-body">24 hours</strong> to show items in
          the WhatsApp Catalog manager. Bot menu option{" "}
          <strong className="text-text-body">2 · View menu</strong> always reads
          live POS stock and does not wait on Meta.
        </p>
      </aside>

      <section className="mt-6 rounded-2xl border border-line bg-surface-1 p-5">
        <h2 className="text-sm font-semibold text-text-strong">Connection</h2>
        <p className="mt-1 text-xs text-text-dim">
          Callback URL:{" "}
          <code className="text-text-body">
            {status?.webhookPath ?? "/api/whatsapp/webhook"}
          </code>
          . Set Meta verify token to match WHATSAPP_VERIFY_TOKEN (or the org
          override below).
        </p>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <StatusRow label="Access token" ok={Boolean(status?.envToken)} />
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
            <span className="mb-1 block text-text-dim">
              Phone number id (org override)
            </span>
            <input
              value={phoneNumberId}
              onChange={(e) =>
                setPhoneNumberId(sanitizeMetaPhoneNumberIdInput(e.target.value))
              }
              autoComplete="off"
              inputMode="numeric"
              name="meta-wa-phone-number-id"
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
              placeholder="From Meta WhatsApp product (digits only, e.g. 101779492851300)"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-text-dim">
              Org verify token{" "}
              {settings?.verifyTokenSet
                ? "(set — leave blank to keep)"
                : "(optional override)"}
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
              onChange={(e) => setLocale(e.target.value as Locale)}
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
            >
              <option value="en">English</option>
              <option value="si">Sinhala</option>
              <option value="ta">Tamil</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-text-dim">
              Org access token{" "}
              {settings?.accessTokenSet
                ? "(set — leave blank to keep)"
                : "(optional; uses platform token from Vercel if blank)"}
            </span>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              autoComplete="off"
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
              placeholder="Meta system-user token (starts with EAA) — not the verify token"
            />
          </label>
        </div>
        <Button
          className="mt-4"
          disabled={busy}
          onClick={() => void saveSettings({ connectionOnly: true })}
        >
          {busy ? "Saving…" : "Save connection"}
        </Button>
      </section>

      <div className="mt-6">
        <WhatsAppAutomationGraph
          value={{
            greeting,
            locationText,
            offersText,
            staffNotify,
            enabledPaths,
            locale,
            orgName,
          }}
          onChange={(next) => {
            setGreeting(next.greeting);
            setLocationText(next.locationText);
            setOffersText(next.offersText);
            setStaffNotify(next.staffNotify);
            setEnabledPaths(next.enabledPaths);
            setLocale(next.locale);
          }}
          busy={busy}
          onSave={() => void saveSettings()}
        />
      </div>

      <section className="mt-6 rounded-2xl border border-line bg-surface-1 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-text-strong">
              Order status alerts
            </h2>
            <p className="mt-1 text-xs text-text-dim">
              Free-form Cloud API texts sent when fulfillment changes on{" "}
              <code className="text-text-body">/commerce/orders</code>. Not Meta
              HSM templates (those stay deferred until Live + approved templates).
            </p>
          </div>
          <Button
            type="button"
            disabled={busy}
            onClick={() => void saveSettings()}
          >
            {busy ? "Saving…" : "Save alerts"}
          </Button>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {(
            [
              ["ORDER_CREATED", "Order placed (COD / WA / web)"],
              ["ORDER_PROCESSING", "Processing / preparing"],
              ["ORDER_READY", "Ready for pickup"],
              ["ORDER_SHIPPED", "Out for delivery"],
              ["ORDER_COMPLETED", "Delivered / collected"],
              ["ORDER_CANCELLED", "Cancelled"],
              ["PAYMENT_RECEIVED", "Payment received"],
              ["STAFF_HANDOFF", "Staff handoff ack"],
              ["OPT_OUT_ACK", "STOP / START opt-out"],
              ["SALE_COMPLETED", "Every POS sale (noisy)"],
              ["REFUND_ISSUED", "Refund issued"],
              ["LOW_STOCK", "Low stock (staff)"],
            ] as [WaEventKey, string][]
          ).map(([key, label]) => (
            <li key={key}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-2 text-sm text-text-body hover:border-accent/40">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--accent)]"
                  checked={Boolean(enabledEvents[key])}
                  onChange={(e) =>
                    setEnabledEvents((prev) => ({
                      ...prev,
                      [key]: e.target.checked,
                    }))
                  }
                />
                <span>
                  <span className="font-medium text-text-strong">{label}</span>
                  <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-text-dim">
                    {key}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-surface-1 p-5">
        <h2 className="text-sm font-semibold text-text-strong">
          Meta product catalog (phone shopping)
        </h2>
        <p className="mt-1 text-xs text-text-dim">
          The numbered bot menu uses live POS stock. The native WhatsApp
          product catalog on your phone is a separate Meta Commerce catalog —
          it must be synced and then connected to this number in WhatsApp
          Manager.
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-text-body">
          <li>
            Feed:{" "}
            <code className="text-xs text-text-dim">
              /api/store/anaz-store/catalog?format=json
            </code>
          </li>
          <li>
            Catalog id:{" "}
            <code className="text-xs text-text-dim">1397856035621959</code>{" "}
            (Anaz Store MyPoz)
          </li>
          <li>
            After sync: WhatsApp Manager → Catalog → connect to GRABBER.LK (
            +94 77 959 2288)
          </li>
        </ul>
        <p className="mt-2 text-xs text-warn">
          If the phone shows an empty catalog, the catalog is usually not
          linked to the WABA number yet (SMB accounts often cannot attach via
          API — use the Manager UI).
        </p>
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
            <p className="px-4 py-8 text-sm text-text-dim">
              No conversations yet.
            </p>
          ) : (
            <ul className="max-h-[28rem] overflow-y-auto">
              {conversations.map((c) => {
                const needsStaff = Boolean(c.needsStaffReply);
                const unassigned = needsStaff && !c.assignedTo;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(c.id)}
                      className={`w-full border-b border-line px-4 py-3 text-left ${
                        activeId === c.id
                          ? "bg-accent/10"
                          : unassigned
                            ? "bg-warn/10 hover:bg-warn/15"
                            : "hover:bg-surface-2"
                      }`}
                    >
                      <p className="truncate text-sm font-medium text-text-strong">
                        {c.name || c.phone}
                        {needsStaff ? (
                          <span
                            className={`ml-2 text-[10px] font-semibold uppercase tracking-wide ${
                              unassigned ? "text-warn" : "text-accent"
                            }`}
                          >
                            {unassigned ? "Needs staff" : "Staff"}
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-xs text-text-dim">
                        {c.assignedTo ? `Assigned to ${c.assignedTo} · ` : ""}
                        {c.lastMessage}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface-1">
          {!activeId || !active ? (
            <EmptyState
              title="Select a conversation"
              body="Inbound Cloud API messages appear here. Checkout creates a sale with source WHATSAPP."
            />
          ) : (
            <>
              {active.needsStaffReply ? (
                <div className="border-b border-line px-4 py-3">
                  {active.assignedTo ? (
                    <p className="mb-2 text-xs font-medium text-accent">
                      Assigned to {active.assignedTo}
                    </p>
                  ) : (
                    <p className="mb-2 text-xs font-medium text-warn">
                      Needs staff reply — unassigned
                    </p>
                  )}
                  <div className="flex flex-wrap items-end gap-2">
                    {employees.length > 0 ? (
                      <label className="min-w-[10rem] flex-1 text-sm">
                        <span className="mb-1 block text-text-dim">Assign</span>
                        <select
                          value={
                            employees.some(
                              (e) => (e.name || e.id) === assignDraft,
                            )
                              ? assignDraft
                              : ""
                          }
                          onChange={(e) => {
                            const v = e.target.value;
                            setAssignDraft(v);
                            if (v) void assignStaff(v);
                          }}
                          disabled={assignBusy}
                          className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent disabled:opacity-50"
                        >
                          <option value="">Select employee…</option>
                          {employees.map((e) => {
                            const label = e.name || e.id;
                            return (
                              <option key={e.id} value={label}>
                                {label}
                              </option>
                            );
                          })}
                        </select>
                      </label>
                    ) : null}
                    <label className="min-w-[10rem] flex-1 text-sm">
                      <span className="mb-1 block text-text-dim">
                        {employees.length > 0 ? "Or type a name" : "Assign to"}
                      </span>
                      <input
                        value={assignDraft}
                        onChange={(e) => setAssignDraft(e.target.value)}
                        placeholder="Staff name"
                        disabled={assignBusy}
                        className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent disabled:opacity-50"
                      />
                    </label>
                    <Button
                      disabled={assignBusy || !assignDraft.trim()}
                      onClick={() => void assignStaff(assignDraft.trim())}
                    >
                      {assignBusy ? "Saving…" : "Assign"}
                    </Button>
                    {active.assignedTo ? (
                      <button
                        type="button"
                        disabled={assignBusy}
                        onClick={() => void assignStaff("")}
                        className="text-xs text-text-dim hover:text-accent disabled:opacity-50"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
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
              <div className="border-t border-line p-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-text-dim">
                    Reply on WhatsApp (within 24h customer-care window)
                  </span>
                  <textarea
                    value={replyDraft}
                    onChange={(e) => setReplyDraft(e.target.value)}
                    rows={2}
                    maxLength={4096}
                    placeholder="Type a staff reply…"
                    className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
                  />
                </label>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    disabled={replyBusy || !replyDraft.trim()}
                    onClick={() => void sendStaffReply()}
                  >
                    {replyBusy ? "Sending…" : "Send reply"}
                  </Button>
                  <span className="text-[11px] text-text-dim">
                    Clears “needs staff” and returns the bot to the greeting
                    menu for that chat.
                  </span>
                </div>
              </div>
            </>
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
      <span className={ok ? "text-accent" : "text-warn"}>
        {ok ? "Set" : "Missing"}
      </span>
    </div>
  );
}

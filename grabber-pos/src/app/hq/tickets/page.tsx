"use client";

import { useEffect, useState } from "react";
import type { HqTicket, HqTenant } from "@/lib/hq";

const INPUT =
  "w-full rounded-lg border border-line bg-surface-1 px-4 py-2.5 text-sm text-text-strong outline-none focus:border-accent";

export default function HqTicketsPage() {
  const [tickets, setTickets] = useState<HqTicket[]>([]);
  const [tenants, setTenants] = useState<HqTenant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [priority, setPriority] = useState<HqTicket["priority"]>("normal");
  const [busy, setBusy] = useState(false);

  function reload() {
    return Promise.all([
      fetch("/api/hq/tickets").then((r) => r.json()),
      fetch("/api/hq/tenants").then((r) => r.json()),
    ]).then(([tj, nj]) => {
      if (!tj.success) throw new Error(tj.error || "Tickets failed");
      if (!nj.success) throw new Error(nj.error || "Tenants failed");
      setTickets(tj.data);
      setTenants(nj.data.tenants);
    });
  }

  useEffect(() => {
    reload().catch((e) =>
      setError(e instanceof Error ? e.message : "Failed to load"),
    );
  }, []);

  async function createTicket(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const tenant = tenants.find((t) => t.id === tenantId);
      const res = await fetch("/api/hq/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          body,
          tenantId,
          tenantName: tenant?.name ?? "",
          priority,
          contact: tenant?.contact ?? "",
        }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || "Create failed");
      setSubject("");
      setBody("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: HqTicket["status"]) {
    const res = await fetch("/api/hq/tickets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const j = await res.json();
    if (j.success) await reload();
  }

  async function removeTicket(id: string) {
    if (!confirm("Delete this ticket?")) return;
    const res = await fetch("/api/hq/tickets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const j = await res.json();
    if (j.success) await reload();
    else setError(j.error || "Delete failed");
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-strong">
        Support tickets
      </h1>
      <p className="mt-1 text-sm text-text-dim">
        Track buyer and tenant requests. Open tickets stay visible until
        resolved; durable when the platform settings store is available.
      </p>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <form
        onSubmit={(e) => void createTicket(e)}
        className="mt-6 space-y-3 rounded-2xl border border-line bg-surface-1 p-5"
      >
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-dim">
          New ticket
        </h2>
        <input
          className={INPUT}
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />
        <textarea
          className={`${INPUT} min-h-24`}
          placeholder="Notes"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            className={INPUT}
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
          >
            <option value="">No tenant linked</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            className={INPUT}
            value={priority}
            onChange={(e) =>
              setPriority(e.target.value as HqTicket["priority"])
            }
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={busy || !subject.trim()}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink disabled:opacity-50"
        >
          {busy ? "Saving…" : "Create ticket"}
        </button>
      </form>

      <ul className="mt-6 space-y-3">
        {tickets.map((t) => (
          <li
            key={t.id}
            className="rounded-2xl border border-line bg-surface-1 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-text-strong">{t.subject}</p>
                <p className="mt-0.5 text-xs text-text-dim">
                  {t.id}
                  {t.tenantName ? ` · ${t.tenantName}` : ""} · {t.priority} ·{" "}
                  {t.status.replace("_", " ")}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(
                  ["open", "in_progress", "resolved"] as HqTicket["status"][]
                ).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void setStatus(t.id, s)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] capitalize ${
                      t.status === s
                        ? "bg-accent/15 text-accent"
                        : "bg-surface-2 text-text-dim hover:text-text-strong"
                    }`}
                  >
                    {s.replace("_", " ")}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => void removeTicket(t.id)}
                  className="rounded-lg px-2.5 py-1 text-[11px] text-danger hover:bg-danger/10"
                >
                  Delete
                </button>
              </div>
            </div>
            {t.body && (
              <p className="mt-2 whitespace-pre-wrap text-sm text-text-body">
                {t.body}
              </p>
            )}
          </li>
        ))}
        {tickets.length === 0 && (
          <li className="py-6 text-center text-sm text-text-dim">
            No tickets yet.
          </li>
        )}
      </ul>
    </div>
  );
}

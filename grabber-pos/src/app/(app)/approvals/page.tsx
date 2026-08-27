"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ModuleHeader } from "@/components/shell/ModuleHeader";

interface ApprovalRow {
  id: string;
  kind: string;
  status: string;
  agentId: string;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  createdAt: string;
  decidedAt?: string;
  rejectionReason?: string;
}

export default function ApprovalsPage() {
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const q = filter === "pending" ? "?status=pending" : "";
    fetch(`/api/approvals${q}`)
      .then(async (r) => {
        const j = await r.json();
        if (!j.success) setError(j.error ?? "Failed");
        else {
          setError(null);
          setRows(j.data ?? []);
        }
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(id: string, action: "approve" | "reject") {
    setBusy(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reason: action === "reject" ? "Rejected by operator" : undefined,
        }),
      });
      const j = await res.json();
      if (!j.success) {
        setMsg(j.error ?? "Failed");
        return;
      }
      setMsg(
        action === "approve"
          ? `Approved${j.data?.executed ? ` (${j.data.executed})` : ""}`
          : "Rejected",
      );
      load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <ModuleHeader
        title="Approvals"
        subtitle="Jarvis proposes; you approve before knowledge or WhatsApp writes."
      />
      <p className="mt-2 text-sm text-text-dim">
        Open proposals from{" "}
        <Link href="/assistant" className="text-accent hover:underline">
          Jarvis
        </Link>
        . Shop FAQs still edit on{" "}
        <Link href="/knowledge" className="text-accent hover:underline">
          Knowledge
        </Link>
        .
      </p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className={`rounded px-3 py-1.5 text-sm ${
            filter === "pending"
              ? "bg-accent text-white"
              : "border border-border text-text-body"
          }`}
          onClick={() => setFilter("pending")}
        >
          Pending
        </button>
        <button
          type="button"
          className={`rounded px-3 py-1.5 text-sm ${
            filter === "all"
              ? "bg-accent text-white"
              : "border border-border text-text-body"
          }`}
          onClick={() => setFilter("all")}
        >
          All
        </button>
      </div>

      {msg && <p className="mt-3 text-sm text-text-body">{msg}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="mt-6 text-sm text-text-dim">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-sm text-text-dim">
          No {filter === "pending" ? "pending " : ""}approvals. Ask Jarvis to
          draft a knowledge article or WhatsApp message.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {rows.map((row) => (
            <li
              key={row.id}
              className="border-b border-border pb-4 last:border-0"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-medium text-text-strong">
                  {row.title}
                </h2>
                <span className="text-xs uppercase tracking-wide text-text-dim">
                  {row.status} · {row.kind} · {row.agentId}
                </span>
              </div>
              <p className="mt-1 text-sm text-text-dim">{row.summary}</p>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-surface-1 p-2 text-xs text-text-body">
                {JSON.stringify(row.payload, null, 2)}
              </pre>
              {row.status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={busy === row.id}
                    className="rounded bg-accent px-3 py-1.5 text-sm text-white disabled:opacity-50"
                    onClick={() => decide(row.id, "approve")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busy === row.id}
                    className="rounded border border-border px-3 py-1.5 text-sm text-text-body disabled:opacity-50"
                    onClick={() => decide(row.id, "reject")}
                  >
                    Reject
                  </button>
                </div>
              )}
              {row.rejectionReason && (
                <p className="mt-2 text-xs text-text-dim">
                  Reason: {row.rejectionReason}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

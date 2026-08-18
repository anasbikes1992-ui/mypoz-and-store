"use client";

import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format";
import { ModuleHeader } from "@/components/shell/ModuleHeader";

interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
}

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/audit")
      .then((r) => r.json())
      .then((j) => j.success && setEvents(j.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <ModuleHeader
        title="Audit log"
        subtitle="Sensitive POS actions and overrides"
      />

      {loading ? (
        <p className="mt-10 text-center text-sm text-text-dim">Loading…</p>
      ) : events.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-line p-8 text-center text-sm text-text-dim">
          No audit events yet.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface-1">
          {events.map((e) => (
            <li key={e.id} className="px-5 py-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-text-strong">{e.action}</p>
                <p className="text-xs text-text-dim">
                  {formatDateTime(e.timestamp)}
                </p>
              </div>
              <p className="mt-0.5 text-text-body">{e.details}</p>
              <p className="mt-0.5 text-xs text-text-dim">
                {e.actor} · {e.id}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

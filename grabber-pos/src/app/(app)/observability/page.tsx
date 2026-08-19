"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ModuleHeader } from "@/components/shell/ModuleHeader";
import type { StoredUxEvent } from "@/lib/observability";

export default function ObservabilityPage() {
  return (
    <Suspense fallback={<div className="px-4 py-6 text-sm text-text-dim">Loading replay…</div>}>
      <ObservabilityInner />
    </Suspense>
  );
}

function ObservabilityInner() {
  const params = useSearchParams();
  const focusSession = params.get("session") || "";
  const [events, setEvents] = useState<StoredUxEvent[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/observability/events")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setEvents(j.data);
        else setError(j.error || "Could not load");
      })
      .catch(() => setError("Could not load"));
  }, []);

  const visible = useMemo(() => {
    if (!focusSession) return events;
    return events.filter((e) => e.sessionId === focusSession);
  }, [events, focusSession]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <ModuleHeader
        title="Session replay"
        subtitle="Errors open the last click trail. Rage clicks are flagged as UX failures."
      />
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      {focusSession ? (
        <p className="mt-3 text-xs text-text-dim">
          Showing session <code>{focusSession}</code>
        </p>
      ) : null}
      <ul className="mt-6 space-y-2">
        {visible.map((event) => {
          const isError = event.kind === "error";
          const open = openId === event.id || (isError && focusSession === event.sessionId);
          return (
            <li
              key={event.id}
              className="rounded-2xl border border-line bg-surface-1 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-text-strong">
                    {event.kind === "ux_failure" ? "Rage click (UX failure)" : event.kind}
                  </p>
                  <p className="mt-0.5 text-xs text-text-dim">
                    {event.path} · {new Date(event.at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  {isError ? (
                    <a
                      href={`/observability?session=${encodeURIComponent(event.sessionId)}`}
                      className="min-h-11 rounded-xl border border-accent px-3 py-2 text-xs font-semibold text-accent"
                    >
                      Open replay
                    </a>
                  ) : null}
                  <button
                    type="button"
                    className="min-h-11 rounded-xl border border-line px-3 py-2 text-xs"
                    onClick={() => setOpenId(open ? null : event.id)}
                  >
                    {open ? "Hide trail" : "Trail"}
                  </button>
                </div>
              </div>
              {event.message ? (
                <p className="mt-2 text-sm text-text-body">{event.message}</p>
              ) : null}
              {open ? (
                <ol className="mt-3 space-y-1 font-mono text-[11px] text-text-dim">
                  {(event.replay ?? []).map((frame, i) => (
                    <li key={`${frame.t}-${i}`}>
                      {new Date(frame.t).toISOString().slice(11, 23)} {frame.type}{" "}
                      {frame.tag || frame.path}
                      {frame.detail ? ` — ${frame.detail}` : ""}
                    </li>
                  ))}
                  {(event.replay ?? []).length === 0 ? (
                    <li>No frames captured before this event.</li>
                  ) : null}
                </ol>
              ) : null}
            </li>
          );
        })}
        {visible.length === 0 ? (
          <li className="rounded-2xl border border-line bg-surface-1 p-6 text-sm text-text-dim">
            No rage clicks or errors recorded yet.
          </li>
        ) : null}
      </ul>
    </div>
  );
}

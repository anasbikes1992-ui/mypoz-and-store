"use client";

import { useEffect } from "react";
import { detectRageClick, type ReplayFrame, type UxEventKind } from "@/lib/observability";

const MAX_TRAIL = 80;
const SESSION_KEY = "mypoz_sid";

function readSessionId(): string {
  try {
    const match = document.cookie.match(/(?:^|; )mypoz_sid=([^;]*)/);
    if (match?.[1]) return decodeURIComponent(match[1]);
  } catch {
    /* ignore */
  }
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const next = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return "anon";
  }
}

function storeSlug(): string | undefined {
  const m = window.location.pathname.match(/^\/store\/([^/]+)/);
  return m?.[1];
}

function selector(el: EventTarget | null): string {
  if (!(el instanceof Element)) return "unknown";
  const id = el.id ? `#${el.id}` : "";
  const cls = [...el.classList].slice(0, 2).join(".");
  return `${el.tagName.toLowerCase()}${id}${cls ? `.${cls}` : ""}`.slice(0, 80);
}

export function SessionRecorder() {
  useEffect(() => {
    const sessionId = readSessionId();
    const trail: ReplayFrame[] = [];
    const clickTimes = new Map<string, number[]>();

    function push(frame: ReplayFrame) {
      trail.push(frame);
      if (trail.length > MAX_TRAIL) trail.shift();
    }

    function post(kind: UxEventKind, message: string) {
      const slug = storeSlug();
      void fetch("/api/observability/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          kind,
          path: window.location.pathname.slice(0, 200),
          message: message.slice(0, 500),
          replay: trail.slice(-40),
          at: new Date().toISOString(),
          slug,
        }),
        keepalive: true,
      }).catch(() => undefined);
    }

    function onClick(e: MouseEvent) {
      if (e.button !== 0) return;
      const tag = selector(e.target);
      const now = Date.now();
      push({
        t: now,
        type: "click",
        path: window.location.pathname,
        tag,
        x: e.clientX,
        y: e.clientY,
      });
      const stamps = [...(clickTimes.get(tag) ?? []), now].filter(
        (t) => now - t <= 800,
      );
      clickTimes.set(tag, stamps);
      if (detectRageClick(stamps, now)) {
        post("ux_failure", `Rage click on ${tag}`);
        clickTimes.set(tag, []);
      }
    }

    function onError(ev: ErrorEvent) {
      push({
        t: Date.now(),
        type: "error",
        path: window.location.pathname,
        detail: String(ev.message || "error").slice(0, 120),
      });
      post("error", ev.message || "window error");
    }

    function onReject(ev: PromiseRejectionEvent) {
      const msg =
        ev.reason instanceof Error
          ? ev.reason.message
          : String(ev.reason || "unhandledrejection");
      push({
        t: Date.now(),
        type: "error",
        path: window.location.pathname,
        detail: msg.slice(0, 120),
      });
      post("error", msg);
    }

    window.addEventListener("click", onClick, true);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onReject);
    return () => {
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onReject);
    };
  }, []);

  return null;
}

"use client";

import { useEffect } from "react";
import {
  flushOfflineSales,
  isOfflinePosEnabled,
} from "@/lib/offline-queue";

/**
 * Optional service worker + offline sale flush.
 * Production: offline POS deferred — no localStorage sale queue unless
 * NEXT_PUBLIC_ALLOW_OFFLINE_POS=true.
 */
export function OfflineSetup() {
  useEffect(() => {
    if (!isOfflinePosEnabled()) {
      return;
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    function onOnline() {
      void flushOfflineSales();
    }
    window.addEventListener("online", onOnline);
    if (navigator.onLine) void flushOfflineSales();

    return () => window.removeEventListener("online", onOnline);
  }, []);

  return null;
}

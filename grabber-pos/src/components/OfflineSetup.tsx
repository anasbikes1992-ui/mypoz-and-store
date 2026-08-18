"use client";

import { useEffect } from "react";
import { flushOfflineSales } from "@/lib/offline-queue";

/**
 * Registers the minimal service worker and flushes the offline sale queue
 * when connectivity returns.
 */
export function OfflineSetup() {
  useEffect(() => {
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

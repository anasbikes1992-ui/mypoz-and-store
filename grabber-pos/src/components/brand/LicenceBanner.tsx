"use client";

import Link from "next/link";
import { useBrand } from "./BrandProvider";

/**
 * Shown when the workspace licence has lapsed. Selling is blocked server-side
 * at sale creation; this explains why and points at the renewal screen.
 */
export function LicenceBanner() {
  const { expired, license, loading } = useBrand();
  if (loading || !expired) return null;

  return (
    <div
      role="status" aria-live="polite"
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-danger/30 bg-danger/10 px-5 py-2 text-center text-sm text-danger"
    >
      <span>
        <b>Licence expired</b>
        {license.expiry ? ` on ${license.expiry}` : ""} — new sales are blocked
        until it is renewed.
      </span>
      <Link href="/admin" className="font-semibold underline underline-offset-2">
        Renew now
      </Link>
    </div>
  );
}

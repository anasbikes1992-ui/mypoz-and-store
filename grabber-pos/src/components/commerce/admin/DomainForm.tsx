"use client";

import { useState } from "react";
import type { StoreConfig } from "@/lib/commerce/schema";
import { VERIFY_CNAME_HINT } from "@/lib/commerce/domain-dns";
import { Button } from "@/components/ui/Button";

export function DomainForm({ initial }: { initial: StoreConfig }) {
  const [host, setHost] = useState(initial.customDomain);
  const [verifiedAt, setVerifiedAt] = useState(initial.domainVerifiedAt);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const connected = Boolean(verifiedAt && host);

  async function save() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/commerce", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customDomain: host.trim().toLowerCase(),
          domainVerifiedAt: "",
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Save failed");
      setVerifiedAt("");
      setMsg("Saved. Status stays pending until DNS verifies.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/commerce/domains/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Verification failed");
      setVerifiedAt(json.data.verifiedAt || new Date().toISOString());
      setHost(json.data.host || host);
      setMsg(
        json.data.storefrontUpdated
          ? "Connected. Custom host now maps to this store."
          : "DNS matched. If the live host still 404s, attach the domain in Vercel too.",
      );
    } catch (e) {
      setVerifiedAt("");
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-4 rounded-3xl border border-line bg-surface-1 p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Custom domain</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            connected ? "bg-tint-green/15 text-tint-green" : "bg-surface-2 text-text-dim"
          }`}
        >
          {connected ? "Connected" : "Pending"}
        </span>
      </div>
      <p className="text-sm text-text-dim">
        Create a CNAME for your hostname pointing at <span className="font-mono">{VERIFY_CNAME_HINT}</span>,
        then verify. Connected is shown only after DNS succeeds.
      </p>
      <input
        value={host}
        onChange={(e) => setHost(e.target.value)}
        placeholder="shop.yourbrand.lk"
        className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm font-mono"
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" disabled={busy} onClick={() => void save()}>
          Save
        </Button>
        <Button size="sm" disabled={busy || !host.trim()} onClick={() => void verify()}>
          Verify DNS
        </Button>
      </div>
      {verifiedAt ? (
        <p className="text-xs text-text-dim">Verified at {verifiedAt}</p>
      ) : null}
      {(msg || error) && (
        <p className={`text-sm ${error ? "text-danger" : "text-accent"}`}>{error || msg}</p>
      )}
    </section>
  );
}

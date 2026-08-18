"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { allowedFulfillmentNext, fulfillmentLabel } from "@/lib/commerce/order-lifecycle";
import type { FulfillmentStatus } from "@/lib/commerce/schema";
import { Button } from "@/components/ui/Button";

export function FulfillmentActions({
  orderId,
  current,
  fulfilment,
}: {
  orderId: string;
  current: string;
  fulfilment: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const next = allowedFulfillmentNext(current, fulfilment === "pickup" ? "pickup" : "delivery");

  async function setStatus(status: FulfillmentStatus) {
    setBusy(status);
    setError(null);
    try {
      const res = await fetch(`/api/commerce/orders/${orderId}/fulfill`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Update failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  if (next.length === 0) {
    return (
      <p className="text-sm text-text-dim">
        Status: <strong>{fulfillmentLabel(current)}</strong>
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-text-dim">
        Now: <strong className="text-text-strong">{fulfillmentLabel(current)}</strong>
      </p>
      <div className="flex flex-wrap gap-2">
        {next.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={s === "cancelled" ? "danger" : "secondary"}
            disabled={busy !== null}
            onClick={() => void setStatus(s)}
          >
            {busy === s ? "…" : fulfillmentLabel(s)}
          </Button>
        ))}
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

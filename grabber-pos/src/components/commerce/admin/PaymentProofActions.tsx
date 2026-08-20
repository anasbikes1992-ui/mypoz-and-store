"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function PaymentProofActions({
  orderId,
  status,
  proofUrl,
  note,
}: {
  orderId: string;
  status?: string;
  proofUrl?: string;
  note?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const current = status ?? "none";
  const canReview =
    current === "submitted" || current === "rejected" || (Boolean(proofUrl) && current !== "approved");

  async function act(action: "approve" | "reject") {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/commerce/orders/${orderId}/payment-proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          note: action === "reject" ? rejectNote || undefined : undefined,
        }),
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

  if (!proofUrl && current === "none") {
    return <p className="text-sm text-text-dim">No bank slip uploaded.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-text-dim">
        Proof status:{" "}
        <strong className="text-text-strong">{current}</strong>
      </p>
      {proofUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={proofUrl}
          alt="Bank transfer proof"
          className="max-h-64 max-w-full rounded-xl border border-line object-contain"
        />
      ) : null}
      {note ? (
        <p className="text-xs text-text-dim">Note: {note}</p>
      ) : null}
      {canReview && current !== "approved" ? (
        <div className="space-y-2">
          {current !== "rejected" || proofUrl ? (
            <input
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Reject reason (optional)"
              className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm"
            />
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={busy !== null}
              onClick={() => void act("approve")}
            >
              {busy === "approve" ? "…" : "Approve proof"}
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={busy !== null}
              onClick={() => void act("reject")}
            >
              {busy === "reject" ? "…" : "Reject proof"}
            </Button>
          </div>
        </div>
      ) : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

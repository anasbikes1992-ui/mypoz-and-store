"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CollectionManager } from "@/components/collections/CollectionManager";
import { formatMoney } from "@/lib/format";

type QuoteRow = {
  id: string;
  customer?: string;
  amount?: number;
  status?: string;
  date?: string;
};

export default function QuotationsPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);

  const load = useCallback(() => {
    fetch("/api/collections/quotations")
      .then((r) => r.json())
      .then((j) => j.success && setQuotes(j.data))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function convertToPos(q: QuoteRow) {
    const customer = encodeURIComponent(String(q.customer ?? ""));
    const amount = Number(q.amount) || 0;
    router.push(
      `/pos?quote=1&customer=${customer}&amount=${encodeURIComponent(String(amount))}`,
    );
  }

  return (
    <div>
      {quotes.length > 0 && (
        <div className="mx-auto max-w-5xl px-6 pt-8 pb-0">
          <p className="text-xs font-medium uppercase tracking-wide text-text-dim">
            Convert to POS
          </p>
          <div className="mt-2 space-y-2">
            {quotes.map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-between rounded-lg border border-line bg-surface-1 px-4 py-2.5 text-sm"
              >
                <div>
                  <p className="font-medium text-text-strong">
                    {q.customer || q.id}
                  </p>
                  <p className="text-xs text-text-dim">
                    {q.status ?? "draft"}
                    {q.date ? ` · ${q.date}` : ""} ·{" "}
                    {formatMoney(Number(q.amount) || 0)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => convertToPos(q)}
                  className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/10"
                >
                  Convert to POS
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <CollectionManager name="quotations" />
    </div>
  );
}

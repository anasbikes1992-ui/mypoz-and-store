import { formatMoneyCompact } from "@/lib/format";
import type { TodayChannelSnapshot } from "@/lib/commerce/channel-report";

/** Phase A7 — thin owner strip. No chart zoo. */
export function TodayChannelStrip({
  snapshot,
}: {
  snapshot: TodayChannelSnapshot;
}) {
  const cells: { label: string; value: number }[] = [
    { label: "POS", value: snapshot.pos },
    { label: "WEB", value: snapshot.web },
    { label: "WHATSAPP", value: snapshot.whatsapp },
    { label: "TOTAL", value: snapshot.total },
  ];

  return (
    <section
      aria-label="Today by channel"
      className="rounded-2xl border border-line bg-surface-1 px-4 py-4 sm:px-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-dim">
          Today
        </h2>
        <p className="text-xs text-text-dim">
          {formatMoneyCompact(snapshot.revenue)} revenue · same ledger
        </p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cells.map((c) => (
          <div key={c.label} className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-dim">
              {c.label}
            </p>
            <p className="mt-0.5 font-mono text-2xl font-semibold tabular-nums text-text-strong">
              {c.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

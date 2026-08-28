import Link from "next/link";

const PROMPTS = [
  {
    label: "Today's sales",
    agent: "owner-retail",
    prompt: "Summarize today's sales by channel and payment method.",
  },
  {
    label: "Open COD orders",
    agent: "owner-orders",
    prompt: "List open COD and online orders that still need fulfillment.",
  },
  {
    label: "Low stock",
    agent: "owner-inventory",
    prompt: "Which products are low on stock and need reordering?",
  },
  {
    label: "Storefront health",
    agent: "owner-storefront",
    prompt: "Is our storefront published and ready for customers?",
  },
] as const;

export function JarvisQuickPrompts() {
  return (
    <section className="rounded-2xl border border-line bg-surface-1 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-text-strong">Ask Jarvis</h2>
        <Link href="/assistant" className="text-xs text-accent hover:underline">
          Open assistant
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {PROMPTS.map((p) => (
          <Link
            key={p.label}
            href={`/assistant?agent=${encodeURIComponent(p.agent)}&q=${encodeURIComponent(p.prompt)}`}
            className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-text-body transition hover:border-accent hover:text-accent"
          >
            {p.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

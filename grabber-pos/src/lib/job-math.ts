/** Pure job SLA helpers — safe for Vitest without server imports. */

export function defaultDueAt(fromIso: string, slaDays: number): string {
  const from = new Date(fromIso);
  const d = new Date(from.getTime());
  d.setDate(d.getDate() + Math.max(1, Math.floor(slaDays) || 1));
  return d.toISOString();
}

export function daysUntilDue(
  dueAt: string | null | undefined,
  now = Date.now(),
): number | null {
  if (!dueAt) return null;
  const t = new Date(dueAt).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - now) / 86_400_000);
}

export function isJobOverdue(
  dueAt: string | null | undefined,
  status: string,
  now = Date.now(),
): boolean {
  if (status === "collected" || status === "ready") return false;
  const days = daysUntilDue(dueAt, now);
  return days !== null && days < 0;
}

export function jobNotifyMessage(opts: {
  businessName: string;
  jobId: string;
  customer: string;
  subject: string;
  status: string;
  type: "repair" | "service";
}): string {
  const label = opts.type === "repair" ? "repair" : "service job";
  const who = opts.customer.trim() || "Customer";
  const item = opts.subject.trim() || "your item";
  const status = opts.status.replace("-", " ");
  return (
    `Hi ${who}, this is ${opts.businessName}. ` +
    `Your ${label} (${opts.jobId}) for ${item} is now: ${status}. ` +
    `Reply to this chat if you have questions.`
  );
}

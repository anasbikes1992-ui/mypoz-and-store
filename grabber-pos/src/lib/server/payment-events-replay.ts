import "server-only";
import { createServiceSupabase } from "@/lib/supabase/server";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { applyGatewayWebhook } from "@/lib/server/gateway-payments-store";
import type { PayStatus } from "@/lib/payments/gateways/types";

export async function replayUnprocessedPaymentEvents(limit = 50): Promise<{
  attempted: number;
  applied: number;
  failed: string[];
}> {
  if (!isSupabaseEnabled || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { attempted: 0, applied: 0, failed: ["DEPENDENCY_UNAVAILABLE"] };
  }

  const db = createServiceSupabase();
  const { data, error } = await (db as any)
    .from("payment_events")
    .select(
      "provider, provider_event_id, status, amount_minor, provider_transaction_id, payload, payment_intents(reference)",
    )
    .is("processed_at", null)
    .order("received_at", { ascending: true })
    .limit(limit);

  if (error) return { attempted: 0, applied: 0, failed: [error.message] };

  const rows = (data ?? []) as Array<{
    provider: string;
    provider_event_id: string;
    status: string;
    amount_minor: number | null;
    provider_transaction_id: string | null;
    payload: Record<string, unknown> | null;
    payment_intents: { reference: string } | null;
  }>;

  let applied = 0;
  const failed: string[] = [];

  for (const row of rows) {
    const reference = row.payment_intents?.reference;
    if (!reference) {
      failed.push(`missing reference for ${row.provider_event_id}`);
      continue;
    }
    const result = await applyGatewayWebhook({
      reference,
      status: row.status.toUpperCase() as PayStatus,
      provider: row.provider,
      providerRef: row.provider_transaction_id ?? undefined,
      amountMinor: row.amount_minor ?? undefined,
      providerEventId: row.provider_event_id,
      rawPayload: row.payload ?? {},
    });
    if (result.ok) applied += 1;
    else failed.push(`${reference}: ${result.reason}`);
  }

  return { attempted: rows.length, applied, failed };
}

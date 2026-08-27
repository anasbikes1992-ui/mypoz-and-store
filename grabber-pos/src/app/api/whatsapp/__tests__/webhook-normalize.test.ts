import { describe, expect, it } from "vitest";

/** Mirror of webhook normalize — keep in sync with route.ts */
function normalizeWebhookBody(body: {
  entry?: unknown[];
  field?: string;
  value?: unknown;
  object?: string;
}) {
  if (Array.isArray(body.entry) && body.entry.length > 0) return body;
  if (body.field && body.value) {
    return {
      object: body.object ?? "whatsapp_business_account",
      entry: [
        {
          id: "meta-sample",
          changes: [{ field: body.field, value: body.value }],
        },
      ],
    };
  }
  return body;
}

describe("WhatsApp webhook body normalize", () => {
  it("wraps Meta Send-to-My-Server field samples", () => {
    const raw = {
      field: "messages",
      value: {
        metadata: { phone_number_id: "101779492851300" },
        messages: [{ from: "94771234567", text: { body: "hi" }, type: "text" }],
      },
    };
    const next = normalizeWebhookBody(raw) as {
      entry: { changes: { field: string; value: unknown }[] }[];
    };
    expect(next.entry?.[0]?.changes?.[0]?.field).toBe("messages");
  });
});

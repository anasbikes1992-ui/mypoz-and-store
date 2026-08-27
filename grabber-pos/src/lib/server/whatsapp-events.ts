import "server-only";
import {
  eventFromFulfillmentStatus,
  templateForEvent,
  type WaEventKey,
} from "@/lib/whatsapp/event-automations";
import {
  isOptedOut,
  readWhatsAppSettings,
} from "@/lib/server/whatsapp-inbox-store";
import {
  sendWhatsAppText,
  WhatsAppNotConfiguredError,
} from "@/lib/server/whatsapp";
import { resolveMetaAccessToken } from "@/lib/whatsapp/phone-number-id";
import { normalizeLkPhone } from "@/lib/whatsapp/phone";

function digits(to: string): string {
  return to.replace(/\D/g, "");
}

/**
 * Best-effort outbound automation. Never throws to callers (commerce must not block).
 */
export async function dispatchWhatsAppEvent(opts: {
  event: WaEventKey;
  to: string;
  vars?: Record<string, string>;
  phoneNumberId?: string;
  orgId?: string;
  /** Skip enabledEvents check (e.g. OPT_OUT_ACK). */
  force?: boolean;
}): Promise<{ sent: boolean; reason?: string }> {
  const to = opts.to?.trim();
  if (!to) return { sent: false, reason: "no_recipient" };

  try {
    const settings = await readWhatsAppSettings(opts.phoneNumberId, opts.orgId);
    if (!opts.force && !settings.enabledEvents[opts.event]) {
      return { sent: false, reason: "event_disabled" };
    }

    const phoneKey =
      normalizeLkPhone(to)?.replace(/\D/g, "") || digits(to);
    if (
      opts.event !== "OPT_OUT_ACK" &&
      (await isOptedOut(phoneKey, opts.phoneNumberId, opts.orgId))
    ) {
      return { sent: false, reason: "opted_out" };
    }

    const body = templateForEvent(opts.event, {
      businessName: "",
      ...opts.vars,
    });

    const token = resolveMetaAccessToken(settings.accessToken) || undefined;
    const phoneNumberId =
      opts.phoneNumberId ||
      settings.phoneNumberId ||
      process.env.WHATSAPP_PHONE_NUMBER_ID ||
      undefined;

    await sendWhatsAppText({
      to: digits(to),
      body,
      token: token || undefined,
      phoneNumberId,
    });
    return { sent: true };
  } catch (err) {
    if (err instanceof WhatsAppNotConfiguredError) {
      return { sent: false, reason: "not_configured" };
    }
    console.error("[wa-event]", opts.event, err);
    return { sent: false, reason: "send_failed" };
  }
}

export async function dispatchFulfillmentWhatsApp(opts: {
  to: string;
  receipt: string;
  status: string;
  phoneNumberId?: string;
  orgId?: string;
  customerName?: string;
  businessName?: string;
}): Promise<void> {
  const event = eventFromFulfillmentStatus(opts.status);
  const vars = {
    receipt: opts.receipt,
    customerName: opts.customerName || "",
    businessName: opts.businessName || "",
  };
  if (!event) {
    // Unknown board status — still notify with a ready-style ping when enabled.
    await dispatchWhatsAppEvent({
      event: "ORDER_READY",
      to: opts.to,
      phoneNumberId: opts.phoneNumberId,
      orgId: opts.orgId,
      vars: { ...vars, fulfil: opts.status },
    });
    return;
  }
  await dispatchWhatsAppEvent({
    event,
    to: opts.to,
    phoneNumberId: opts.phoneNumberId,
    orgId: opts.orgId,
    vars,
  });
}

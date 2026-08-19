import "server-only";

/**
 * Resend email client — fail-soft so a missing API key never crashes the app.
 * Set RESEND_API_KEY in Vercel environment variables.
 * Set RESEND_FROM_EMAIL to your verified sender, e.g. "MyPoz <noreply@mypoz.lk>"
 */

const API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM = process.env.RESEND_FROM_EMAIL ?? "MyPoz <noreply@mypoz.lk>";
const REPLY_TO = process.env.RESEND_REPLY_TO ?? "support@mypoz.lk";

export interface SendEmailOpts {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
}

export interface SendEmailResult {
  id?: string;
  error?: string;
}

export async function sendEmail(opts: SendEmailOpts): Promise<SendEmailResult> {
  if (!API_KEY) {
    // Graceful no-op: log and continue so dev/staging works without email.
    console.warn("[email] RESEND_API_KEY not set — skipping email to", opts.to);
    return { id: "noop" };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(API_KEY);

    const { data, error } = await resend.emails.send({
      from: FROM,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      replyTo: opts.replyTo ?? REPLY_TO,
      tags: opts.tags,
    });

    if (error) {
      console.error("[email] Resend error:", error);
      return { error: error.message };
    }
    return { id: data?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "email send failed";
    console.error("[email] Exception:", msg);
    return { error: msg };
  }
}

export function isEmailConfigured(): boolean {
  return Boolean(API_KEY);
}

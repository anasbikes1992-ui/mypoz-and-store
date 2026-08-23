import "server-only";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { createServiceSupabase } from "@/lib/supabase/server";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { passwordResetEmail } from "@/lib/email/templates/password-reset";

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://mypoz-and-store-ui.vercel.app"
  ).replace(/\/$/, "");
}

function authAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service role is required for password reset");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function brandingForUserId(
  userId: string,
  email: string,
): Promise<{ businessName: string; accentColor: string; customerName: string }> {
  const defaults = {
    businessName: "MyPoz",
    accentColor: "#2563eb",
    customerName: email.split("@")[0] || "there",
  };
  if (!isSupabaseEnabled || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return defaults;
  }
  try {
    const db = createServiceSupabase();
    const { data: profile } = await db
      .from("profiles")
      .select("full_name, org_id")
      .eq("id", userId)
      .maybeSingle();
    if (!profile?.org_id) return defaults;

    const { data: tenantDoc } = await db
      .from("app_documents")
      .select("data")
      .eq("org_id", profile.org_id)
      .eq("key", "tenant")
      .maybeSingle();
    const brand = (tenantDoc?.data as { brand?: { businessName?: string; accentColor?: string } } | null)?.brand;

    const { data: settingsDoc } = await db
      .from("app_documents")
      .select("data")
      .eq("org_id", profile.org_id)
      .eq("key", "settings")
      .maybeSingle();
    const settingsName = (settingsDoc?.data as { businessName?: string } | null)?.businessName;

    return {
      businessName:
        settingsName || brand?.businessName || defaults.businessName,
      accentColor: brand?.accentColor || defaults.accentColor,
      customerName: String(profile.full_name ?? defaults.customerName),
    };
  } catch {
    return defaults;
  }
}

/**
 * Branded password reset via Resend + Supabase recovery link.
 * Always returns success to the caller when the email format is valid
 * (avoid account enumeration).
 */
export async function sendBrandedPasswordReset(rawEmail: string): Promise<{
  ok: true;
  emailed: boolean;
}> {
  const email = rawEmail.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: true, emailed: false };
  }
  if (!isSupabaseEnabled || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Password reset requires Supabase");
  }
  if (!isEmailConfigured()) {
    throw new Error(
      "Email is not configured (RESEND_API_KEY). Contact support for a password reset.",
    );
  }

  const admin = authAdmin();
  const redirectTo = `${appUrl()}/update-password`;

  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });
  if (error) {
    if (/user not found|not found/i.test(error.message)) {
      return { ok: true, emailed: false };
    }
    throw new Error(error.message);
  }

  const actionLink =
    data.properties?.action_link ||
    (data as { action_link?: string }).action_link ||
    "";
  if (!actionLink) {
    return { ok: true, emailed: false };
  }

  const userId = data.user?.id;
  const { businessName, accentColor, customerName } = userId
    ? await brandingForUserId(userId, email)
    : {
        businessName: "MyPoz",
        accentColor: "#2563eb",
        customerName: email.split("@")[0] || "there",
      };

  const mail = passwordResetEmail({
    businessName,
    accentColor,
    customerName,
    resetUrl: actionLink,
    expiresInMinutes: 60,
  });
  const sent = await sendEmail({
    to: email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    tags: [
      { name: "template", value: "password-reset" },
      { name: "source", value: "forgot-password" },
    ],
  });
  const emailed = !sent.error && sent.id !== "noop";
  if (!emailed && sent.error) {
    throw new Error(sent.error);
  }

  return { ok: true, emailed };
}

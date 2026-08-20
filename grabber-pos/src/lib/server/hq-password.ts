import "server-only";
import { randomBytes } from "crypto";
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
    throw new Error("Supabase service role is required for password ops");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function generateTempPassword(bytes = 9): string {
  // URL-safe, no ambiguous chars; ~12 chars
  return randomBytes(bytes)
    .toString("base64url")
    .replace(/[^a-zA-Z0-9]/g, "x")
    .slice(0, 12);
}

async function assertUserInOrg(
  orgId: string,
  userId: string,
): Promise<{ fullName: string; role: string }> {
  const db = createServiceSupabase();
  const { data, error } = await db
    .from("profiles")
    .select("id, full_name, role, org_id")
    .eq("id", userId)
    .eq("org_id", orgId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("User is not a member of this tenant");
  return {
    fullName: String(data.full_name ?? ""),
    role: String(data.role ?? "cashier"),
  };
}

export async function resolveAuthEmails(
  userIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (
    !isSupabaseEnabled ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    userIds.length === 0
  ) {
    return map;
  }
  const admin = authAdmin();
  // Prefer getUserById — avoids scanning all users for small org teams.
  await Promise.all(
    userIds.map(async (id) => {
      try {
        const { data, error } = await admin.auth.admin.getUserById(id);
        if (!error && data.user?.email) {
          map.set(id, data.user.email.toLowerCase());
        }
      } catch {
        // skip
      }
    }),
  );
  return map;
}

export async function hqSetUserPassword(opts: {
  orgId: string;
  userId: string;
  password?: string;
}): Promise<{ email: string; temporaryPassword: string; fullName: string }> {
  if (!isSupabaseEnabled || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Service role required");
  }
  const profile = await assertUserInOrg(opts.orgId, opts.userId);
  const password =
    opts.password && opts.password.length >= 8
      ? opts.password
      : generateTempPassword();
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const admin = authAdmin();
  const { data: userData, error: getErr } = await admin.auth.admin.getUserById(
    opts.userId,
  );
  if (getErr || !userData.user) {
    throw new Error(getErr?.message ?? "Auth user not found");
  }
  const email = (userData.user.email ?? "").toLowerCase();
  if (!email) throw new Error("User has no email on the auth account");

  const { error } = await admin.auth.admin.updateUserById(opts.userId, {
    password,
    email_confirm: true,
  });
  if (error) throw new Error(error.message);

  return {
    email,
    temporaryPassword: password,
    fullName: profile.fullName || email,
  };
}

export async function hqSendPasswordReset(opts: {
  orgId: string;
  userId: string;
  businessName?: string;
  accentColor?: string;
}): Promise<{
  email: string;
  emailed: boolean;
  resetUrl?: string;
  fullName: string;
}> {
  if (!isSupabaseEnabled || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Service role required");
  }
  const profile = await assertUserInOrg(opts.orgId, opts.userId);
  const admin = authAdmin();
  const { data: userData, error: getErr } = await admin.auth.admin.getUserById(
    opts.userId,
  );
  if (getErr || !userData.user?.email) {
    throw new Error(getErr?.message ?? "Auth user email not found");
  }
  const email = userData.user.email.toLowerCase();
  const redirectTo = `${appUrl()}/login`;

  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });
  if (error) throw new Error(error.message);

  const actionLink =
    data.properties?.action_link ||
    (data as { action_link?: string }).action_link ||
    "";
  if (!actionLink) throw new Error("Could not generate recovery link");

  const fullName = profile.fullName || email.split("@")[0] || "there";
  let emailed = false;
  if (isEmailConfigured()) {
    const mail = passwordResetEmail({
      businessName: opts.businessName || "MyPoz",
      accentColor: opts.accentColor,
      customerName: fullName,
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
        { name: "source", value: "hq" },
      ],
    });
    emailed = !sent.error && sent.id !== "noop";
  }

  return {
    email,
    emailed,
    // Return link when email is not configured so HQ can copy it securely once.
    resetUrl: emailed ? undefined : actionLink,
    fullName,
  };
}

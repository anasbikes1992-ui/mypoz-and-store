import { NextResponse } from "next/server";
import { isSupabaseEnabled, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";
import { getRepository } from "@/lib/server/repositories";
import { readTenant } from "@/lib/server/tenant-store";
import { isLicenseExpired } from "@/lib/plans";
import { isWhatsAppConfigured } from "@/lib/server/whatsapp";
import { isDefaultSessionSecret } from "@/lib/server/session";

/**
 * Liveness + readiness probe. Fail-closed for half-configured Supabase and
 * default session secrets in production.
 */
export async function GET() {
  const halfConfigured =
    Boolean(SUPABASE_URL) !== Boolean(SUPABASE_ANON_KEY) ||
    (Boolean(SUPABASE_URL) && !SUPABASE_ANON_KEY) ||
    (!SUPABASE_URL && Boolean(SUPABASE_ANON_KEY));

  const backend = isSupabaseEnabled ? "supabase" : "local";
  let ready = false;
  let detail: string | null = null;

  if (halfConfigured) {
    detail = "Half-configured Supabase env — set both NEXT_PUBLIC_SUPABASE_URL and ANON_KEY";
  } else if (
    process.env.NODE_ENV === "production" &&
    !isSupabaseEnabled &&
    isDefaultSessionSecret()
  ) {
    detail = "POS_SESSION_SECRET must be set in production demo mode";
  } else if (
    isSupabaseEnabled &&
    process.env.NODE_ENV === "production" &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    detail = "SUPABASE_SERVICE_ROLE_KEY required for gateway payment ledger in production";
  } else {
    try {
      const repo = await getRepository();
      await repo.salesStats();
      ready = true;
    } catch (error) {
      detail = error instanceof Error ? error.message : "unknown";
    }
  }

  let licence: {
    plan: string;
    expiry: string;
    expired: boolean;
  } | null = null;
  let licenceOk = false;
  try {
    const tenant = await readTenant();
    const expired = isLicenseExpired(tenant.license.expiry);
    licence = {
      plan: tenant.license.plan,
      expiry: tenant.license.expiry,
      expired,
    };
    licenceOk = !expired;
  } catch {
    licence = null;
    licenceOk = false;
  }

  const printers = {
    kot: Boolean(process.env.PRINTER_KOT_IP),
    bot: Boolean(process.env.PRINTER_BOT_IP),
    receipt: Boolean(process.env.PRINTER_RECEIPT_IP),
  };
  const hasPrinterEnv = printers.kot || printers.bot || printers.receipt;
  const hasWhatsapp = isWhatsAppConfigured();

  return NextResponse.json(
    {
      status: ready ? "ok" : "degraded",
      ready,
      backend,
      detail,
      halfConfigured,
      gatewayLedger: isSupabaseEnabled
        ? process.env.SUPABASE_SERVICE_ROLE_KEY
          ? "service-role"
          : "missing-service-role"
        : "local-json",
      licence,
      licenceOk,
      printers,
      hasPrinterEnv,
      whatsapp: hasWhatsapp,
      hasWhatsapp,
      version: process.env.npm_package_version ?? "0.0.0",
      time: new Date().toISOString(),
    },
    { status: ready ? 200 : 503 },
  );
}

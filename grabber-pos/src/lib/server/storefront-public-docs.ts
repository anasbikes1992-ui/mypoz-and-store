import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseEnabled } from "@/lib/supabase/config";

export type PublicStorefrontBundle = {
  orgId: string;
  slug: string;
  commerce: Record<string, unknown>;
  website: Record<string, unknown>;
  settings: Record<string, unknown>;
};

function anonClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * One RPC round-trip per request for anonymous (and custom-domain) storefronts.
 */
export const readPublicStorefrontBundle = cache(
  async (): Promise<PublicStorefrontBundle | null> => {
    if (!isSupabaseEnabled) return null;
    let slug = "";
    let host = "";
    try {
      const h = await headers();
      slug = h.get("x-mypoz-slug") ?? "";
      host = h.get("x-mypoz-host") ?? "";
    } catch {
      return null;
    }
    if (!slug && !host) return null;

    try {
      const { data, error } = await anonClient().rpc("storefront_documents", {
        p_host: host,
        p_slug: slug || null,
      });
      if (error || !data || typeof data !== "object") return null;
      const row = data as Record<string, unknown>;
      return {
        orgId: String(row.orgId ?? ""),
        slug: String(row.slug ?? slug),
        commerce:
          row.commerce && typeof row.commerce === "object"
            ? (row.commerce as Record<string, unknown>)
            : {},
        website:
          row.website && typeof row.website === "object"
            ? (row.website as Record<string, unknown>)
            : {},
        settings:
          row.settings && typeof row.settings === "object"
            ? (row.settings as Record<string, unknown>)
            : {},
      };
    } catch {
      return null;
    }
  },
);

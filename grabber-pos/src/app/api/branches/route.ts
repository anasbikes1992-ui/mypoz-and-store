import { NextResponse } from "next/server";
import { requireTenantSession } from "@/lib/server/auth-session";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseEnabled } from "@/lib/supabase/config";

export async function GET() {
  const auth = await requireTenantSession();
  if (!auth.ok) return auth.response;

  if (!isSupabaseEnabled) {
    return NextResponse.json({
      success: true,
      data: [{ id: "main", name: "Main", code: "MAIN" }],
      error: null,
    });
  }

  const db = await createServerSupabase();
  const { data, error } = await db
    .from("branches")
    .select("id, name, code")
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) {
    return NextResponse.json(
      { success: false, data: null, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data: data ?? [], error: null });
}

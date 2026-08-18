import { NextResponse } from "next/server";
import { dumpSignedInOrg, jsonDownload } from "@/lib/server/backup-export";

export async function GET() {
  try {
    const data = await dumpSignedInOrg();
    const stamp = new Date().toISOString().slice(0, 10);
    return jsonDownload(`mypoz-tenant-${stamp}.json`, data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backup failed";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json(
      { success: false, data: null, error: message },
      { status },
    );
  }
}

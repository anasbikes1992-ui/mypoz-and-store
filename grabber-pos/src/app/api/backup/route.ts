import { NextResponse } from "next/server";
import { readSettings } from "@/lib/server/settings-store";
import { getRepository } from "@/lib/server/repositories";
import { listCollection } from "@/lib/server/collection-store";
import { COLLECTIONS } from "@/lib/collections";

export async function GET() {
  try {
    const settings = await readSettings();
    const repo = await getRepository();
    const sales = await repo.listSales(500);
    const timestamp = new Date().toISOString();

    const collectionsSummary: Record<string, number> = {};
    for (const name of Object.keys(COLLECTIONS)) {
      try {
        collectionsSummary[name] = (await listCollection(name)).length;
      } catch {
        collectionsSummary[name] = 0;
      }
    }

    const data = {
      timestamp,
      exportedAt: timestamp,
      settings,
      sales,
      collectionsSummary,
    };

    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify({ success: true, data, error: null }, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="grabber-backup-${stamp}.json"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Backup failed",
      },
      { status: 500 },
    );
  }
}

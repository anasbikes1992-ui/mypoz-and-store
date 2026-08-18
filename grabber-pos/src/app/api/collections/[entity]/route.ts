import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/collections";
import { listCollection, createEntity } from "@/lib/server/collection-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ entity: string }> },
) {
  const { entity } = await params;
  const config = getCollection(entity);
  if (!config) {
    return NextResponse.json(
      { success: false, data: null, error: "Unknown collection" },
      { status: 404 },
    );
  }
  const items = await listCollection(entity);
  return NextResponse.json({ success: true, data: items, error: null });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ entity: string }> },
) {
  const { entity } = await params;
  const config = getCollection(entity);
  if (!config) {
    return NextResponse.json(
      { success: false, data: null, error: "Unknown collection" },
      { status: 404 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = config.schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const entityRecord = await createEntity(
    entity,
    parsed.data as Record<string, unknown>,
  );
  return NextResponse.json({ success: true, data: entityRecord, error: null });
}

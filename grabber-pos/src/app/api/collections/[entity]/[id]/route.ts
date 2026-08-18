import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/collections";
import { updateEntity, deleteEntity } from "@/lib/server/collection-store";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string }> },
) {
  const { entity, id } = await params;
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

  const updated = await updateEntity(
    entity,
    id,
    parsed.data as Record<string, unknown>,
  );
  if (!updated) {
    return NextResponse.json(
      { success: false, data: null, error: "Not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, data: updated, error: null });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string }> },
) {
  const { entity, id } = await params;
  if (!getCollection(entity)) {
    return NextResponse.json(
      { success: false, data: null, error: "Unknown collection" },
      { status: 404 },
    );
  }
  const ok = await deleteEntity(entity, id);
  return NextResponse.json(
    { success: ok, data: null, error: ok ? null : "Not found" },
    { status: ok ? 200 : 404 },
  );
}

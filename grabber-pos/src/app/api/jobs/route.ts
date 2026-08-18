import { NextRequest, NextResponse } from "next/server";
import { listJobs, createJob, jobTotals } from "@/lib/server/job-store";
import type { JobType } from "@/lib/server/job-store";

function isType(t: string | null): t is JobType {
  return t === "repair" || t === "service";
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");
  if (!isType(type)) {
    return NextResponse.json(
      { success: false, data: null, error: "type must be repair or service" },
      { status: 400 },
    );
  }
  const jobs = await listJobs(type);
  return NextResponse.json({
    success: true,
    data: jobs.map((j) => ({ ...j, total: jobTotals(j).total })),
    error: null,
  });
}

export async function POST(req: NextRequest) {
  let body: { type?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  if (!isType(body.type ?? null)) {
    return NextResponse.json(
      { success: false, data: null, error: "type must be repair or service" },
      { status: 400 },
    );
  }
  const job = await createJob(body.type as JobType);
  return NextResponse.json({ success: true, data: job, error: null });
}

import { NextResponse } from "next/server";
import { getRepository } from "@/lib/server/repositories";
import { readSettings } from "@/lib/server/settings-store";
import { listAgreements, hpBalance } from "@/lib/server/hp-store";
import { listJobs } from "@/lib/server/job-store";
import {
  buildHpAlerts,
  buildJobAlerts,
  buildProductAlerts,
} from "@/lib/operational-alerts";

export async function GET() {
  const repo = await getRepository();
  const page = await repo.queryProducts({ pageSize: 500 });
  const productAlerts = buildProductAlerts(page.items);

  const settings = await readSettings();
  const hpRows = (await listAgreements()).map((a) => ({
    id: a.id,
    customer: a.customer,
    item: a.item,
    status: a.status,
    payments: a.payments,
    balance: hpBalance(a).balance,
    createdAt: a.createdAt,
  }));
  const jobRows = [
    ...(await listJobs("repair")),
    ...(await listJobs("service")),
  ].map((j) => ({
    id: j.id,
    customer: j.customer,
    subject: j.subject,
    status: j.status,
    dueAt: j.dueAt ?? null,
  }));

  const operational = [
    ...buildHpAlerts(hpRows, settings.hpDueDayOfMonth),
    ...buildJobAlerts(jobRows),
  ];

  return NextResponse.json({
    success: true,
    data: {
      ...productAlerts,
      operational,
      counts: {
        ...productAlerts.counts,
        operational: operational.length,
      },
    },
    error: null,
  });
}

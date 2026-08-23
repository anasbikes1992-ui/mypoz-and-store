import "server-only";
import { randomUUID } from "crypto";
import { defaultDueAt } from "@/lib/job-math";
import { findById } from "./product-repo";
import { recordStore } from "./persistence/record-store";
import { readSettings } from "./settings-store";

/**
 * Job-workflow engine shared by Repair and Vehicle Service. A job has parts
 * (catalog products) and labour (custom charges), a subject (item/vehicle) and
 * a status. Collecting settles it into a sale.
 */
export type JobType = "repair" | "service";
/** `in-progress` kept for backward compatibility with existing jobs. */
export type JobStatus =
  | "received"
  | "diagnose"
  | "in-progress"
  | "ready"
  | "collected";

export interface JobPart {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}
export interface JobLabour {
  id: string;
  description: string;
  amount: number;
}
export interface Job {
  id: string;
  type: JobType;
  customer: string;
  phone: string;
  subject: string;
  issue: string;
  status: JobStatus;
  parts: JobPart[];
  labour: JobLabour[];
  /** Prepaid deposit credited at settle via finalDiscount. */
  deposit: number;
  diagnosis: string;
  warrantyNote: string;
  /** SLA target — overdue when past and not ready/collected. */
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const store = recordStore<Job>({
  collection: "service-jobs",
  file: "jobs.json",
});

export function jobTotals(job: Job) {
  const parts = job.parts.reduce((s, p) => s + p.unitPrice * p.quantity, 0);
  const labour = job.labour.reduce((s, l) => s + l.amount, 0);
  return { parts, labour, total: parts + labour };
}

export async function listJobs(type: JobType): Promise<Job[]> {
  return (await store.list())
    .filter((j) => j.type === type)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getJob(id: string): Promise<Job | null> {
  return store.get(id);
}

export async function createJob(type: JobType): Promise<Job> {
  const settings = await readSettings();
  const createdAt = new Date().toISOString();
  const job: Job = {
    id: (type === "repair" ? "RJ-" : "SJ-") + randomUUID().slice(0, 8),
    type,
    customer: "",
    phone: "",
    subject: "",
    issue: "",
    status: "received",
    parts: [],
    labour: [],
    deposit: 0,
    diagnosis: "",
    warrantyNote: "",
    dueAt: defaultDueAt(createdAt, settings.jobSlaDays),
    createdAt,
    updatedAt: createdAt,
  };
  return store.put(job);
}

async function mutate(id: string, fn: (j: Job) => Job): Promise<Job | null> {
  const current = await store.get(id);
  if (!current) return null;
  return store.put({ ...fn(current), updatedAt: new Date().toISOString() });
}

export async function updateMeta(
  id: string,
  meta: Partial<
    Pick<
      Job,
      | "customer"
      | "phone"
      | "subject"
      | "issue"
      | "status"
      | "deposit"
      | "diagnosis"
      | "warrantyNote"
      | "dueAt"
    >
  >,
): Promise<Job | null> {
  return mutate(id, (j) => ({
    ...j,
    ...meta,
    deposit:
      meta.deposit != null ? Math.max(0, Number(meta.deposit) || 0) : j.deposit ?? 0,
    diagnosis: meta.diagnosis != null ? String(meta.diagnosis) : j.diagnosis ?? "",
    warrantyNote:
      meta.warrantyNote != null
        ? String(meta.warrantyNote)
        : j.warrantyNote ?? "",
    dueAt:
      meta.dueAt === null
        ? null
        : meta.dueAt != null
          ? String(meta.dueAt)
          : j.dueAt ?? null,
  }));
}

export async function addPart(
  id: string,
  productId: string,
): Promise<Job | null> {
  const product = findById(productId);
  if (!product) throw new Error(`Unknown product: ${productId}`);
  return mutate(id, (j) => {
    const existing = j.parts.find((p) => p.productId === productId);
    const parts = existing
      ? j.parts.map((p) =>
          p.productId === productId ? { ...p, quantity: p.quantity + 1 } : p,
        )
      : [
          ...j.parts,
          {
            productId,
            name: product.name,
            unitPrice: product.salePrice,
            quantity: 1,
          },
        ];
    return { ...j, parts };
  });
}

export async function setPartQty(
  id: string,
  productId: string,
  quantity: number,
): Promise<Job | null> {
  return mutate(id, (j) => ({
    ...j,
    parts:
      quantity <= 0
        ? j.parts.filter((p) => p.productId !== productId)
        : j.parts.map((p) =>
            p.productId === productId ? { ...p, quantity } : p,
          ),
  }));
}

export async function addLabour(
  id: string,
  description: string,
  amount: number,
): Promise<Job | null> {
  return mutate(id, (j) => ({
    ...j,
    labour: [
      ...j.labour,
      { id: "L-" + randomUUID().slice(0, 6), description, amount },
    ],
  }));
}

export async function removeLabour(
  id: string,
  labourId: string,
): Promise<Job | null> {
  return mutate(id, (j) => ({
    ...j,
    labour: j.labour.filter((l) => l.id !== labourId),
  }));
}

export async function removeJob(id: string): Promise<void> {
  await store.remove(id);
}

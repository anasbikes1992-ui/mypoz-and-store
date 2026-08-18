import "server-only";
import { randomUUID } from "crypto";
import { findById } from "./product-repo";
import { recordStore } from "./persistence/record-store";

/**
 * Job-workflow engine shared by Repair and Vehicle Service. A job has parts
 * (catalog products) and labour (custom charges), a subject (item/vehicle) and
 * a status. Collecting settles it into a sale.
 */
export type JobType = "repair" | "service";
export type JobStatus = "received" | "in-progress" | "ready" | "collected";

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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
  meta: Partial<Pick<Job, "customer" | "phone" | "subject" | "issue" | "status">>,
): Promise<Job | null> {
  return mutate(id, (j) => ({ ...j, ...meta }));
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

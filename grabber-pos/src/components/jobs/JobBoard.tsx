"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { formatMoney, formatDate } from "@/lib/format";
import { daysUntilDue, isJobOverdue } from "@/lib/job-math";
import { ModuleHeader } from "@/components/shell/ModuleHeader";
import {
  JOB_CONFIG,
  JOB_STATUS_TONE,
  JOB_STATUSES,
  type JobType,
} from "@/lib/jobs-config";

interface JobRow {
  id: string;
  customer: string;
  subject: string;
  status: string;
  total: number;
  dueAt?: string | null;
}

export function JobBoard({ type }: { type: JobType }) {
  const cfg = JOB_CONFIG[type];
  const router = useRouter();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("open");

  useEffect(() => {
    fetch(`/api/jobs?type=${type}`)
      .then((r) => r.json())
      .then((j) => j.success && setJobs(j.data))
      .finally(() => setLoading(false));
  }, [type]);

  const visible = useMemo(() => {
    if (statusFilter === "all") return jobs;
    if (statusFilter === "open") {
      return jobs.filter((j) => j.status !== "collected");
    }
    if (statusFilter === "overdue") {
      return jobs.filter((j) => isJobOverdue(j.dueAt, j.status));
    }
    return jobs.filter((j) => j.status === statusFilter);
  }, [jobs, statusFilter]);

  async function newJob() {
    setCreating(true);
    const j = await (
      await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      })
    ).json();
    if (j.success) router.push(`${cfg.basePath}/${j.data.id}`);
    else setCreating(false);
  }

  const filters = [
    { key: "open", label: "Open" },
    { key: "overdue", label: "Overdue" },
    ...JOB_STATUSES.map((s) => ({ key: s, label: s.replace("-", " ") })),
    { key: "all", label: "All" },
  ] as const;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <ModuleHeader
        title={cfg.title}
        subtitle="Jobs with SLA tracking and customer updates"
        actions={
          <button
            onClick={newJob}
            disabled={creating}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition hover:bg-accent-strong disabled:opacity-50"
          >
            {creating ? "Creating…" : `+ ${cfg.newVerb}`}
          </button>
        }
      />

      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setStatusFilter(f.key)}
            className={`rounded-lg border px-3 py-1.5 text-sm capitalize transition ${
              statusFilter === f.key
                ? "border-accent bg-accent/10 text-accent"
                : "border-line text-text-dim hover:border-accent hover:text-accent"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-10 text-center text-sm text-text-dim">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-line p-10 text-center text-sm text-text-dim">
          No jobs in this view. Start a new one or change the filter.
        </p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {visible.map((job, i) => {
            const overdue = isJobOverdue(job.dueAt, job.status);
            const dueDays = daysUntilDue(job.dueAt);
            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
              >
                <Link
                  href={`${cfg.basePath}/${job.id}`}
                  className="block rounded-xl border border-line bg-surface-1 p-4 transition hover:border-accent/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-text-strong">
                      {job.customer || job.id}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase ${JOB_STATUS_TONE[job.status] ?? ""}`}
                    >
                      {job.status}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-text-dim">
                    {job.subject || cfg.subjectLabel}
                  </p>
                  {job.dueAt && job.status !== "collected" && (
                    <p
                      className={`mt-2 text-[11px] font-medium ${
                        overdue ? "text-danger" : "text-text-dim"
                      }`}
                    >
                      {overdue
                        ? `${Math.abs(dueDays ?? 0)}d overdue`
                        : dueDays != null
                          ? `Due ${formatDate(job.dueAt)} (${dueDays}d)`
                          : `Due ${formatDate(job.dueAt)}`}
                    </p>
                  )}
                  <p className="mt-3 text-right font-semibold text-accent">
                    {formatMoney(job.total)}
                  </p>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

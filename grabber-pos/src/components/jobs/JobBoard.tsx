"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { formatMoney } from "@/lib/format";
import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { JOB_CONFIG, JOB_STATUS_TONE, type JobType } from "@/lib/jobs-config";

interface JobRow {
  id: string;
  customer: string;
  subject: string;
  status: string;
  total: number;
}

export function JobBoard({ type }: { type: JobType }) {
  const cfg = JOB_CONFIG[type];
  const router = useRouter();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch(`/api/jobs?type=${type}`)
      .then((r) => r.json())
      .then((j) => j.success && setJobs(j.data))
      .finally(() => setLoading(false));
  }, [type]);

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

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <ModuleHeader
        title={cfg.title}
        subtitle="Jobs in progress"
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

      {loading ? (
        <p className="mt-10 text-center text-sm text-text-dim">Loading…</p>
      ) : jobs.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-line p-10 text-center text-sm text-text-dim">
          No open jobs. Start a new one.
        </p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {jobs.map((job, i) => (
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
                <div className="flex items-center justify-between">
                  <p className="font-medium text-text-strong">
                    {job.customer || job.id}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${JOB_STATUS_TONE[job.status] ?? ""}`}
                  >
                    {job.status}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-text-dim">
                  {job.subject || cfg.subjectLabel}
                </p>
                <p className="mt-3 text-right font-semibold text-accent">
                  {formatMoney(job.total)}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

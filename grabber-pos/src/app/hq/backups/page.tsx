"use client";

import { useEffect, useState } from "react";

interface TenantOpt {
  id: string;
  name: string;
}

export default function HqBackupsPage() {
  const [tenants, setTenants] = useState<TenantOpt[]>([]);
  const [orgId, setOrgId] = useState("");

  useEffect(() => {
    fetch("/api/hq/tenants")
      .then((r) => r.json())
      .then((j) => {
        const list = (j.data?.tenants ?? []) as TenantOpt[];
        if (Array.isArray(list) && list.length) {
          setTenants(list.map((t) => ({ id: t.id, name: t.name })));
          setOrgId(list[0]!.id);
        }
      })
      .catch(() => undefined);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-strong">Backups</h1>
      <p className="mt-1 text-sm text-text-dim">
        JSON exports include catalogue, stock, sales, collections, and documents
        with secrets redacted. Point-in-time restore stays in Supabase.
      </p>

      <section className="mt-6 rounded-2xl border border-line bg-surface-1 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-dim">
          Database (disaster recovery)
        </h2>
        <p className="mt-2 text-sm text-text-dim">
          WAL archiving is on. Daily restore points are a Supabase plan feature.
        </p>
        <a
          href="https://supabase.com/dashboard/project/vtawrxmkahpgwgydibox/settings/infrastructure"
          className="mt-3 inline-block text-sm text-accent"
          target="_blank"
          rel="noreferrer"
        >
          Open Supabase backups / PITR
        </a>
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-surface-1 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-dim">
          Full HQ JSON
        </h2>
        <p className="mt-2 text-sm text-text-dim">
          Every organisation: products, variants, branch stock, sales, lines,
          collections, and redacted documents.
        </p>
        <a
          href="/api/hq/backup"
          className="mt-4 inline-flex rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink"
        >
          Download all tenants
        </a>
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-surface-1 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-dim">
          One tenant JSON
        </h2>
        <p className="mt-2 text-sm text-text-dim">
          Same full dump, scoped to one shop.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-text-strong"
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <a
            href={orgId ? `/api/hq/backup?orgId=${encodeURIComponent(orgId)}` : "#"}
            className="inline-flex rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink"
          >
            Download tenant
          </a>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-surface-1 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-dim">
          Client self-serve
        </h2>
        <p className="mt-2 text-sm text-text-dim">
          Shop owners download their own org from the tenant app (Backup tile).
        </p>
        <a href="/api/backup" className="mt-3 inline-block text-sm text-accent">
          Tenant backup endpoint
        </a>
      </section>
    </div>
  );
}

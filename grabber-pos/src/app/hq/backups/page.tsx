"use client";

export default function HqBackupsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-strong">Backups</h1>
      <p className="mt-1 text-sm text-text-dim">
        Postgres WAL archiving is on for the Anaz project. Daily restore points
        are a Supabase plan feature. This page is the HQ download; each shop
        also has a tenant JSON export.
      </p>

      <section className="mt-6 rounded-2xl border border-line bg-surface-1 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-dim">
          Database (all tenants)
        </h2>
        <p className="mt-2 text-sm text-text-dim">
          Point-in-time restore is managed in the Supabase dashboard for this
          project. WAL archive mode is enabled on the host.
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
          HQ JSON
        </h2>
        <p className="mt-2 text-sm text-text-dim">
          Tenants, licences, extras, and platform config. Not a full Postgres dump.
        </p>
        <a
          href="/api/hq/backup"
          className="mt-4 inline-flex rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink"
        >
          Download HQ backup
        </a>
      </section>

      <section className="mt-4 rounded-2xl border border-line bg-surface-1 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-dim">
          Client tenant JSON
        </h2>
        <p className="mt-2 text-sm text-text-dim">
          Shop owners download settings and recent sales from the tenant app.
        </p>
        <a href="/api/backup" className="mt-3 inline-block text-sm text-accent">
          Tenant backup endpoint
        </a>
      </section>
    </div>
  );
}

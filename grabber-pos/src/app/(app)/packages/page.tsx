"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { COLLECTIONS, type FieldDef } from "@/lib/collections";
import { formatMoney } from "@/lib/format";
import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState, SkeletonRows } from "@/components/ui/EmptyState";

type Row = Record<string, unknown> & { id: string };

/**
 * Packages manager with an "Add to POS" action that expands the pack into
 * cart lines via `/pos?packageId=`.
 */
export default function PackagesPage() {
  const name = "packages";
  const config = COLLECTIONS[name];
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/collections/${name}`)
      .then((r) => r.json())
      .then((json) => json.success && setRows(json.data))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(row: Row) {
    const label = String(row[config.fields[0].key] ?? row.id);
    if (!confirm(`Delete "${label}"?`)) return;
    const res = await fetch(`/api/collections/${name}/${row.id}`, {
      method: "DELETE",
    });
    if ((await res.json()).success) load();
  }

  const term = search.trim().toLowerCase();
  const filtered = term
    ? rows.filter((r) =>
        config.fields.some((f) =>
          String(r[f.key] ?? "")
            .toLowerCase()
            .includes(term),
        ),
      )
    : rows;

  const listFields = config.fields.filter((f) => f.inList);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <ModuleHeader
        title={config.plural}
        subtitle={`${rows.length} ${config.plural.toLowerCase()}`}
        actions={
          <Button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Add {config.singular.toLowerCase()}
          </Button>
        }
      />

      <label className="mt-6 block">
        <span className="sr-only">Search {config.plural}</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${config.plural.toLowerCase()}…`}
          className="w-full rounded-xl border border-line bg-surface-1 px-4 py-2.5 text-sm text-text-strong outline-none transition focus:border-accent"
        />
      </label>

      {loading && rows.length === 0 ? (
        <SkeletonRows count={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={term ? `No matches for “${search.trim()}”` : `No ${config.plural.toLowerCase()} yet`}
          body={
            term
              ? "Try another search term."
              : `Add your first ${config.singular.toLowerCase()} to start using this module.`
          }
          actionLabel={term ? undefined : `Add ${config.singular.toLowerCase()}`}
          onAction={
            term
              ? undefined
              : () => {
                  setEditing(null);
                  setFormOpen(true);
                }
          }
        />
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface-1/95">
          <table className="w-full text-sm" aria-label={`${config.plural} records`}>
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium text-text-dim">
                {listFields.map((f) => (
                  <th key={f.key} className="px-5 py-3">
                    {f.label}
                  </th>
                ))}
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-surface-2/80">
                  {listFields.map((f) => (
                    <td key={f.key} className="px-5 py-3 text-text-body">
                      {formatValue(row[f.key], f)}
                    </td>
                  ))}
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/pos?packageId=${row.id}`)}
                      >
                        Add to POS
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(row);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => remove(row)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PackageForm
        row={editing}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />
    </div>
  );
}

function formatValue(value: unknown, field: FieldDef): string {
  if (value == null || value === "") return "—";
  if (field.money) return formatMoney(Number(value));
  if (Array.isArray(value)) return `${value.length} items`;
  return String(value);
}

function PackageForm({
  row,
  open,
  onClose,
  onSaved,
}: {
  row: Row | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const config = COLLECTIONS.packages;
  const [form, setForm] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(row?.id ?? null);

  if ((row?.id ?? null) !== lastId || (open && Object.keys(form).length === 0)) {
    setLastId(row?.id ?? null);
    const next: Record<string, string> = {};
    for (const f of config.fields) {
      const raw = row?.[f.key];
      if (f.key === "items" && raw != null && typeof raw !== "string") {
        next[f.key] = JSON.stringify(raw, null, 2);
      } else {
        next[f.key] = row ? String(raw ?? "") : "";
      }
    }
    setForm(next);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch(
        row ? `/api/collections/packages/${row.id}` : `/api/collections/packages`,
        {
          method: row ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Save failed");
        return;
      }
      onClose();
      onSaved();
    } catch {
      setError("Network error");
    } finally {
      setPending(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4">
      <form
        onSubmit={submit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-surface-1 p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-text-strong">
          {row ? "Edit package" : "Add package"}
        </h2>
        <p className="mt-1 text-xs text-text-dim">
          Use productId + qty for a single-item pack, or items JSON for multi.
        </p>
        <div className="mt-4 space-y-3">
          {config.fields.map((f) => (
            <label key={f.key} className="block text-sm">
              <span className="mb-1 block text-text-dim">{f.label}</span>
              {f.type === "textarea" ? (
                <textarea
                  value={form[f.key] ?? ""}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, [f.key]: e.target.value }))
                  }
                  rows={4}
                  placeholder='[{"productId":"P00001","qty":2}]'
                  className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 font-mono text-xs text-text-strong outline-none focus:border-accent"
                />
              ) : (
                <input
                  type={f.type === "number" ? "number" : "text"}
                  value={form[f.key] ?? ""}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, [f.key]: e.target.value }))
                  }
                  className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
                />
              )}
            </label>
          ))}
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
        <p className="mt-3 text-xs text-text-dim">
          After save, use{" "}
          <Link href="/pos" className="text-accent hover:underline">
            Add to POS
          </Link>{" "}
          to explode into the cart.
        </p>
      </form>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { COLLECTIONS, type FieldDef } from "@/lib/collections";
import { formatMoney } from "@/lib/format";
import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState, SkeletonRows } from "@/components/ui/EmptyState";

type Row = Record<string, unknown> & { id: string };

export function CollectionManager({ name }: { name: string }) {
  const config = COLLECTIONS[name];
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
  }, [name]);

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

      <CollectionForm
        name={name}
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
  return String(value);
}

function CollectionForm({
  name,
  row,
  open,
  onClose,
  onSaved,
}: {
  name: string;
  row: Row | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const config = COLLECTIONS[name];
  const [form, setForm] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(row?.id ?? null);

  if ((row?.id ?? null) !== lastId || (open && Object.keys(form).length === 0)) {
    setLastId(row?.id ?? null);
    const next: Record<string, string> = {};
    for (const f of config.fields) next[f.key] = row ? String(row[f.key] ?? "") : "";
    setForm(next);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch(
        row ? `/api/collections/${name}/${row.id}` : `/api/collections/${name}`,
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
      onSaved();
      onClose();
    } catch {
      setError("Could not reach the server");
    } finally {
      setPending(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-6 backdrop-blur-sm"
        >
          <motion.form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className="my-4 w-full max-w-lg rounded-2xl border border-line bg-surface-1 p-6 shadow-2xl"
          >
            <h1 className="text-lg font-semibold text-text-strong">
              {row ? `Edit ${config.singular.toLowerCase()}` : `New ${config.singular.toLowerCase()}`}
            </h1>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {config.fields.map((f) => (
                <label
                  key={f.key}
                  className={`text-sm ${f.full || f.type === "textarea" ? "col-span-2" : ""}`}
                >
                  <span className="mb-1 block text-text-dim">
                    {f.label}
                    {f.required && <span className="text-danger"> *</span>}
                  </span>
                  {f.type === "select" ? (
                    <select
                      value={form[f.key] ?? ""}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, [f.key]: e.target.value }))
                      }
                      className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
                    >
                      <option value="">—</option>
                      {f.options?.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea
                      value={form[f.key] ?? ""}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, [f.key]: e.target.value }))
                      }
                      rows={2}
                      className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
                    />
                  ) : (
                    <input
                      type={
                        f.type === "number"
                          ? "number"
                          : f.type === "date"
                            ? "date"
                            : f.type === "email"
                              ? "email"
                              : "text"
                      }
                      required={f.required}
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

            {error && (
              <p className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-line px-4 py-2.5 text-sm text-text-dim transition hover:text-text-body"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-strong disabled:opacity-50"
              >
                {pending ? "Saving…" : row ? "Save changes" : "Create"}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

"use client";

import { useMemo, useState } from "react";
import { newId, type StoreCollection, type StoreConfig } from "@/lib/commerce/schema";
import { SMART_COLLECTION_TEMPLATES } from "@/lib/commerce/collections-engine";
import { Button } from "@/components/ui/Button";

const RULE_FIELDS = ["price", "tag", "category", "featured", "in_stock"] as const;
const RULE_OPS = ["eq", "lt", "lte", "gt", "gte"] as const;

export function CollectionsAdmin({
  initial,
  categories,
}: {
  initial: StoreConfig;
  categories: string[];
}) {
  const [store, setStore] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    initial.collections[0]?.id ?? null,
  );
  const selected = store.collections.find((c) => c.id === selectedId) ?? null;

  const categoryOptions = useMemo(
    () => ["all", ...categories.filter(Boolean)],
    [categories],
  );

  function patchCollection(id: string, partial: Partial<StoreCollection>) {
    setStore({
      ...store,
      collections: store.collections.map((c) =>
        c.id === id ? { ...c, ...partial } : c,
      ),
    });
  }

  function addCollection() {
    const col: StoreCollection = {
      id: newId("col"),
      title: "New collection",
      slug: `collection-${store.collections.length + 1}`,
      description: "",
      sourceCategory: "all",
      featured: false,
      collectionType: "automated",
      rules: [],
    };
    setStore({ ...store, collections: [...store.collections, col] });
    setSelectedId(col.id);
  }

  function applyTemplate(id: string) {
    const t = SMART_COLLECTION_TEMPLATES.find((x) => x.id === id);
    if (!t || !selected) return;
    patchCollection(selected.id, {
      title: t.title,
      rules: [...t.rules],
      collectionType: "automated",
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/commerce", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collections: store.collections }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Save failed");
      setStore(json.data);
      setMsg("Collections saved to the draft. Publish from the store builder to go live.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="rounded-3xl border border-line bg-surface-1 p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase text-text-dim">Collections</p>
          <button type="button" onClick={addCollection} className="text-xs font-semibold text-accent">
            Add
          </button>
        </div>
        <ul className="mt-2 space-y-1">
          {store.collections.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`w-full rounded-lg px-2 py-1.5 text-left text-sm ${
                  selectedId === c.id ? "bg-accent/15 font-semibold text-accent" : "hover:bg-surface-2"
                }`}
              >
                {c.title}
              </button>
            </li>
          ))}
        </ul>
        <Button className="mt-4 w-full" size="sm" onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save draft"}
        </Button>
        {(msg || error) && (
          <p className={`mt-2 text-xs ${error ? "text-danger" : "text-accent"}`}>{error || msg}</p>
        )}
      </aside>
      {selected ? (
        <section className="rounded-3xl border border-line bg-surface-1 p-5 space-y-3">
          <label className="block text-xs font-medium text-text-dim">Title</label>
          <input
            value={selected.title}
            onChange={(e) => patchCollection(selected.id, { title: e.target.value })}
            className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm"
          />
          <label className="block text-xs font-medium text-text-dim">Slug</label>
          <input
            value={selected.slug}
            onChange={(e) => patchCollection(selected.id, { slug: e.target.value })}
            className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm font-mono"
          />
          <label className="block text-xs font-medium text-text-dim">POS category source</label>
          <select
            value={selected.sourceCategory}
            onChange={(e) => patchCollection(selected.id, { sourceCategory: e.target.value })}
            className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm"
          >
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.featured}
              onChange={(e) => patchCollection(selected.id, { featured: e.target.checked })}
            />
            Featured on home
          </label>
          <label className="block text-xs font-medium text-text-dim">Template</label>
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) applyTemplate(e.target.value);
              e.target.value = "";
            }}
            className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm"
          >
            <option value="">Apply smart template…</option>
            {SMART_COLLECTION_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          <p className="text-xs font-semibold uppercase text-text-dim">Rules</p>
          {selected.rules.map((rule, i) => (
            <div key={`${rule.field}-${i}`} className="grid grid-cols-3 gap-2">
              <select
                value={rule.field}
                onChange={(e) => {
                  const rules = selected.rules.map((r, idx) =>
                    idx === i ? { ...r, field: e.target.value as typeof rule.field } : r,
                  );
                  patchCollection(selected.id, { rules });
                }}
                className="rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-sm"
              >
                {RULE_FIELDS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <select
                value={rule.op}
                onChange={(e) => {
                  const rules = selected.rules.map((r, idx) =>
                    idx === i ? { ...r, op: e.target.value as typeof rule.op } : r,
                  );
                  patchCollection(selected.id, { rules });
                }}
                className="rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-sm"
              >
                {RULE_OPS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              <input
                value={rule.value}
                onChange={(e) => {
                  const rules = selected.rules.map((r, idx) =>
                    idx === i ? { ...r, value: e.target.value } : r,
                  );
                  patchCollection(selected.id, { rules });
                }}
                className="rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-sm"
              />
            </div>
          ))}
          <button
            type="button"
            className="text-xs font-semibold text-accent"
            onClick={() =>
              patchCollection(selected.id, {
                rules: [...selected.rules, { field: "tag", op: "eq", value: "" }],
                collectionType: "automated",
              })
            }
          >
            Add rule
          </button>
          <button
            type="button"
            className="ml-3 text-xs text-danger"
            onClick={() =>
              setStore({
                ...store,
                collections: store.collections.filter((c) => c.id !== selected.id),
              })
            }
          >
            Delete collection
          </button>
        </section>
      ) : (
        <p className="text-sm text-text-dim">Add a collection to start.</p>
      )}
    </div>
  );
}

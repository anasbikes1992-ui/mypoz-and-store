"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  COMMERCE_THEME_IDS,
  SECTION_TYPES,
  newId,
  storeConfigSchema,
  type CommerceThemeId,
  type StoreConfig,
  type StoreSection,
  type SectionType,
} from "@/lib/commerce/schema";
import { THEMES } from "@/lib/commerce/themes";
import { themeClass } from "@/lib/commerce/themes";
import { HomeSections } from "@/components/commerce/storefront/HomeSections";
import { Button } from "@/components/ui/Button";
import type { StoreProduct } from "@/lib/storefront";
import { CartProvider } from "@/app/store/[slug]/cart";
import { DEFAULT_WEBSITE } from "@/lib/website";

const SECTION_LABELS: Record<SectionType, string> = {
  announcement: "Announcement bar",
  hero: "Hero",
  featured_collection: "Featured collection",
  product_grid: "Product grid",
  image_text: "Image + text",
  promo_banner: "Promotional banner",
  testimonials: "Testimonials",
  brand_logos: "Brand logos",
  categories: "Categories",
  newsletter: "Newsletter",
  rich_text: "Rich text",
  video: "Video",
  spacer: "Spacer",
  trust: "Trust badges",
};

type Device = "desktop" | "tablet" | "mobile";
const DEVICE_W: Record<Device, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
};

function setting(section: StoreSection, key: string): string {
  const v = section.settings[key];
  return typeof v === "string" || typeof v === "number" ? String(v) : "";
}

export function StoreBuilder({
  initial,
  products,
  categories,
  slug,
}: {
  initial: StoreConfig;
  products: StoreProduct[];
  categories: { name: string; count: number }[];
  slug: string;
}) {
  const [store, setStore] = useState(initial);
  const [device, setDevice] = useState<Device>("desktop");
  const [selectedId, setSelectedId] = useState<string | null>(
    initial.pages.find((p) => p.type === "home")?.sections[0]?.id ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<StoreConfig[]>([initial]);
  const [histIndex, setHistIndex] = useState(0);

  const homeIndex = store.pages.findIndex((p) => p.type === "home");
  const home = store.pages[homeIndex] ?? store.pages[0];
  const sections = home?.sections ?? [];
  const selected = sections.find((s) => s.id === selectedId) ?? null;

  const commit = useCallback(
    (next: StoreConfig) => {
      setStore(next);
      setHistory((h) => {
        const trimmed = h.slice(0, histIndex + 1);
        const merged = [...trimmed, next].slice(-40);
        setHistIndex(merged.length - 1);
        return merged;
      });
    },
    [histIndex],
  );

  function patchStore(partial: Partial<StoreConfig>) {
    commit({ ...store, ...partial });
  }

  function patchSections(nextSections: StoreSection[]) {
    if (homeIndex < 0) return;
    const pages = store.pages.map((p, i) =>
      i === homeIndex ? { ...p, sections: nextSections } : p,
    );
    commit({ ...store, pages });
  }

  function patchSelected(settings: Record<string, unknown>) {
    patchSections(
      sections.map((s) =>
        s.id === selectedId ? { ...s, settings: { ...s.settings, ...settings } } : s,
      ),
    );
  }

  function undo() {
    if (histIndex <= 0) return;
    const i = histIndex - 1;
    setHistIndex(i);
    setStore(history[i]!);
  }
  function redo() {
    if (histIndex >= history.length - 1) return;
    const i = histIndex + 1;
    setHistIndex(i);
    setStore(history[i]!);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      const body = storeConfigSchema.parse(store);
      const res = await fetch("/api/commerce", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Save failed");
      setStore(json.data);
      setMsg("Draft saved. Visitors still see the last published store.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    setPublishing(true);
    setError(null);
    setMsg(null);
    try {
      const parsed = storeConfigSchema.parse(store);
      const saveRes = await fetch("/api/commerce", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const saved = await saveRes.json();
      if (!saved.success) throw new Error(saved.error || "Save failed");
      const res = await fetch("/api/commerce/publish", { method: "POST" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Publish failed");
      setMsg("Published. Your live store is updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  const previewStore = useMemo(() => store, [store]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [histIndex, history, store]);

  return (
    <CartProvider
      slug={slug}
      businessName={store.name}
      whatsappNumber={store.social.whatsapp}
      currency={store.currency}
      website={DEFAULT_WEBSITE}
    >
    <div className="flex h-[calc(100vh-4.5rem)] min-h-[640px] flex-col bg-surface-0">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-1 px-3 py-2">
        <div className="flex items-center gap-2">
          <Link href="/commerce" className="text-xs font-semibold text-text-dim hover:text-accent">
            MyPoz
          </Link>
          <span className="text-text-dim">/</span>
          <span className="text-sm font-semibold text-text-strong">Store builder</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(["desktop", "tablet", "mobile"] as Device[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDevice(d)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold capitalize ${
                device === d ? "bg-accent text-accent-ink" : "text-text-dim hover:bg-surface-2"
              }`}
            >
              {d}
            </button>
          ))}
          <Button variant="ghost" size="sm" onClick={undo} disabled={histIndex <= 0}>
            Undo
          </Button>
          <Button variant="ghost" size="sm" onClick={redo} disabled={histIndex >= history.length - 1}>
            Redo
          </Button>
          <Link
            href={`/store/${slug}`}
            target="_blank"
            className="inline-flex min-h-9 items-center rounded-[10px] border border-line px-2.5 text-xs font-semibold text-text-dim"
          >
            Preview
          </Link>
          <Button variant="secondary" size="sm" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save draft"}
          </Button>
          <Button size="sm" onClick={() => void publish()} disabled={publishing}>
            {publishing ? "Publishing…" : "Publish"}
          </Button>
        </div>
      </header>
      {(msg || error) && (
        <p className={`px-4 py-2 text-xs ${error ? "bg-danger/10 text-danger" : "bg-accent/10 text-accent"}`}>
          {error || msg}
        </p>
      )}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_280px]">
        <aside className="overflow-y-auto border-r border-line bg-surface-1 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-dim">Pages</p>
          <ul className="mt-2 space-y-1">
            {store.pages.filter((p) => p.visible).map((p) => (
              <li key={p.id}>
                <span className="block rounded-lg px-2 py-1.5 text-sm text-text-strong">
                  {p.title}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
            Home sections
          </p>
          <ul className="mt-2 space-y-1">
            {sections.map((s, i) => (
              <li key={s.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className={`min-w-0 flex-1 rounded-lg px-2 py-1.5 text-left text-sm ${
                    selectedId === s.id
                      ? "bg-accent/15 font-semibold text-accent"
                      : "text-text-body hover:bg-surface-2"
                  }`}
                >
                  {SECTION_LABELS[s.type]}
                  {!s.enabled ? " · hidden" : ""}
                </button>
                <button
                  type="button"
                  aria-label="Move up"
                  disabled={i === 0}
                  onClick={() => {
                    const next = [...sections];
                    [next[i - 1], next[i]] = [next[i]!, next[i - 1]!];
                    patchSections(next);
                  }}
                  className="h-7 w-7 rounded text-xs text-text-dim disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={i === sections.length - 1}
                  onClick={() => {
                    const next = [...sections];
                    [next[i], next[i + 1]] = [next[i + 1]!, next[i]!];
                    patchSections(next);
                  }}
                  className="h-7 w-7 rounded text-xs text-text-dim disabled:opacity-30"
                >
                  ↓
                </button>
              </li>
            ))}
          </ul>
          <label className="mt-4 block text-[10px] font-semibold uppercase tracking-wider text-text-dim">
            Add section
          </label>
          <select
            className="mt-1 w-full rounded-lg border border-line bg-surface-2 px-2 py-2 text-sm"
            defaultValue=""
            onChange={(e) => {
              const type = e.target.value as SectionType;
              if (!type) return;
              const added: StoreSection = {
                id: newId("sec"),
                type,
                enabled: true,
                settings: { heading: "New section", title: "New section" },
              };
              patchSections([...sections, added]);
              setSelectedId(added.id);
              e.target.value = "";
            }}
          >
            <option value="">Choose…</option>
            {SECTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {SECTION_LABELS[type]}
              </option>
            ))}
          </select>
        </aside>

        <div className="min-h-0 overflow-auto bg-surface-2 p-4">
          <div
            className={`${themeClass(store.themeId)} mx-auto overflow-hidden border border-line bg-surface-0 shadow-xl transition-[width]`}
            style={{
              width: DEVICE_W[device],
              borderRadius: device === "desktop" ? 12 : 24,
              maxWidth: "100%",
            }}
          >
            <div className="pointer-events-none origin-top">
              <div className="border-b border-line px-4 py-3 text-sm font-semibold">
                {store.tokens.logoUrl ? "Logo" : store.name}
              </div>
              <HomeSections
                slug={slug}
                store={previewStore}
                products={products}
                categories={categories}
              />
            </div>
          </div>
        </div>

        <aside className="overflow-y-auto border-l border-line bg-surface-1 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-dim">
            Theme
          </p>
          <select
            value={store.themeId}
            onChange={(e) =>
              patchStore({ themeId: e.target.value as CommerceThemeId })
            }
            className="mt-1 w-full rounded-lg border border-line bg-surface-2 px-2 py-2 text-sm"
          >
            {COMMERCE_THEME_IDS.map((id) => (
              <option key={id} value={id}>
                {THEMES[id].name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-text-dim">{THEMES[store.themeId].tagline}</p>

          <label className="mt-4 block text-xs font-medium text-text-dim">Store name</label>
          <input
            value={store.name}
            onChange={(e) => patchStore({ name: e.target.value })}
            className="mt-1 w-full rounded-lg border border-line bg-surface-2 px-2 py-2 text-sm"
          />
          <label className="mt-3 block text-xs font-medium text-text-dim">Announcement</label>
          <input
            value={store.announcement}
            onChange={(e) => patchStore({ announcement: e.target.value })}
            className="mt-1 w-full rounded-lg border border-line bg-surface-2 px-2 py-2 text-sm"
          />

          {selected ? (
            <div className="mt-5 border-t border-line pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-text-strong">
                  {SECTION_LABELS[selected.type]}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    patchSections(sections.filter((s) => s.id !== selected.id))
                  }
                  className="text-xs font-semibold text-danger"
                >
                  Remove
                </button>
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.enabled}
                  onChange={(e) =>
                    patchSections(
                      sections.map((s) =>
                        s.id === selected.id ? { ...s, enabled: e.target.checked } : s,
                      ),
                    )
                  }
                />
                Visible
              </label>
              {["heading", "subheading", "title", "message", "description", "content", "ctaLabel", "quote"].map(
                (key) => (
                  <div key={key}>
                    <label className="mt-3 block text-xs font-medium capitalize text-text-dim">
                      {key}
                    </label>
                    {key === "content" || key === "description" || key === "subheading" ? (
                      <textarea
                        value={setting(selected, key)}
                        onChange={(e) => patchSelected({ [key]: e.target.value })}
                        rows={3}
                        className="mt-1 w-full rounded-lg border border-line bg-surface-2 px-2 py-2 text-sm"
                      />
                    ) : (
                      <input
                        value={setting(selected, key)}
                        onChange={(e) => patchSelected({ [key]: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-line bg-surface-2 px-2 py-2 text-sm"
                      />
                    )}
                  </div>
                ),
              )}
            </div>
          ) : (
            <p className="mt-6 text-sm text-text-dim">Select a section to edit.</p>
          )}
        </aside>
      </div>
    </div>
    </CartProvider>
  );
}

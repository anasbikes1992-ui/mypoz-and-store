"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { CommerceNav } from "@/components/commerce/admin/CommerceNav";
import { THEME_LIST, themeClass } from "@/lib/commerce/themes";
import type { CommerceThemeId, StoreConfig } from "@/lib/commerce/schema";
import { storePath } from "@/lib/commerce/schema";
import { Button } from "@/components/ui/Button";

export default function ThemesPage() {
  const [store, setStore] = useState<StoreConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<CommerceThemeId | null>(null);

  useEffect(() => {
    fetch("/api/commerce")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setStore(j.data.draft);
          setPreviewId(j.data.draft.themeId);
        }
      });
  }, []);

  async function select(id: CommerceThemeId) {
    if (!store) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/commerce/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeId: id }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setStore(json.data);
      setPreviewId(id);
      setMsg(`${id} saved on draft and the live published storefront.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  const slug = store?.slug || "main-store";
  const liveId = previewId ?? store?.themeId ?? "local";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <ModuleHeader
        title="Themes"
        subtitle="Each theme has its own layout and product cards — not a recolor."
        actions={
          <Link
            href={storePath(slug)}
            className="rounded-xl border border-line px-3 py-2 text-sm text-text-dim transition hover:border-accent hover:text-accent"
          >
            Preview store
          </Link>
        }
      />
      <div className="mt-4">
        <CommerceNav />
      </div>
      {msg ? <p className="mt-4 text-sm text-accent">{msg}</p> : null}

      <section className="mt-6 rounded-3xl border border-line bg-surface-1 p-5">
        <h2 className="text-sm font-semibold text-text-strong">Live preview</h2>
        <p className="mt-1 text-xs text-text-dim">
          Swatches come from the same CSS variables the storefront layout applies
          (theme-mypoz- plus the theme id).
        </p>
        <div className={`${themeClass(liveId)} mt-4 rounded-2xl border border-line p-4`}>
          <div className="flex flex-wrap gap-2">
            <Swatch label="Accent" className="bg-accent" />
            <Swatch label="Surface" className="bg-surface-1 border border-line" />
            <Swatch label="Page" className="bg-surface-0 border border-line" />
            <Swatch label="Line" className="bg-line" />
            <Swatch label="Text" className="bg-text-strong" />
          </div>
          <article className="mt-4 max-w-xs rounded-2xl border border-line bg-surface-1 p-4">
            <div className="mb-3 h-28 rounded-xl bg-surface-2" />
            <p className="text-sm font-semibold text-text-strong">Sample product</p>
            <p className="mt-1 text-xs text-text-dim">Name · stock from POS catalog</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="font-mono text-sm font-semibold text-accent">Rs 1,250.00</span>
              <span className="rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-accent-ink">
                Add
              </span>
            </div>
          </article>
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {THEME_LIST.map((theme) => {
          const active = store?.themeId === theme.id;
          return (
            <article
              key={theme.id}
              className={`flex flex-col rounded-3xl border p-5 ${
                active ? "border-accent bg-accent/5" : "border-line bg-surface-1"
              }`}
            >
              <button
                type="button"
                onClick={() => setPreviewId(theme.id)}
                className={`${themeClass(theme.id)} mb-4 h-24 w-full overflow-hidden rounded-2xl border border-line text-left`}
                aria-label={`Preview ${theme.name}`}
              >
                <div className="flex h-full">
                  <div className="w-1/3 bg-accent" />
                  <div className="flex flex-1 flex-col justify-between bg-surface-0 p-2">
                    <span className="h-2 w-12 rounded bg-text-strong/40" />
                    <span className="h-8 rounded bg-surface-1" />
                  </div>
                </div>
              </button>
              <h2 className="text-lg font-semibold text-text-strong">{theme.name}</h2>
              <p className="mt-1 text-sm text-text-dim">{theme.tagline}</p>
              <p className="mt-2 text-xs text-text-dim">{theme.idealFor.join(" · ")}</p>
              <div className="mt-4 flex gap-2">
                <Button
                  className="flex-1"
                  variant={active ? "primary" : "secondary"}
                  disabled={busy}
                  onClick={() => void select(theme.id)}
                >
                  {active ? "Selected" : "Use theme"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Swatch({ label, className }: { label: string; className: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-6 w-6 rounded-md ${className}`} />
      <span className="text-[11px] text-text-dim">{label}</span>
    </div>
  );
}

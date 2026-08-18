"use client";

import { useEffect, useState } from "react";
import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { CommerceNav } from "@/components/commerce/admin/CommerceNav";
import { THEME_LIST } from "@/lib/commerce/themes";
import type { CommerceThemeId, StoreConfig } from "@/lib/commerce/schema";
import { Button } from "@/components/ui/Button";

export default function ThemesPage() {
  const [store, setStore] = useState<StoreConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/commerce")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setStore(j.data.draft);
      });
  }, []);

  async function select(id: CommerceThemeId) {
    if (!store) return;
    setBusy(true);
    setMsg(null);
    try {
      const next = { ...store, themeId: id };
      const res = await fetch("/api/commerce", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setStore(json.data);
      setMsg(`${id} saved as draft. Open Store builder, then Publish.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <ModuleHeader
        title="Themes"
        subtitle="Each theme has its own layout and product cards — not a recolor."
      />
      <div className="mt-4">
        <CommerceNav />
      </div>
      {msg ? <p className="mt-4 text-sm text-accent">{msg}</p> : null}
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
              <div
                className="mb-4 h-24 rounded-2xl"
                style={{
                  background: `linear-gradient(135deg, ${theme.tokens.primary}, ${theme.tokens.accent})`,
                }}
              />
              <h2 className="text-lg font-semibold text-text-strong">{theme.name}</h2>
              <p className="mt-1 text-sm text-text-dim">{theme.tagline}</p>
              <p className="mt-2 text-xs text-text-dim">{theme.idealFor.join(" · ")}</p>
              <Button
                className="mt-4"
                variant={active ? "primary" : "secondary"}
                disabled={busy}
                onClick={() => void select(theme.id)}
              >
                {active ? "Selected" : "Use theme"}
              </Button>
            </article>
          );
        })}
      </div>
    </div>
  );
}

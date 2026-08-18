"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

type Item = { url: string; name: string };

export function MediaLibrary() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const res = await fetch("/api/media");
    const json = await res.json();
    if (json.success) setItems(json.data);
    else setError(json.error || "Could not list media");
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/media", { method: "POST", body: form });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Upload failed");
      setMsg(`Saved ${json.data.url} — paste this URL on a product or theme.`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(url: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/media?url=${encodeURIComponent(url)}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Delete failed");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <label className="inline-flex min-h-10 cursor-pointer items-center rounded-xl border border-line px-4 text-sm font-semibold">
        {busy ? "Working…" : "Upload image"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = "";
          }}
        />
      </label>
      <p className="text-sm text-text-dim">
        Uploads go to durable Supabase Storage when you are signed in to a tenant; otherwise they stay on this app&apos;s disk (ephemeral on Vercel). Paste the URL onto a product — this is not a second catalogue.
      </p>
      {(msg || error) && (
        <p className={`text-sm ${error ? "text-danger" : "text-accent"}`}>{error || msg}</p>
      )}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <li key={item.url} className="overflow-hidden rounded-2xl border border-line bg-surface-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.url} alt="" className="h-28 w-full object-cover" />
            <div className="flex items-center justify-between gap-1 p-2">
              <button
                type="button"
                className="truncate text-[11px] font-mono text-accent"
                onClick={() => void navigator.clipboard.writeText(item.url)}
              >
                {item.url}
              </button>
              <Button variant="secondary" size="sm" onClick={() => void remove(item.url)}>
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {items.length === 0 ? (
        <p className="text-sm text-text-dim">No uploads yet.</p>
      ) : null}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ImportSummary {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export function ProductImportExport({
  onImported,
}: {
  onImported: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<
    { ok: true; summary: ImportSummary } | { ok: false; error: string } | null
  >(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setResult(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/products/import", { method: "POST", body });
      const json = await res.json();
      if (json.success) {
        setResult({ ok: true, summary: json.data as ImportSummary });
        onImported();
      } else {
        setResult({ ok: false, error: json.error ?? "Import failed" });
      }
    } catch {
      setResult({ ok: false, error: "Could not upload the file" });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-line bg-surface-1 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-medium text-text-strong">
          Bulk catalog:
        </span>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-accent-ink transition hover:bg-accent-strong disabled:opacity-50"
        >
          {busy ? "Importing…" : "Import Excel / CSV"}
        </button>
        {/* API download endpoints, not pages — next/link would break the download. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/api/products/export"
          className="rounded-lg border border-line px-3.5 py-2 text-sm text-text-body transition hover:border-accent hover:text-accent"
        >
          Export Excel
        </a>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/api/products/template"
          className="rounded-lg border border-line px-3.5 py-2 text-sm text-text-dim transition hover:border-accent hover:text-accent"
        >
          Download template
        </a>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFile}
          className="hidden"
        />
      </div>
      <p className="mt-2 text-xs text-text-dim">
        Accepts grocery, pharmacy, bookshop, and hardware catalog spreadsheets.
        Headers are matched automatically; existing products are updated by barcode.
      </p>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mt-3 rounded-lg border px-4 py-2.5 text-sm ${
              result.ok
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-danger/40 bg-danger/10 text-danger"
            }`}
          >
            {result.ok ? (
              <>
                Imported <b>{result.summary.imported}</b> new, updated{" "}
                <b>{result.summary.updated}</b>
                {result.summary.skipped > 0 && (
                  <> · skipped {result.summary.skipped}</>
                )}
                .
                {result.summary.errors.length > 0 && (
                  <span className="mt-1 block text-xs text-warn">
                    {result.summary.errors.slice(0, 3).join(" · ")}
                  </span>
                )}
              </>
            ) : (
              result.error
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ModuleHeader } from "@/components/shell/ModuleHeader";

interface Article {
  id: string;
  title: string;
  body: string;
  tags: string[];
  source: string;
  updatedAt: string;
}

export default function KnowledgePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/knowledge")
      .then(async (r) => {
        const j = await r.json();
        if (r.status === 403) {
          setForbidden(true);
          return;
        }
        if (j.success) setArticles(j.data);
        else setError(j.error ?? "Failed to load");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    setPending(true);
    setMsg(null);
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          source: "manual",
        }),
      });
      const j = await res.json();
      if (!j.success) {
        setMsg(j.error ?? "Save failed");
        return;
      }
      setTitle("");
      setBody("");
      setTags("");
      setMsg("Article saved — Jarvis can search it on the next question.");
      load();
    } finally {
      setPending(false);
    }
  }

  async function harvest() {
    setPending(true);
    setMsg(null);
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "harvest" }),
      });
      const j = await res.json();
      if (!j.success) {
        setMsg(j.error ?? "Harvest failed");
        return;
      }
      setMsg(
        `Collected ${j.data.created} article(s) from business profile and catalogue. Edit or add more anytime.`,
      );
      load();
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this article?")) return;
    await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
    load();
  }

  if (forbidden) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-text-strong">
          Knowledge base
        </h1>
        <p className="mt-3 text-sm text-text-dim">
          Custom shop knowledge for Jarvis is included on{" "}
          <strong className="text-text-body">Business</strong> and{" "}
          <strong className="text-text-body">Enterprise</strong>, or as an HQ
          add-on (<code className="text-xs">knowledge</code>).
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/billing"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink"
          >
            View plans
          </Link>
          <Link
            href="/assistant"
            className="rounded-lg border border-line px-4 py-2 text-sm text-text-dim"
          >
            Open Jarvis
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <ModuleHeader
        title="Shop knowledge"
        subtitle="Teach Jarvis your business — policies, FAQs, suppliers, house rules"
        actions={
          <Link
            href="/assistant"
            className="rounded-lg border border-line px-3 py-1.5 text-sm text-text-dim transition hover:border-accent hover:text-accent"
          >
            Open Jarvis
          </Link>
        }
      />

      <p className="mt-3 text-sm text-text-dim">
        Platform MyPoz how-tos stay built-in. Your articles are searched first
        for shop-specific questions. Improve them over time — harvest again after
        big catalogue changes, or paste policies manually.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={harvest}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition hover:bg-accent-strong disabled:opacity-50"
        >
          Collect from organisation
        </button>
        <span className="self-center text-xs text-text-dim">
          Profile + categories + sample SKUs (replaces prior harvest articles)
        </span>
      </div>

      <div className="mt-6 rounded-xl border border-line bg-surface-1 p-5">
        <p className="mb-3 text-sm font-medium text-text-strong">
          Add article
        </p>
        <label className="block text-sm">
          <span className="mb-1 block text-text-dim">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
            placeholder="Return policy · Delivery zones · Opening hours"
          />
        </label>
        <label className="mt-3 block text-sm">
          <span className="mb-1 block text-text-dim">Body</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-text-strong outline-none focus:border-accent"
            placeholder="Facts Jarvis should use. Keep truthful — it must not invent stock."
          />
        </label>
        <label className="mt-3 block text-sm">
          <span className="mb-1 block text-text-dim">Tags (comma-separated)</span>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
            placeholder="returns, delivery, faq"
          />
        </label>
        {msg && (
          <p className="mt-3 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">
            {msg}
          </p>
        )}
        <button
          type="button"
          disabled={pending || !title.trim() || !body.trim()}
          onClick={create}
          className="mt-4 rounded-lg border border-line px-4 py-2 text-sm font-medium text-text-body transition hover:border-accent hover:text-accent disabled:opacity-40"
        >
          Save article
        </button>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-sm text-text-dim">Loading…</p>
      ) : error ? (
        <p className="mt-8 text-center text-sm text-danger">{error}</p>
      ) : articles.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-line p-8 text-center text-sm text-text-dim">
          No articles yet. Collect from the organisation or add your first FAQ.
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {articles.map((a) => (
            <li
              key={a.id}
              className="rounded-xl border border-line bg-surface-1 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-text-strong">{a.title}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-text-dim">
                    {a.source} · {a.tags.join(", ") || "no tags"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  className="text-xs text-text-dim transition hover:text-danger"
                >
                  Delete
                </button>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-text-body line-clamp-4">
                {a.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

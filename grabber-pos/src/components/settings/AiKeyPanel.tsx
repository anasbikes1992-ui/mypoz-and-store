"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

export function AiKeyPanel() {
  const [setFlag, setSetFlag] = useState(false);
  const [key, setKey] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/ai/settings")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setSetFlag(Boolean(j.data?.openaiKeySet));
      })
      .catch(() => undefined);
  }, []);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/ai/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openaiApiKey: key }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setSetFlag(Boolean(json.data?.openaiKeySet));
      setKey("");
      setMsg("AI key saved. It is never shown again.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-surface-1 p-5">
      <h2 className="mb-2 text-sm font-semibold text-text-strong">
        Jarvis / OpenAI
      </h2>
      <p className="text-sm text-text-dim">
        Optional BYOK. Stored on this organisation only, never sent to the
        browser after save. Status: {setFlag ? "set" : "not set"}.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          autoComplete="off"
          placeholder="sk-… paste a new key"
          className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-text-strong outline-none focus:border-accent"
        />
        <Button
          type="button"
          disabled={busy || !key.trim()}
          onClick={() => void save()}
        >
          {busy ? "Saving…" : "Save key"}
        </Button>
      </div>
      {msg ? <p className="mt-2 text-sm text-accent">{msg}</p> : null}
    </section>
  );
}

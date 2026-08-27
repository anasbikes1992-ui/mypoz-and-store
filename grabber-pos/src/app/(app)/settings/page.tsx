"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SETTINGS_SECTIONS } from "@/lib/settings";
import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { PrinterTestPanel } from "@/components/settings/PrinterTestPanel";
import { AiKeyPanel } from "@/components/settings/AiKeyPanel";
import { WhatsAppStatusPanel } from "@/components/settings/WhatsAppStatusPanel";
import { ChangePasswordPanel } from "@/components/settings/ChangePasswordPanel";
import { Button } from "@/components/ui/Button";
import { SkeletonRows } from "@/components/ui/EmptyState";

type Form = Record<string, string>;

const fieldClass =
  "w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-text-strong outline-none transition duration-150 focus:border-accent";

export default function SettingsPage() {
  const [form, setForm] = useState<Form>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          const next: Form = {};
          for (const [k, v] of Object.entries(json.data)) next[k] = String(v ?? "");
          setForm(next);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      setMsg(
        json.success
          ? { ok: true, text: "Settings saved." }
          : { ok: false, text: json.error ?? "Save failed" },
      );
    } catch {
      setMsg({ ok: false, text: "Could not reach the server" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <ModuleHeader title="Settings" subtitle="Business, receipt, tax & printers" />
        <SkeletonRows count={6} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <form onSubmit={save}>
        <ModuleHeader
          title="Settings"
          subtitle="Business, receipt, tax, printers & account"
          actions={
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          }
        />

        {msg && (
          <p
            className={`mt-6 rounded-xl border px-4 py-2 text-sm ${
              msg.ok
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-danger/40 bg-danger/10 text-danger"
            }`}
          >
            {msg.text}
          </p>
        )}

        <div className="mt-6 space-y-4">
          {SETTINGS_SECTIONS.map((section, i) => (
            <motion.section
              key={section.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              className="rounded-2xl border border-line bg-surface-1 p-5"
            >
              <h2 className="mb-4 text-sm font-semibold text-text-strong">
                {section.label}
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {section.fields.map((f) => (
                  <label
                    key={f.key}
                    className={`text-sm ${f.full || f.type === "textarea" ? "sm:col-span-2" : ""}`}
                  >
                    <span className="mb-1 block text-text-dim">{f.label}</span>
                    {f.type === "select" ? (
                      <select
                        value={form[f.key] ?? ""}
                        onChange={(e) => set(f.key, e.target.value)}
                        className={fieldClass}
                      >
                        {f.options?.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : f.type === "textarea" ? (
                      <textarea
                        value={form[f.key] ?? ""}
                        onChange={(e) => set(f.key, e.target.value)}
                        rows={2}
                        className={fieldClass}
                      />
                    ) : (
                      <input
                        type={
                          f.type === "number"
                            ? "number"
                            : f.type === "email"
                              ? "email"
                              : f.type === "tel"
                                ? "tel"
                                : "text"
                        }
                        inputMode={f.type === "tel" ? "tel" : undefined}
                        autoComplete={
                          f.type === "tel"
                            ? "tel"
                            : f.type === "email"
                              ? "email"
                              : "off"
                        }
                        placeholder={
                          f.key === "socialWhatsapp"
                            ? "+94 77 959 2288"
                            : undefined
                        }
                        value={form[f.key] ?? ""}
                        onChange={(e) => set(f.key, e.target.value)}
                        className={fieldClass}
                      />
                      {f.key === "socialWhatsapp" ? (
                        <span className="mt-1 block text-xs text-text-dim">
                          Used by the storefront “Order via WhatsApp” button.
                          Do not paste an email here.
                        </span>
                      ) : null}
                    )}
                  </label>
                ))}
              </div>
            </motion.section>
          ))}
          <WhatsAppStatusPanel />
          <PrinterTestPanel />
          <AiKeyPanel />
          <section className="rounded-2xl border border-line bg-surface-1 p-5">
            <h2 className="mb-2 text-sm font-semibold text-text-strong">
              Fiscal / e-invoice
            </h2>
            <p className="text-sm text-text-dim">
              Fiscal provider: stub — sales are logged to the audit trail. Swap
              the stub for a live provider when ready.
            </p>
          </section>
        </div>
      </form>

      <div className="mt-4">
        <ChangePasswordPanel />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBrand } from "@/components/brand/BrandProvider";
import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { Button } from "@/components/ui/Button";
import { SkeletonRows } from "@/components/ui/EmptyState";
import {
  THEME_PRESETS,
  THEME_LABELS,
  PAYMENT_MODES,
  PAYMENT_LABELS,
  FULFILMENT_MODES,
  FULFILMENT_LABELS,
  type WebsiteConfig,
  type WebsiteBanner,
  type ThemePreset,
  type PaymentMode,
  type FulfilmentMode,
} from "@/lib/website";

const fieldClass =
  "w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm text-text-strong outline-none transition focus:border-accent";

export default function WebsiteCmsPage() {
  const router = useRouter();
  const { enabledKeys, loading } = useBrand();
  const [config, setConfig] = useState<WebsiteConfig | null>(null);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [slug, setSlug] = useState("main-store");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !enabledKeys.has("website")) {
      router.replace("/commerce/onboarding");
    }
  }, [loading, enabledKeys, router]);

  useEffect(() => {
    Promise.all([
      fetch("/api/website").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ])
      .then(([website, settings]) => {
        if (website.success) setConfig(website.data);
        if (settings.success && settings.data?.storeSlug) {
          setSlug(settings.data.storeSlug);
        }
      })
      .finally(() => setFetching(false));
  }, []);

  function patch<K extends keyof WebsiteConfig>(key: K, value: WebsiteConfig[K]) {
    setConfig((c) => (c ? { ...c, [key]: value } : c));
  }

  function toggleMode<T extends string>(
    key: "paymentModes" | "fulfilmentModes",
    mode: T,
    list: T[],
  ) {
    const next = list.includes(mode)
      ? list.filter((m) => m !== mode)
      : [...list, mode];
    if (next.length === 0) return;
    patch(key, next as WebsiteConfig[typeof key]);
  }

  async function uploadBanner(file: File) {
    setUploading(true);
    setMsg(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/website/banners", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Upload failed");
      const banner: WebsiteBanner = {
        id: `b-${Date.now()}`,
        imageUrl: json.data.url,
        alt: file.name.replace(/\.[^.]+$/, ""),
      };
      setConfig((c) =>
        c ? { ...c, banners: [...c.banners, banner].slice(0, 8) } : c,
      );
      setMsg({ ok: true, text: "Banner uploaded — save to publish." });
    } catch (err) {
      setMsg({
        ok: false,
        text: err instanceof Error ? err.message : "Upload failed",
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/website", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Save failed");
      setConfig(json.data);
      setMsg({ ok: true, text: "Website settings saved." });
    } catch (err) {
      setMsg({
        ok: false,
        text: err instanceof Error ? err.message : "Could not save",
      });
    } finally {
      setSaving(false);
    }
  }

  if (fetching || !config) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <ModuleHeader
          title="Website"
          subtitle="Themes, banners, SEO & checkout modes"
        />
        <SkeletonRows count={8} />
      </div>
    );
  }

  const previewHref = `/store/${slug}`;

  return (
    <form onSubmit={save} className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <ModuleHeader
        title="Website"
        subtitle="Checkout modes, banners, and SEO. Visual theme editing lives in Store builder."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/commerce/builder"
              className="inline-flex items-center rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-accent-ink"
            >
              Store builder
            </Link>
            <Link
              href={previewHref}
              target="_blank"
              className="inline-flex items-center rounded-xl border border-line bg-surface-1 px-3 py-2 text-sm font-semibold text-text-body transition hover:border-accent hover:text-accent"
            >
              Preview store
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        }
      />

      {msg && (
        <p
          className={`mt-4 rounded-xl border px-4 py-2.5 text-sm ${
            msg.ok
              ? "border-[color-mix(in_oklch,var(--tint-green)_35%,var(--line))] bg-[color-mix(in_oklch,var(--tint-green)_10%,transparent)] text-tint-green"
              : "border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          {msg.text}
        </p>
      )}

      <section className="mt-6 space-y-4 rounded-2xl border border-line bg-surface-1 p-5">
        <h2 className="text-sm font-semibold text-text-strong">Store status</h2>
        <label className="flex items-center gap-3 text-sm text-text-body">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => patch("enabled", e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Public website enabled
        </label>
        <p className="text-xs text-text-dim">
          When disabled,{" "}
          <code className="rounded bg-surface-2 px-1">{previewHref}</code> shows
          unavailable. Also mirrors Settings → Enable Public Website when unset.
        </p>
      </section>

      <section className="mt-4 space-y-4 rounded-2xl border border-line bg-surface-1 p-5">
        <h2 className="text-sm font-semibold text-text-strong">Theme</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {THEME_PRESETS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => patch("theme", t as ThemePreset)}
              className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                config.theme === t
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-line bg-surface-2 text-text-dim hover:border-accent"
              }`}
            >
              {THEME_LABELS[t]}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4 space-y-4 rounded-2xl border border-line bg-surface-1 p-5">
        <h2 className="text-sm font-semibold text-text-strong">Hero & announcement</h2>
        <Field
          label="Announcement bar"
          value={config.announcementBar}
          onChange={(v) => patch("announcementBar", v)}
        />
        <Field
          label="Hero headline"
          value={config.heroHeadline}
          onChange={(v) => patch("heroHeadline", v)}
        />
        <Field
          label="Hero subline"
          value={config.heroSubline}
          onChange={(v) => patch("heroSubline", v)}
        />
        <label className="block text-xs text-text-dim">
          About
          <textarea
            value={config.about}
            onChange={(e) => patch("about", e.target.value)}
            rows={3}
            className={`mt-1 ${fieldClass}`}
          />
        </label>
      </section>

      <section className="mt-4 space-y-4 rounded-2xl border border-line bg-surface-1 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-text-strong">Banners</h2>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadBanner(f);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              disabled={uploading || config.banners.length >= 8}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? "Uploading…" : "Upload banner"}
            </Button>
          </div>
        </div>
        {config.banners.length === 0 ? (
          <p className="text-sm text-text-dim">No banners yet — upload one above.</p>
        ) : (
          <ul className="space-y-3">
            {config.banners.map((b, i) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-2/60 p-3"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.imageUrl}
                  alt={b.alt || "Banner"}
                  className="h-16 w-24 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <input
                    value={b.alt}
                    onChange={(e) => {
                      const banners = config.banners.map((x, idx) =>
                        idx === i ? { ...x, alt: e.target.value } : x,
                      );
                      patch("banners", banners);
                    }}
                    placeholder="Alt text"
                    className={fieldClass}
                  />
                  <input
                    value={b.href || ""}
                    onChange={(e) => {
                      const banners = config.banners.map((x, idx) =>
                        idx === i ? { ...x, href: e.target.value || undefined } : x,
                      );
                      patch("banners", banners);
                    }}
                    placeholder="Optional link URL"
                    className={fieldClass}
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    patch(
                      "banners",
                      config.banners.filter((_, idx) => idx !== i),
                    )
                  }
                  className="rounded-lg px-2 py-1 text-xs text-danger hover:bg-danger/10"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 space-y-4 rounded-2xl border border-line bg-surface-1 p-5">
        <h2 className="text-sm font-semibold text-text-strong">SEO & social</h2>
        <Field
          label="SEO title"
          value={config.seoTitle}
          onChange={(v) => patch("seoTitle", v)}
        />
        <label className="block text-xs text-text-dim">
          SEO description
          <textarea
            value={config.seoDescription}
            onChange={(e) => patch("seoDescription", e.target.value)}
            rows={2}
            className={`mt-1 ${fieldClass}`}
          />
        </label>
        <Field
          label="OG image URL"
          value={config.ogImageUrl}
          onChange={(v) => patch("ogImageUrl", v)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Facebook URL"
            value={config.socialFacebook}
            onChange={(v) => patch("socialFacebook", v)}
          />
          <Field
            label="Instagram URL"
            value={config.socialInstagram}
            onChange={(v) => patch("socialInstagram", v)}
          />
          <Field
            label="Twitter / X URL"
            value={config.socialTwitter}
            onChange={(v) => patch("socialTwitter", v)}
          />
          <Field
            label="TikTok URL"
            value={config.socialTiktok}
            onChange={(v) => patch("socialTiktok", v)}
          />
        </div>
      </section>

      <section className="mt-4 space-y-4 rounded-2xl border border-line bg-surface-1 p-5">
        <h2 className="text-sm font-semibold text-text-strong">WhatsApp</h2>
        <label className="block text-xs text-text-dim">
          Order contact number (07… / +94 7… — not email)
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+94 77 959 2288"
            value={config.whatsappNumber}
            onChange={(e) => patch("whatsappNumber", e.target.value)}
            className={`mt-1 ${fieldClass}`}
          />
        </label>
        <p className="text-xs text-text-dim">
          Powers the storefront “Order via WhatsApp” cart button (`wa.me`).
        </p>
        <label className="block text-xs text-text-dim">
          Order message template
          <textarea
            value={config.whatsappOrderTemplate}
            onChange={(e) => patch("whatsappOrderTemplate", e.target.value)}
            rows={3}
            className={`mt-1 ${fieldClass}`}
          />
        </label>
        <label className="block text-xs text-text-dim">
          Catalog link template
          <textarea
            value={config.whatsappCatalogTemplate}
            onChange={(e) => patch("whatsappCatalogTemplate", e.target.value)}
            rows={2}
            className={`mt-1 ${fieldClass}`}
          />
        </label>
        <p className="text-xs text-text-dim">
          Tokens: {"{{business}}"}, {"{{items}}"}, {"{{total}}"}, {"{{catalogUrl}}"}
        </p>
      </section>

      <section className="mt-4 space-y-4 rounded-2xl border border-line bg-surface-1 p-5">
        <h2 className="text-sm font-semibold text-text-strong">Checkout modes</h2>
        <p className="text-xs text-text-dim">
          Workflows only — no live card gateway or PickMe/Uber booking in this pass.
        </p>
        <div>
          <p className="mb-2 text-xs font-medium text-text-dim">Payment</p>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_MODES.map((m) => (
              <Chip
                key={m}
                active={config.paymentModes.includes(m)}
                label={PAYMENT_LABELS[m]}
                onClick={() =>
                  toggleMode("paymentModes", m as PaymentMode, config.paymentModes)
                }
              />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-text-dim">Fulfilment</p>
          <div className="flex flex-wrap gap-2">
            {FULFILMENT_MODES.map((m) => (
              <Chip
                key={m}
                active={config.fulfilmentModes.includes(m)}
                label={FULFILMENT_LABELS[m]}
                onClick={() =>
                  toggleMode(
                    "fulfilmentModes",
                    m as FulfilmentMode,
                    config.fulfilmentModes,
                  )
                }
              />
            ))}
          </div>
        </div>
        <label className="block text-xs text-text-dim">
          Bank transfer instructions
          <textarea
            value={config.bankTransferInstructions}
            onChange={(e) => patch("bankTransferInstructions", e.target.value)}
            rows={3}
            className={`mt-1 ${fieldClass}`}
          />
        </label>
        <label className="block text-xs text-text-dim">
          Pickup instructions
          <textarea
            value={config.pickupInstructions}
            onChange={(e) => patch("pickupInstructions", e.target.value)}
            rows={2}
            className={`mt-1 ${fieldClass}`}
          />
        </label>
      </section>

      <section className="mt-4 space-y-3 rounded-2xl border border-line bg-surface-1 p-5">
        <h2 className="text-sm font-semibold text-text-strong">Catalog & feeds</h2>
        <p className="text-xs text-text-dim">
          Export WhatsApp / Meta-ready catalog files and ad feeds from Marketing
          tools below.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/store/${slug}/catalog?format=csv`}
            className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs font-semibold text-text-body hover:border-accent"
          >
            WhatsApp catalog CSV
          </a>
          <a
            href={`/api/store/${slug}/catalog?format=json`}
            className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs font-semibold text-text-body hover:border-accent"
          >
            Catalog JSON
          </a>
          <a
            href={`/api/store/${slug}/feed/meta`}
            className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs font-semibold text-text-body hover:border-accent"
          >
            Meta feed
          </a>
          <a
            href={`/api/store/${slug}/feed/google`}
            className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs font-semibold text-text-body hover:border-accent"
          >
            Google feed
          </a>
        </div>
      </section>

      <div className="mt-6 flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-xs text-text-dim">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1 ${fieldClass}`}
      />
    </label>
  );
}

function Chip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-accent text-accent-ink"
          : "border border-line bg-surface-2 text-text-dim hover:border-accent"
      }`}
    >
      {label}
    </button>
  );
}

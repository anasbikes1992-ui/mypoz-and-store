"use client";

import { useCallback, useState } from "react";

export function ProductShareButtons({
  title,
  url,
  whatsappNumber,
}: {
  title: string;
  url: string;
  whatsappNumber?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [url]);

  const shareNative = useCallback(async () => {
    if (typeof navigator.share !== "function") {
      void copyLink();
      return;
    }
    try {
      await navigator.share({ title, url });
    } catch {
      /* user cancelled */
    }
  }, [copyLink, title, url]);

  const waHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Hi, I want to order ${title}\n${url}`,
      )}`
    : null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => void shareNative()}
        className="inline-flex min-h-9 items-center rounded-[var(--mp-radius)] border border-line px-3 text-sm font-medium text-text-strong transition hover:border-accent"
      >
        Share
      </button>
      <button
        type="button"
        onClick={() => void copyLink()}
        className="inline-flex min-h-9 items-center rounded-[var(--mp-radius)] border border-line px-3 text-sm font-medium text-text-strong transition hover:border-accent"
      >
        {copied ? "Copied" : "Copy link"}
      </button>
      {waHref ? (
        <a
          href={waHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-9 items-center rounded-[var(--mp-radius)] border border-line px-3 text-sm font-medium text-text-strong transition hover:border-accent"
        >
          WhatsApp
        </a>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect } from "react";

export function CommerceTracker({
  slug,
  type,
  path,
  productId,
}: {
  slug: string;
  type: "page_view" | "product_view";
  path: string;
  productId?: string;
}) {
  useEffect(() => {
    void fetch(`/api/store/${slug}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, path, productId }),
    }).catch(() => undefined);
  }, [slug, type, path, productId]);
  return null;
}

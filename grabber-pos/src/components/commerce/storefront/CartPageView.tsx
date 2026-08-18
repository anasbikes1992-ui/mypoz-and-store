"use client";

import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { useCart } from "@/app/store/[slug]/cart";
import { storeCopy } from "@/lib/commerce/i18n";

export function CartPageView({
  slug,
  locale,
}: {
  slug: string;
  locale: "en" | "si" | "ta";
}) {
  const { lines, total, setQuantity, count } = useCart();
  const copy = storeCopy(locale);

  if (!lines.length) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">{copy.cart}</h1>
        <p className="mt-4 text-text-dim">{copy.emptyCart}</p>
        <Link
          href={`/store/${slug}/products`}
          className="mt-6 inline-block rounded-xl bg-accent px-6 py-3 text-sm font-bold text-accent-ink"
        >
          {copy.shopNow}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">
        {copy.cart} ({count})
      </h1>
      <ul className="mt-6 space-y-3">
        {lines.map((l) => (
          <li
            key={l.variantId ? `${l.productId}:${l.variantId}` : l.productId}
            className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface-2/50 p-4"
          >
            <div className="min-w-0">
              <p className="font-medium">{l.name}</p>
              <p className="text-sm text-[var(--tint-green)]">{formatMoney(l.price)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity(l.productId, l.quantity - 1, l.variantId)}
                className="h-8 w-8 rounded-lg border border-line"
              >
                −
              </button>
              <span className="w-6 text-center tabular-nums">{l.quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(l.productId, l.quantity + 1, l.variantId)}
                className="h-8 w-8 rounded-lg border border-line"
              >
                +
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
        <span className="text-lg font-bold">{formatMoney(total)}</span>
        <Link
          href={`/store/${slug}/checkout`}
          className="rounded-xl bg-accent px-6 py-3 text-sm font-bold text-accent-ink"
        >
          {copy.checkout}
        </Link>
      </div>
    </div>
  );
}

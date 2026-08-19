"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { BillPanel } from "@/components/pos/BillPanel";
import { Button } from "@/components/ui/Button";
import { useCartStore } from "@/lib/store/cart-store";
import { formatMoney } from "@/lib/format";
import type { Product } from "@/lib/types";
import type { ProductVariant } from "@/lib/commerce/variant-types";
import {
  findVariantByOptions,
  groupVariantOptions,
} from "@/lib/commerce/line-ids";

function PosWorkspace() {
  const params = useSearchParams();
  const addProduct = useCartStore((s) => s.addProduct);
  const addCustomLine = useCartStore((s) => s.addCustomLine);
  const setCustomerName = useCartStore((s) => s.setCustomerName);
  const isWholesale = useCartStore((s) => s.isWholesale);
  const setWholesale = useCartStore((s) => s.setWholesale);
  const categoryMode = params.get("mode") === "category";

  const [variantPick, setVariantPick] = useState<{
    product: Product;
    variants: ProductVariant[];
  } | null>(null);
  const [opt1, setOpt1] = useState<string | null>(null);
  const [opt2, setOpt2] = useState<string | null>(null);
  const [opt3, setOpt3] = useState<string | null>(null);

  useEffect(() => {
    if (params.get("mode") === "wholesale") setWholesale(true);
  }, [params, setWholesale]);

  useEffect(() => {
    const customer = params.get("customer");
    const amount = params.get("amount");
    const quote = params.get("quote");
    if (customer) setCustomerName(customer);
    if (amount && !Number.isNaN(Number(amount)) && Number(amount) > 0) {
      addCustomLine({
        name: quote ? "Quotation amount" : "Quoted amount",
        unitPrice: Number(amount),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePick(product: Product) {
    try {
      const res = await fetch(`/api/products/${product.id}/variants`);
      const json = await res.json();
      const variants = (json.success ? json.data : []) as ProductVariant[];
      if (variants.length === 0) {
        addProduct(product);
        return;
      }
      const grouped = groupVariantOptions(variants);
      setOpt1(grouped.option1[0] ?? null);
      setOpt2(grouped.option2[0] ?? null);
      setOpt3(grouped.option3[0] ?? null);
      setVariantPick({ product, variants });
    } catch {
      addProduct(product);
    }
  }

  function confirmVariant() {
    if (!variantPick) return;
    const grouped = groupVariantOptions(variantPick.variants);
    const selected =
      grouped.option1.length || grouped.option2.length
        ? findVariantByOptions(variantPick.variants, {
            option1: opt1,
            option2: opt2,
            option3: opt3,
          })
        : variantPick.variants[0];
    if (!selected) return;
    const p = variantPick.product;
    addProduct({
      ...p,
      id: `${p.id}:${selected.id}`,
      name: `${p.name} — ${selected.title}`,
      salePrice: Number(selected.salePrice ?? p.salePrice) || 0,
      quantity: Number(selected.quantity) || 0,
      variantId: selected.id,
      barcodes: selected.barcode
        ? [selected.barcode, ...(p.barcodes ?? [])]
        : p.barcodes,
    });
    setVariantPick(null);
  }

  const grouped = variantPick ? groupVariantOptions(variantPick.variants) : null;
  const selectedVariant =
    variantPick && grouped
      ? findVariantByOptions(variantPick.variants, {
          option1: opt1,
          option2: opt2,
          option3: opt3,
        }) ?? variantPick.variants[0]
      : null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-h-0 flex-col overflow-hidden px-4 py-3">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-text-strong">
            {categoryMode
              ? "Category sale"
              : isWholesale
                ? "Wholesale"
                : "Retail"}
          </h1>
          <p className="text-[11px] text-text-dim">
            Scan · tap · Take payment
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-xs">
          <span className={isWholesale ? "text-text-dim" : "text-accent"}>
            Retail
          </span>
          <button
            role="switch"
            aria-checked={isWholesale}
            aria-label="Toggle wholesale pricing"
            onClick={() => setWholesale(!isWholesale)}
            className={`relative h-5 w-9 rounded-full transition ${
              isWholesale ? "bg-accent" : "bg-surface-3"
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-accent-ink transition-all ${
                isWholesale ? "left-[18px]" : "left-0.5"
              }`}
            />
          </button>
          <span className={isWholesale ? "text-accent" : "text-text-dim"}>
            Wholesale
          </span>
        </div>
      </div>

      {categoryMode && (
        <div className="mt-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-1.5 text-xs text-accent">
          Category mode — barcode is secondary.
        </div>
      )}

      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden lg:flex-row">
        <section className="min-h-0 min-w-0 flex-1 overflow-hidden" aria-label="Product catalog">
          <ProductGrid onPick={handlePick} categoryMode={categoryMode} />
        </section>
        <section
          className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden lg:w-[24rem]"
          aria-label="Bill"
        >
          <BillPanel />
        </section>
      </div>

      {variantPick && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Select variant"
        >
          <div className="w-full max-w-sm rounded-xl border border-line bg-surface-1 p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-text-strong">Select variant</h3>
            <p className="mt-1 text-xs text-text-dim">{variantPick.product.name}</p>
            {grouped?.option1.length ? (
              <ChipRow label="Option 1" values={grouped.option1} value={opt1} onChange={setOpt1} />
            ) : null}
            {grouped?.option2.length ? (
              <ChipRow label="Option 2" values={grouped.option2} value={opt2} onChange={setOpt2} />
            ) : null}
            {grouped?.option3.length ? (
              <ChipRow label="Option 3" values={grouped.option3} value={opt3} onChange={setOpt3} />
            ) : null}
            {!grouped?.option1.length ? (
              <label className="mt-4 block text-sm">
                <span className="mb-1 block text-text-dim">Variant / SKU</span>
                <select
                  value={selectedVariant?.id ?? ""}
                  onChange={(e) => {
                    const v = variantPick.variants.find((x) => x.id === e.target.value);
                    if (!v) return;
                    setOpt1(v.option1);
                    setOpt2(v.option2);
                    setOpt3(v.option3);
                  }}
                  className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
                  autoFocus
                >
                  {variantPick.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.title} · {v.sku} · {formatMoney(Number(v.salePrice ?? variantPick.product.salePrice) || 0)}
                      {` · ${v.quantity} left`}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {selectedVariant ? (
              <p className="mt-3 text-sm text-text-dim">
                {selectedVariant.title} · {formatMoney(Number(selectedVariant.salePrice ?? variantPick.product.salePrice) || 0)} · {selectedVariant.quantity} left
              </p>
            ) : (
              <p className="mt-3 text-sm text-danger">That combination is not in stock as a SKU.</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setVariantPick(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={confirmVariant} disabled={!selectedVariant}>
                Add to bill
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChipRow({
  label,
  values,
  value,
  onChange,
}: {
  label: string;
  values: string[];
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold text-text-dim">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              value === v ? "bg-accent text-accent-ink" : "border border-line"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PosPage() {
  return (
    <Suspense fallback={<div className="p-8 text-text-dim">Loading…</div>}>
      <PosWorkspace />
    </Suspense>
  );
}

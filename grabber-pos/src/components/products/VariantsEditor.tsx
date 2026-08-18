"use client";

import { useEffect, useState } from "react";
import { cartesianVariants } from "@/lib/commerce/line-ids";
import type { ProductVariant } from "@/lib/commerce/variant-types";

export function VariantsEditor({ productId }: { productId: string }) {
  const [rows, setRows] = useState<ProductVariant[]>([]);
  const [axis1, setAxis1] = useState("Size");
  const [vals1, setVals1] = useState("S, M, L");
  const [axis2, setAxis2] = useState("Color");
  const [vals2, setVals2] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/products/${productId}/variants`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j.success) setRows(j.data as ProductVariant[]);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [productId]);

  function generate() {
    const generated = cartesianVariants([
      { name: axis1, values: vals1.split(/[,/]+/) },
      { name: axis2, values: vals2.split(/[,/]+/) },
    ]);
    setRows(
      generated.map((g, i) => ({
        id: `new_${i}_${g.skuHint}`,
        productId,
        sku: `${productId.slice(0, 6)}-${g.skuHint}`.toUpperCase(),
        title: g.title,
        option1: g.option1,
        option2: g.option2,
        option3: g.option3,
        salePrice: null,
        compareAtPrice: null,
        costPrice: null,
        barcode: null,
        imageUrl: null,
        position: i,
        quantity: 0,
        isActive: true,
      })),
    );
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/products/${productId}/variants`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          rows.map((r, i) => ({
            id: r.id.startsWith("new_") ? undefined : r.id,
            sku: r.sku,
            title: r.title,
            option1: r.option1,
            option2: r.option2,
            option3: r.option3,
            salePrice: r.salePrice,
            quantity: r.quantity,
            barcode: r.barcode,
            position: i,
            isActive: true,
          })),
        ),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Save failed");
      setRows(json.data as ProductVariant[]);
      setMsg("Variants saved — POS and the online store now share these SKUs.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not save variants");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-line bg-surface-2/40 p-4">
      <h3 className="text-sm font-semibold">Variants (POS + online)</h3>
      <p className="mt-1 text-xs text-text-dim">
        Size and colour SKUs share one inventory with the storefront. Leave empty for simple products.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          value={axis1}
          onChange={(e) => setAxis1(e.target.value)}
          placeholder="Option 1 name (Size)"
          className="rounded-lg border border-line bg-surface-1 px-3 py-2 text-sm"
        />
        <input
          value={vals1}
          onChange={(e) => setVals1(e.target.value)}
          placeholder="S, M, L, XL"
          className="rounded-lg border border-line bg-surface-1 px-3 py-2 text-sm"
        />
        <input
          value={axis2}
          onChange={(e) => setAxis2(e.target.value)}
          placeholder="Option 2 name (Color)"
          className="rounded-lg border border-line bg-surface-1 px-3 py-2 text-sm"
        />
        <input
          value={vals2}
          onChange={(e) => setVals2(e.target.value)}
          placeholder="Black, White"
          className="rounded-lg border border-line bg-surface-1 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="button"
        onClick={generate}
        className="mt-2 text-xs font-semibold text-accent"
      >
        Generate SKU matrix
      </button>
      {rows.length > 0 ? (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="text-text-dim">
              <tr>
                <th className="py-1 pr-2">Title</th>
                <th className="py-1 pr-2">SKU</th>
                <th className="py-1 pr-2">Price</th>
                <th className="py-1 pr-2">Qty</th>
                <th className="py-1">Barcode</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="py-1 pr-2">{r.title}</td>
                  <td className="py-1 pr-2">
                    <input
                      value={r.sku}
                      onChange={(e) =>
                        setRows(rows.map((x, idx) => (idx === i ? { ...x, sku: e.target.value } : x)))
                      }
                      className="w-28 rounded border border-line bg-surface-1 px-1 py-0.5"
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      value={r.salePrice ?? ""}
                      onChange={(e) =>
                        setRows(
                          rows.map((x, idx) =>
                            idx === i
                              ? { ...x, salePrice: e.target.value === "" ? null : Number(e.target.value) }
                              : x,
                          ),
                        )
                      }
                      className="w-20 rounded border border-line bg-surface-1 px-1 py-0.5"
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      value={r.quantity}
                      onChange={(e) =>
                        setRows(
                          rows.map((x, idx) =>
                            idx === i ? { ...x, quantity: Number(e.target.value) || 0 } : x,
                          ),
                        )
                      }
                      className="w-16 rounded border border-line bg-surface-1 px-1 py-0.5"
                    />
                  </td>
                  <td className="py-1">
                    <input
                      value={r.barcode ?? ""}
                      onChange={(e) =>
                        setRows(
                          rows.map((x, idx) =>
                            idx === i ? { ...x, barcode: e.target.value || null } : x,
                          ),
                        )
                      }
                      className="w-24 rounded border border-line bg-surface-1 px-1 py-0.5"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save variants"}
        </button>
        {msg ? <span className="text-xs text-text-dim">{msg}</span> : null}
      </div>
    </div>
  );
}

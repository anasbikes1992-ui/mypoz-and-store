"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Product } from "@/lib/types";
import { VariantsEditor } from "./VariantsEditor";

interface ProductFormProps {
  open: boolean;
  product: Product | null; // null = create
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  name: string;
  nameLocal: string;
  barcodes: string;
  brand: string;
  category: string;
  costPrice: string;
  salePrice: string;
  wholesalePrice: string;
  vipPrice: string;
  minWholesaleQty: string;
  maxDiscount: string;
  singleDiscount: string;
  quantity: string;
  expireDate: string;
  warrantyMonths: string;
  supplier: string;
  imageUrl: string;
}

function toForm(p: Product | null): FormState {
  return {
    name: p?.name ?? "",
    nameLocal: p?.nameLocal ?? "",
    barcodes: p?.barcodes.join(", ") ?? "",
    brand: p?.brand ?? "",
    category: p?.category ?? "Uncategorized",
    costPrice: p ? String(p.costPrice) : "",
    salePrice: p ? String(p.salePrice) : "",
    wholesalePrice: p?.wholesalePrice != null ? String(p.wholesalePrice) : "",
    vipPrice: p?.vipPrice != null ? String(p.vipPrice) : "",
    minWholesaleQty:
      p?.minWholesaleQty != null && p.minWholesaleQty > 0
        ? String(p.minWholesaleQty)
        : "",
    maxDiscount: p ? String(p.maxDiscount) : "0",
    singleDiscount: p ? String(p.singleDiscount) : "0",
    quantity: p ? String(p.quantity) : "0",
    expireDate: p?.expireDate ?? "",
    warrantyMonths: p ? String(p.warrantyMonths) : "0",
    supplier: p?.supplier ?? "",
    imageUrl: p?.imageUrl ?? "",
  };
}

export function ProductForm({
  open,
  product,
  onClose,
  onSaved,
}: ProductFormProps) {
  const [form, setForm] = useState<FormState>(toForm(product));
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  // Reset when the target product changes.
  const [lastId, setLastId] = useState<string | null>(product?.id ?? null);
  if ((product?.id ?? null) !== lastId) {
    setLastId(product?.id ?? null);
    setForm(toForm(product));
    setError(null);
  }

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function uploadImage() {
    if (!file) {
      setError("Choose an image file first");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/products/image", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Upload failed");
        return;
      }
      set("imageUrl", json.data.url);
      setFile(null);
    } catch {
      setError("Could not upload image");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const payload = {
        name: form.name.trim(),
        nameLocal: form.nameLocal.trim() || null,
        barcodes: form.barcodes
          .split(/[,\s]+/)
          .map((b) => b.trim())
          .filter(Boolean),
        brand: form.brand.trim() || null,
        category: form.category.trim() || "Uncategorized",
        costPrice: Number(form.costPrice) || 0,
        salePrice: Number(form.salePrice) || 0,
        wholesalePrice: form.wholesalePrice ? Number(form.wholesalePrice) : null,
        vipPrice: form.vipPrice ? Number(form.vipPrice) : null,
        minWholesaleQty: form.minWholesaleQty
          ? Math.max(0, Math.floor(Number(form.minWholesaleQty) || 0))
          : 0,
        maxDiscount: Number(form.maxDiscount) || 0,
        singleDiscount: Number(form.singleDiscount) || 0,
        quantity: Number(form.quantity) || 0,
        expireDate: form.expireDate || null,
        warrantyMonths: Number(form.warrantyMonths) || 0,
        supplier: form.supplier.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
      };
      const res = await fetch(
        product ? `/api/products/${product.id}` : "/api/products",
        {
          method: product ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Save failed");
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Could not reach the server");
    } finally {
      setPending(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-overlay p-6 backdrop-blur-sm"
        >
          <motion.form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className="my-4 w-full max-w-2xl rounded-2xl border border-line bg-surface-1 p-6 shadow-2xl"
          >
            <h1 className="text-lg font-semibold text-text-strong">
              {product ? "Edit product" : "New product"}
            </h1>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Text label="Name" value={form.name} onChange={(v) => set("name", v)} required span />
              <Text label="Local name" value={form.nameLocal} onChange={(v) => set("nameLocal", v)} span />
              <Text label="Barcodes (comma / space separated)" value={form.barcodes} onChange={(v) => set("barcodes", v)} span />
              <Text label="Brand" value={form.brand} onChange={(v) => set("brand", v)} />
              <Text label="Category" value={form.category} onChange={(v) => set("category", v)} />
              <Num label="Cost price" value={form.costPrice} onChange={(v) => set("costPrice", v)} />
              <Num label="Sale price" value={form.salePrice} onChange={(v) => set("salePrice", v)} required />
              <Num label="Wholesale price" value={form.wholesalePrice} onChange={(v) => set("wholesalePrice", v)} />
              <Num label="VIP price" value={form.vipPrice} onChange={(v) => set("vipPrice", v)} />
              <Num label="Wholesale MOQ" value={form.minWholesaleQty} onChange={(v) => set("minWholesaleQty", v)} />
              <Num label="Quantity" value={form.quantity} onChange={(v) => set("quantity", v)} />
              <Num label="Max discount" value={form.maxDiscount} onChange={(v) => set("maxDiscount", v)} />
              <Num label="Default discount" value={form.singleDiscount} onChange={(v) => set("singleDiscount", v)} />
              <Num label="Warranty (months)" value={form.warrantyMonths} onChange={(v) => set("warrantyMonths", v)} />
              <Text label="Supplier" value={form.supplier} onChange={(v) => set("supplier", v)} />
              <label className="text-sm">
                <span className="mb-1 block text-text-dim">Expiry date</span>
                <input
                  id="product-expiry-date"
                  aria-label="Expiry date"
                  type="date"
                  value={form.expireDate}
                  onChange={(e) => set("expireDate", e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
                />
              </label>
              <label className="col-span-2 text-sm">
                <span className="mb-1 block text-text-dim">Image URL</span>
                <div className="flex items-center gap-3">
                  <input
                    value={form.imageUrl}
                    onChange={(e) => set("imageUrl", e.target.value)}
                    placeholder="https://… or upload below"
                    className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
                  />
                  {form.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.imageUrl}
                      alt="preview"
                      className="h-11 w-11 shrink-0 rounded object-cover"
                    />
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="text-xs text-text-dim file:mr-2 file:rounded file:border file:border-line file:bg-surface-2 file:px-2 file:py-1 file:text-text-body"
                  />
                  <button
                    type="button"
                    disabled={uploading || !file}
                    onClick={() => void uploadImage()}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs text-text-body transition hover:border-accent hover:text-accent disabled:opacity-40"
                  >
                    {uploading ? "Uploading…" : "Upload"}
                  </button>
                </div>
              </label>
            </div>

            {product?.id ? <VariantsEditor productId={product.id} /> : (
              <p className="mt-4 text-xs text-text-dim">
                Save the product first, then add size/colour variants. Those SKUs are shared with the online store.
              </p>
            )}

            {error && (
              <p className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-line px-4 py-2.5 text-sm text-text-dim transition hover:text-text-body"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-strong disabled:opacity-50"
              >
                {pending ? "Saving…" : product ? "Save changes" : "Create product"}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Text({
  label,
  value,
  onChange,
  required,
  span,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  span?: boolean;
}) {
  return (
    <label className={`text-sm ${span ? "col-span-2" : ""}`}>
      <span className="mb-1 block text-text-dim">{label}</span>
      <input
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
      />
    </label>
  );
}

function Num({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-text-dim">{label}</span>
      <input
        type="number"
        min={0}
        step="0.01"
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
      />
    </label>
  );
}

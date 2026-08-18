import "server-only";
import { randomUUID } from "crypto";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { recordStore } from "./persistence/record-store";
import { listCollection } from "./collection-store";
import type { ProductVariant, VariantDraft } from "@/lib/commerce/variant-types";

const local = recordStore<ProductVariant>({
  collection: "product-variants",
  file: "product-variants.json",
});

function fromLegacy(row: Record<string, unknown>): ProductVariant {
  return {
    id: String(row.id ?? `VAR-${randomUUID().slice(0, 8)}`),
    productId: String(row.productId ?? ""),
    sku: String(row.sku ?? ""),
    title: String(row.name ?? row.title ?? row.sku ?? "Variant"),
    option1: (row.option1 as string) ?? null,
    option2: (row.option2 as string) ?? null,
    option3: (row.option3 as string) ?? null,
    salePrice: row.price != null ? Number(row.price) : row.salePrice != null ? Number(row.salePrice) : null,
    compareAtPrice: row.compareAtPrice != null ? Number(row.compareAtPrice) : null,
    costPrice: row.costPrice != null ? Number(row.costPrice) : null,
    barcode: (row.barcode as string) ?? null,
    imageUrl: (row.imageUrl as string) ?? null,
    position: Number(row.position ?? 0),
    quantity: Number(row.quantity ?? 0),
    isActive: row.isActive !== false,
  };
}

async function listLocal(productId?: string): Promise<ProductVariant[]> {
  const canonical = await local.list();
  let legacy: ProductVariant[] = [];
  try {
    const rows = await listCollection("variants");
    legacy = rows.map((r) => fromLegacy(r as Record<string, unknown>));
  } catch {
    legacy = [];
  }
  const byKey = new Map<string, ProductVariant>();
  for (const v of legacy) {
    if (v.productId) byKey.set(`${v.productId}:${v.sku}`, v);
  }
  for (const v of canonical) {
    byKey.set(`${v.productId}:${v.sku}`, v);
  }
  const all = [...byKey.values()].filter((v) => v.isActive !== false);
  if (!productId) return all.sort((a, b) => a.position - b.position);
  return all
    .filter((v) => String(v.productId) === String(productId))
    .sort((a, b) => a.position - b.position);
}

async function listSupabase(productId?: string): Promise<ProductVariant[]> {
  const { createServerSupabase } = await import("@/lib/supabase/server");
  const db = await createServerSupabase();
  let q = db
    .from("product_variants")
    .select(
      "id, product_id, sku, title, option1, option2, option3, sale_price, compare_at_price, cost_price, barcode, image_url, position, is_active, variant_branch_stock(quantity, branch_id)",
    )
    .eq("is_active", true)
    .order("position", { ascending: true });
  if (productId) q = q.eq("product_id", productId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const stocks = (r.variant_branch_stock as { quantity: number }[] | null) ?? [];
    const qty = stocks.reduce((s, x) => s + Number(x.quantity || 0), 0);
    return {
      id: String(r.id),
      productId: String(r.product_id),
      sku: String(r.sku),
      title: String(r.title),
      option1: (r.option1 as string) ?? null,
      option2: (r.option2 as string) ?? null,
      option3: (r.option3 as string) ?? null,
      salePrice: r.sale_price != null ? Number(r.sale_price) : null,
      compareAtPrice: r.compare_at_price != null ? Number(r.compare_at_price) : null,
      costPrice: r.cost_price != null ? Number(r.cost_price) : null,
      barcode: (r.barcode as string) ?? null,
      imageUrl: (r.image_url as string) ?? null,
      position: Number(r.position ?? 0),
      quantity: qty,
      isActive: r.is_active !== false,
    };
  });
}

export async function listVariants(productId?: string): Promise<ProductVariant[]> {
  if (isSupabaseEnabled) {
    try {
      return await listSupabase(productId);
    } catch {
      return listLocal(productId);
    }
  }
  return listLocal(productId);
}

export async function replaceProductVariants(
  productId: string,
  drafts: VariantDraft[],
): Promise<ProductVariant[]> {
  if (isSupabaseEnabled) {
    try {
      return await replaceSupabase(productId, drafts);
    } catch {
      // fall through to local so demo still works
    }
  }
  const existing = (await local.list()).filter((v) => v.productId !== productId);
  const next = drafts.map((d, i) => ({
    id: d.id && !d.id.startsWith("new_") ? d.id : `VAR-${randomUUID().slice(0, 8)}`,
    productId,
    sku: d.sku.trim(),
    title: d.title.trim(),
    option1: d.option1 ?? null,
    option2: d.option2 ?? null,
    option3: d.option3 ?? null,
    salePrice: d.salePrice,
    compareAtPrice: d.compareAtPrice,
    costPrice: d.costPrice,
    barcode: d.barcode ?? null,
    imageUrl: d.imageUrl ?? null,
    position: d.position ?? i,
    quantity: d.quantity ?? 0,
    isActive: d.isActive !== false,
  }));
  const stale = (await local.list()).filter((v) => v.productId === productId);
  for (const s of stale) await local.remove(s.id);
  await local.putMany([...existing.filter((v) => v.productId !== productId), ...next]);
  return next;
}

async function replaceSupabase(
  productId: string,
  drafts: VariantDraft[],
): Promise<ProductVariant[]> {
  const { createServerSupabase } = await import("@/lib/supabase/server");
  const db = await createServerSupabase();
  const { data: branch } = await db
    .from("branches")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>();

  const { data: existing, error: listErr } = await db
    .from("product_variants")
    .select("id")
    .eq("product_id", productId);
  if (listErr) throw new Error(listErr.message);

  const keepIds = new Set(drafts.map((d) => d.id).filter(Boolean));
  const toDelete = (existing ?? [])
    .map((r) => (r as { id: string }).id)
    .filter((id) => !keepIds.has(id));
  if (toDelete.length) {
    await db.from("product_variants").delete().in("id", toDelete);
  }

  const saved: ProductVariant[] = [];
  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i]!;
    const row = {
      product_id: productId,
      sku: d.sku.trim(),
      title: d.title.trim(),
      option1: d.option1 ?? null,
      option2: d.option2 ?? null,
      option3: d.option3 ?? null,
      sale_price: d.salePrice,
      compare_at_price: d.compareAtPrice,
      cost_price: d.costPrice,
      barcode: d.barcode ?? null,
      image_url: d.imageUrl ?? null,
      position: d.position ?? i,
      is_active: d.isActive !== false,
    };
    const upsert = d.id && isUuidish(d.id)
      ? await db.from("product_variants").update(row).eq("id", d.id).select("id").maybeSingle()
      : await db.from("product_variants").insert(row).select("id").maybeSingle();
    if (upsert.error) throw new Error(upsert.error.message);
    const id = (upsert.data as { id: string } | null)?.id ?? d.id ?? "";
    if (branch && id) {
      await db.from("variant_branch_stock").upsert({
        branch_id: branch.id,
        variant_id: id,
        quantity: d.quantity ?? 0,
        updated_at: new Date().toISOString(),
      });
    }
    saved.push({
      id,
      productId,
      sku: d.sku,
      title: d.title,
      option1: d.option1 ?? null,
      option2: d.option2 ?? null,
      option3: d.option3 ?? null,
      salePrice: d.salePrice,
      compareAtPrice: d.compareAtPrice,
      costPrice: d.costPrice,
      barcode: d.barcode ?? null,
      imageUrl: d.imageUrl ?? null,
      position: d.position ?? i,
      quantity: d.quantity ?? 0,
      isActive: d.isActive !== false,
    });
  }
  return saved;
}

function isUuidish(id: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(id);
}

export async function decrementVariantStock(
  variantId: string,
  qty: number,
): Promise<void> {
  const rows = await local.list();
  const match = rows.find((v) => v.id === variantId);
  if (!match) return;
  await local.put({
    ...match,
    quantity: Math.max(0, match.quantity - qty),
  });
}

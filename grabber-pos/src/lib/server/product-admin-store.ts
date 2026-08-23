import "server-only";
import type { Product } from "@/lib/types";
import type { ProductInput } from "@/lib/validation";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { getRepository } from "@/lib/server/repositories";
import {
  nextProductId,
  findById as findLocalById,
} from "@/lib/server/product-repo";
import {
  upsertOverride,
  deleteOverride,
  upsertMany,
} from "@/lib/server/product-write-store";

function slugify(name: string, sku: string): string {
  const base =
    String(name || "product")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "product";
  return `${base}-${String(sku).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`.slice(
    0,
    120,
  );
}

async function sessionContext() {
  const typed = await createServerSupabase();
  const {
    data: { user },
  } = await typed.auth.getUser();
  if (!user) throw new Error("Sign in required");

  const { data: branch } = await typed
    .from("branches")
    .select("id, org_id")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string; org_id: string }>();
  if (!branch) throw new Error("No active branch for this organization");

  // Hand-authored Database types omit suppliers / product_barcodes / some RPCs.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {
    db: typed as any,
    user,
    branchId: branch.id,
    orgId: branch.org_id,
  };
}

async function ensureCategoryId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  orgId: string,
  name: string,
): Promise<string | null> {
  const trimmed = name.trim() || "Uncategorized";
  const { data: existing } = await db
    .from("categories")
    .select("id")
    .eq("org_id", orgId)
    .eq("name", trimmed)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data: created, error } = await db
    .from("categories")
    .insert({ org_id: orgId, name: trimmed })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return created.id as string;
}

async function ensureSupplierId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  orgId: string,
  name: string | null | undefined,
): Promise<string | null> {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  const { data: existing } = await db
    .from("suppliers")
    .select("id")
    .eq("org_id", orgId)
    .eq("name", trimmed)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data: created, error } = await db
    .from("suppliers")
    .insert({ org_id: orgId, name: trimmed })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return created.id as string;
}

async function replaceBarcodes(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  orgId: string,
  productId: string,
  barcodes: string[],
) {
  const { error: delErr } = await db
    .from("product_barcodes")
    .delete()
    .eq("product_id", productId);
  if (delErr) throw new Error(delErr.message);

  const unique = [...new Set(barcodes.map((b) => b.trim()).filter(Boolean))];
  if (!unique.length) return;

  const { error } = await db.from("product_barcodes").insert(
    unique.map((barcode) => ({
      org_id: orgId,
      product_id: productId,
      barcode,
    })),
  );
  if (error) throw new Error(error.message);
}

async function syncQuantity(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  branchId: string,
  productId: string,
  desired: number,
  current: number,
) {
  const target = Number(desired) || 0;
  const have = Number(current) || 0;
  const delta = target - have;
  if (delta === 0) return;
  const { error } = await db.rpc("adjust_stock", {
    p_branch: branchId,
    p_product: productId,
    p_delta: delta,
    p_note: "product-admin",
  });
  if (error) throw new Error(error.message);
}

function toProductShape(
  id: string,
  input: ProductInput,
  quantity: number,
): Product {
  return {
    id,
    name: input.name,
    nameLocal: input.nameLocal ?? null,
    barcodes: input.barcodes ?? [],
    brand: input.brand ?? null,
    stockDate: new Date().toISOString().slice(0, 10),
    costPrice: input.costPrice,
    salePrice: input.salePrice,
    wholesalePrice: input.wholesalePrice ?? null,
    vipPrice: input.vipPrice ?? null,
    minWholesaleQty: input.minWholesaleQty ?? 0,
    maxDiscount: input.maxDiscount,
    singleDiscount: input.singleDiscount,
    quantity,
    category: input.category || "Uncategorized",
    expireDate: input.expireDate ?? null,
    warrantyMonths: input.warrantyMonths,
    supplier: input.supplier ?? null,
    imageUrl: input.imageUrl ?? null,
  };
}

/** Full catalogue for Excel export (paged through durable catalog). */
export async function listAllProductsForExport(): Promise<Product[]> {
  if (!isSupabaseEnabled) {
    const { allProducts } = await import("./product-repo");
    return allProducts();
  }

  const repo = await getRepository();
  const pageSize = 200;
  const first = await repo.queryProducts({ page: 1, pageSize });
  const items = [...first.items];
  const totalPages = Math.max(1, Math.ceil(first.total / pageSize));
  for (let page = 2; page <= totalPages; page += 1) {
    const next = await repo.queryProducts({ page, pageSize });
    items.push(...next.items);
  }
  return items;
}

export async function createProductAdmin(input: ProductInput): Promise<Product> {
  if (!isSupabaseEnabled) {
    const product = toProductShape(nextProductId(), input, input.quantity);
    await upsertOverride(product);
    return product;
  }

  const { db, branchId, orgId } = await sessionContext();
  const sku = `SKU-${Date.now().toString(36).toUpperCase()}`;
  const categoryId = await ensureCategoryId(db, orgId, input.category);
  const supplierId = await ensureSupplierId(db, orgId, input.supplier);

  const { data: row, error } = await db
    .from("products")
    .insert({
      org_id: orgId,
      sku,
      slug: slugify(input.name, sku),
      name: input.name,
      name_local: input.nameLocal ?? null,
      brand: input.brand ?? null,
      category_id: categoryId,
      supplier_id: supplierId,
      cost_price: input.costPrice,
      sale_price: input.salePrice,
      wholesale_price: input.wholesalePrice ?? null,
      vip_price: input.vipPrice ?? null,
      min_wholesale_qty: input.minWholesaleQty ?? 0,
      max_discount: input.maxDiscount,
      single_discount: input.singleDiscount,
      warranty_months: input.warrantyMonths,
      image_url: input.imageUrl ?? null,
      online_visible: true,
      online_status: "published",
      is_active: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await replaceBarcodes(db, orgId, row.id, input.barcodes ?? []);
  await syncQuantity(db, branchId, row.id, input.quantity, 0);

  return toProductShape(row.id as string, input, input.quantity);
}

export async function updateProductAdmin(
  id: string,
  input: ProductInput,
): Promise<Product> {
  if (!isSupabaseEnabled) {
    const existing = findLocalById(id);
    if (!existing) throw new Error("Product not found");
    const product = { ...toProductShape(id, input, input.quantity), stockDate: existing.stockDate };
    await upsertOverride(product);
    return product;
  }

  const { db, branchId, orgId } = await sessionContext();
  const { data: stock } = await db
    .from("branch_stock")
    .select("quantity")
    .eq("branch_id", branchId)
    .eq("product_id", id)
    .maybeSingle();
  const { data: existing } = await db
    .from("products")
    .select("id, sku")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();
  if (!existing) throw new Error("Product not found");

  const categoryId = await ensureCategoryId(db, orgId, input.category);
  const supplierId = await ensureSupplierId(db, orgId, input.supplier);

  const { error } = await db
    .from("products")
    .update({
      name: input.name,
      name_local: input.nameLocal ?? null,
      brand: input.brand ?? null,
      category_id: categoryId,
      supplier_id: supplierId,
      cost_price: input.costPrice,
      sale_price: input.salePrice,
      wholesale_price: input.wholesalePrice ?? null,
      vip_price: input.vipPrice ?? null,
      min_wholesale_qty: input.minWholesaleQty ?? 0,
      max_discount: input.maxDiscount,
      single_discount: input.singleDiscount,
      warranty_months: input.warrantyMonths,
      image_url: input.imageUrl ?? null,
      slug: slugify(input.name, existing.sku),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("org_id", orgId);
  if (error) throw new Error(error.message);

  await replaceBarcodes(db, orgId, id, input.barcodes ?? []);
  await syncQuantity(
    db,
    branchId,
    id,
    input.quantity,
    Number(stock?.quantity ?? 0),
  );

  return toProductShape(id, input, input.quantity);
}

export async function deleteProductAdmin(id: string): Promise<void> {
  if (!isSupabaseEnabled) {
    if (!findLocalById(id)) throw new Error("Product not found");
    await deleteOverride(id);
    return;
  }

  const { db, orgId } = await sessionContext();
  const { data, error } = await db
    .from("products")
    .update({ is_active: false, online_visible: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("org_id", orgId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Product not found");
}

export async function importProductsAdmin(
  drafts: Product[],
): Promise<{ imported: number; updated: number; skipped: number; errors: string[] }> {
  if (!isSupabaseEnabled) {
    await upsertMany(drafts);
    return {
      imported: drafts.filter((p) => !findLocalById(p.id)).length,
      updated: drafts.filter((p) => findLocalById(p.id)).length,
      skipped: 0,
      errors: [],
    };
  }

  let imported = 0;
  let updated = 0;
  const errors: string[] = [];
  const { db, branchId } = await sessionContext();

  for (const draft of drafts) {
    try {
      let productId: string | null = null;
      for (const code of draft.barcodes) {
        const { data } = await db.rpc("product_by_barcode", {
          p_branch: branchId,
          p_code: code,
        });
        if (data && typeof data === "object" && data !== null && "id" in data) {
          productId = String((data as { id: string }).id);
          break;
        }
      }

      const input: ProductInput = {
        name: draft.name,
        nameLocal: draft.nameLocal,
        barcodes: draft.barcodes,
        brand: draft.brand,
        costPrice: draft.costPrice,
        salePrice: draft.salePrice,
        wholesalePrice: draft.wholesalePrice,
        vipPrice: draft.vipPrice,
        minWholesaleQty: draft.minWholesaleQty ?? 0,
        maxDiscount: draft.maxDiscount,
        singleDiscount: draft.singleDiscount,
        quantity: draft.quantity,
        category: draft.category,
        expireDate: draft.expireDate,
        warrantyMonths: draft.warrantyMonths,
        supplier: draft.supplier,
        imageUrl: draft.imageUrl ?? null,
      };

      if (productId) {
        await updateProductAdmin(productId, input);
        updated += 1;
      } else {
        await createProductAdmin(input);
        imported += 1;
      }
    } catch (err) {
      if (errors.length < 10) {
        errors.push(
          `${draft.name}: ${err instanceof Error ? err.message : "failed"}`,
        );
      }
    }
  }

  return { imported, updated, skipped: 0, errors };
}

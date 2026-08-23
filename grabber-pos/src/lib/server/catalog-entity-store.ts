import "server-only";
import type { Entity } from "./collection-store";
import type { Db } from "./persistence/backend";

/** Catalog entities backed by SQL tables (not app_collections). */
export const SQL_CATALOG_ENTITIES = new Set(["categories", "suppliers", "brands"]);

const BRAND_ID_PREFIX = "BR:";

function brandId(name: string): string {
  return BRAND_ID_PREFIX + Buffer.from(name, "utf8").toString("base64url");
}

function brandNameFromId(id: string): string | null {
  if (!id.startsWith(BRAND_ID_PREFIX)) return null;
  try {
    return Buffer.from(id.slice(BRAND_ID_PREFIX.length), "base64url").toString(
      "utf8",
    );
  } catch {
    return null;
  }
}

function toEntity(
  row: { id: string; created_at: string; [key: string]: unknown },
  extra: Record<string, unknown> = {},
): Entity {
  return {
    ...extra,
    id: row.id,
    createdAt: row.created_at,
  };
}

export async function listCatalogEntity(
  db: Db,
  name: string,
): Promise<Entity[]> {
  if (name === "categories") {
    const { data, error } = await db
      .from("categories")
      .select("id, name, created_at")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) =>
      toEntity(row, { name: row.name, description: "" }),
    );
  }

  if (name === "suppliers") {
    const { data, error } = await db
      .from("suppliers")
      .select("id, name, phone, email, address, created_at")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) =>
      toEntity(row, {
        name: row.name,
        phone: row.phone ?? "",
        email: row.email ?? "",
        address: row.address ?? "",
      }),
    );
  }

  if (name === "brands") {
    const { data, error } = await db
      .from("products")
      .select("brand")
      .not("brand", "is", null)
      .neq("brand", "");
    if (error) throw new Error(error.message);
    const names = [
      ...new Set(
        (data ?? [])
          .map((row) => String(row.brand ?? "").trim())
          .filter(Boolean),
      ),
    ].sort((a, b) => a.localeCompare(b));
    return names.map((name) => ({
      id: brandId(name),
      name,
      note: "",
      createdAt: "",
    }));
  }

  throw new Error(`Unknown SQL catalog entity: ${name}`);
}

export async function getCatalogEntity(
  db: Db,
  name: string,
  id: string,
): Promise<Entity | null> {
  if (name === "categories") {
    const { data, error } = await db
      .from("categories")
      .select("id, name, created_at")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return toEntity(data, { name: data.name, description: "" });
  }

  if (name === "suppliers") {
    const { data, error } = await db
      .from("suppliers")
      .select("id, name, phone, email, address, created_at")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return toEntity(data, {
      name: data.name,
      phone: data.phone ?? "",
      email: data.email ?? "",
      address: data.address ?? "",
    });
  }

  if (name === "brands") {
    const brandName = brandNameFromId(id);
    if (!brandName) return null;
    const { data, error } = await db
      .from("products")
      .select("brand")
      .eq("brand", brandName)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return { id, name: brandName, note: "", createdAt: "" };
  }

  return null;
}

export async function createCatalogEntity(
  db: Db,
  name: string,
  data: Record<string, unknown>,
): Promise<Entity> {
  if (name === "categories") {
    const trimmed = String(data.name ?? "").trim();
    if (!trimmed) throw new Error("Name is required");
    const { data: row, error } = await db
      .from("categories")
      .insert({ name: trimmed })
      .select("id, name, created_at")
      .single();
    if (error) throw new Error(error.message);
    return toEntity(row, {
      name: row.name,
      description: String(data.description ?? ""),
    });
  }

  if (name === "suppliers") {
    const trimmed = String(data.name ?? "").trim();
    if (!trimmed) throw new Error("Name is required");
    const { data: row, error } = await db
      .from("suppliers")
      .insert({
        name: trimmed,
        phone: String(data.phone ?? "").trim() || null,
        email: String(data.email ?? "").trim() || null,
        address: String(data.address ?? "").trim() || null,
      })
      .select("id, name, phone, email, address, created_at")
      .single();
    if (error) throw new Error(error.message);
    return toEntity(row, {
      name: row.name,
      phone: row.phone ?? "",
      email: row.email ?? "",
      address: row.address ?? "",
    });
  }

  if (name === "brands") {
    const trimmed = String(data.name ?? "").trim();
    if (!trimmed) throw new Error("Name is required");
    return {
      id: brandId(trimmed),
      name: trimmed,
      note: String(data.note ?? ""),
      createdAt: new Date().toISOString(),
    };
  }

  throw new Error(`Unknown SQL catalog entity: ${name}`);
}

export async function updateCatalogEntity(
  db: Db,
  name: string,
  id: string,
  data: Record<string, unknown>,
): Promise<Entity | null> {
  if (name === "categories") {
    const trimmed = String(data.name ?? "").trim();
    if (!trimmed) throw new Error("Name is required");
    const { data: row, error } = await db
      .from("categories")
      .update({ name: trimmed })
      .eq("id", id)
      .select("id, name, created_at")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return toEntity(row, {
      name: row.name,
      description: String(data.description ?? ""),
    });
  }

  if (name === "suppliers") {
    const trimmed = String(data.name ?? "").trim();
    if (!trimmed) throw new Error("Name is required");
    const { data: row, error } = await db
      .from("suppliers")
      .update({
        name: trimmed,
        phone: String(data.phone ?? "").trim() || null,
        email: String(data.email ?? "").trim() || null,
        address: String(data.address ?? "").trim() || null,
      })
      .eq("id", id)
      .select("id, name, phone, email, address, created_at")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return toEntity(row, {
      name: row.name,
      phone: row.phone ?? "",
      email: row.email ?? "",
      address: row.address ?? "",
    });
  }

  if (name === "brands") {
    const oldName = brandNameFromId(id);
    if (!oldName) return null;
    const newName = String(data.name ?? "").trim();
    if (!newName) throw new Error("Name is required");
    const { error } = await db
      .from("products")
      .update({ brand: newName })
      .eq("brand", oldName);
    if (error) throw new Error(error.message);
    return {
      id: brandId(newName),
      name: newName,
      note: String(data.note ?? ""),
      createdAt: "",
    };
  }

  return null;
}

export async function deleteCatalogEntity(
  db: Db,
  name: string,
  id: string,
): Promise<boolean> {
  if (name === "categories") {
    const { error, count } = await db
      .from("categories")
      .delete({ count: "exact" })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return (count ?? 0) > 0;
  }

  if (name === "suppliers") {
    const { error, count } = await db
      .from("suppliers")
      .delete({ count: "exact" })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return (count ?? 0) > 0;
  }

  if (name === "brands") {
    const brandName = brandNameFromId(id);
    if (!brandName) return false;
    const { error } = await db
      .from("products")
      .update({ brand: null })
      .eq("brand", brandName);
    if (error) throw new Error(error.message);
    return true;
  }

  return false;
}

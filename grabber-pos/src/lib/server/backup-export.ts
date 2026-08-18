import "server-only";
import { COLLECTIONS } from "@/lib/collections";
import { listCollection } from "@/lib/server/collection-store";
import { getRepository } from "@/lib/server/repositories";
import { readSettings } from "@/lib/server/settings-store";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import {
  createServerSupabase,
  createServiceSupabase,
} from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { redactSecrets } from "@/lib/backup-redact";

type QueryDb =
  | ReturnType<typeof createServiceSupabase>
  | Awaited<ReturnType<typeof createServerSupabase>>;

const PAGE = 1000;
const MAX_ROWS = 20_000;

async function selectPaged(
  query: (from: number, to: number) => PromiseLike<{
    data: unknown[] | null;
    error: { message: string } | null;
  }>,
): Promise<{ rows: unknown[]; truncated: boolean }> {
  const rows: unknown[] = [];
  let from = 0;
  while (rows.length < MAX_ROWS) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const chunk = data ?? [];
    rows.push(...chunk);
    if (chunk.length < PAGE) break;
    from += PAGE;
  }
  return { rows, truncated: rows.length >= MAX_ROWS };
}

export interface OrgDump {
  orgId: string;
  truncated: string[];
  organization: unknown;
  branches: unknown[];
  profiles: unknown[];
  categories: unknown[];
  products: unknown[];
  product_variants: unknown[];
  branch_stock: unknown[];
  variant_branch_stock: unknown[];
  sales: unknown[];
  sale_lines: unknown[];
  stock_documents: unknown[];
  app_collections: unknown[];
  app_documents: unknown[];
}

export async function dumpOrg(db: QueryDb, orgId: string): Promise<OrgDump> {
  const truncated: string[] = [];
  const take = async (
    name: string,
    run: () => Promise<{ rows: unknown[]; truncated: boolean }>,
  ) => {
    const { rows, truncated: t } = await run();
    if (t) truncated.push(name);
    return rows;
  };

  const [{ data: organization }, branchesRes] = await Promise.all([
    db.from("organizations").select("*").eq("id", orgId).maybeSingle(),
    selectPaged((from, to) =>
      db.from("branches").select("*").eq("org_id", orgId).range(from, to),
    ),
  ]);
  if (branchesRes.truncated) truncated.push("branches");
  const branchIds = (branchesRes.rows as { id: string }[]).map((b) => b.id);

  const [
    profiles,
    categories,
    products,
    product_variants,
    sales,
    stock_documents,
    app_collections,
    app_documents,
  ] = await Promise.all([
    take("profiles", () =>
      selectPaged((from, to) =>
        db
          .from("profiles")
          .select("id, org_id, role")
          .eq("org_id", orgId)
          .range(from, to),
      ),
    ),
    take("categories", () =>
      selectPaged((from, to) =>
        db.from("categories").select("*").eq("org_id", orgId).range(from, to),
      ),
    ),
    take("products", () =>
      selectPaged((from, to) =>
        db.from("products").select("*").eq("org_id", orgId).range(from, to),
      ),
    ),
    take("product_variants", () =>
      selectPaged((from, to) =>
        db
          .from("product_variants")
          .select("*")
          .eq("org_id", orgId)
          .range(from, to),
      ),
    ),
    take("sales", () =>
      selectPaged((from, to) =>
        db.from("sales").select("*").eq("org_id", orgId).range(from, to),
      ),
    ),
    take("stock_documents", () =>
      selectPaged((from, to) =>
        db
          .from("stock_documents")
          .select("*")
          .eq("org_id", orgId)
          .range(from, to),
      ),
    ),
    take("app_collections", () =>
      selectPaged((from, to) =>
        db
          .from("app_collections")
          .select("*")
          .eq("org_id", orgId)
          .range(from, to),
      ),
    ),
    take("app_documents", () =>
      selectPaged((from, to) =>
        db.from("app_documents").select("*").eq("org_id", orgId).range(from, to),
      ),
    ),
  ]);

  const saleIds = (sales as { id: string }[]).map((s) => s.id);
  let sale_lines: unknown[] = [];
  if (saleIds.length) {
    const chunk: unknown[] = [];
    for (let i = 0; i < saleIds.length; i += 200) {
      const ids = saleIds.slice(i, i + 200);
      const { rows, truncated: t } = await selectPaged((from, to) =>
        db.from("sale_lines").select("*").in("sale_id", ids).range(from, to),
      );
      chunk.push(...rows);
      if (t) truncated.push("sale_lines");
      if (chunk.length >= MAX_ROWS) {
        truncated.push("sale_lines");
        break;
      }
    }
    sale_lines = chunk.slice(0, MAX_ROWS);
  }

  let branch_stock: unknown[] = [];
  let variant_branch_stock: unknown[] = [];
  if (branchIds.length) {
    const stock = await take("branch_stock", () =>
      selectPaged((from, to) =>
        db.from("branch_stock").select("*").in("branch_id", branchIds).range(from, to),
      ),
    );
    const vstock = await take("variant_branch_stock", () =>
      selectPaged((from, to) =>
        db
          .from("variant_branch_stock")
          .select("*")
          .in("branch_id", branchIds)
          .range(from, to),
      ),
    );
    branch_stock = stock;
    variant_branch_stock = vstock;
  }

  const dump: OrgDump = {
    orgId,
    truncated,
    organization,
    branches: branchesRes.rows,
    profiles,
    categories,
    products,
    product_variants,
    branch_stock,
    variant_branch_stock,
    sales,
    sale_lines,
    stock_documents,
    app_collections: redactSecrets(app_collections) as unknown[],
    app_documents: redactSecrets(app_documents) as unknown[],
  };
  return dump;
}

export async function dumpAllOrgs(): Promise<{
  exportedAt: string;
  kind: "full-hq";
  platform: unknown;
  orgs: OrgDump[];
}> {
  if (!isSupabaseEnabled || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Service-role Supabase is required for a full HQ dump.");
  }
  const db = createServiceSupabase();
  const { data: platform } = await db.from("platform_settings").select("*");
  const { data: orgs, error } = await db
    .from("organizations")
    .select("id")
    .order("created_at");
  if (error) throw new Error(error.message);
  const dumps: OrgDump[] = [];
  for (const org of orgs ?? []) {
    dumps.push(await dumpOrg(db, org.id));
  }
  return {
    exportedAt: new Date().toISOString(),
    kind: "full-hq",
    platform: redactSecrets(platform ?? []) as Json,
    orgs: dumps,
  };
}

export async function dumpOneOrg(orgId: string): Promise<{
  exportedAt: string;
  kind: "full-org";
  org: OrgDump;
}> {
  if (!isSupabaseEnabled || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Service-role Supabase is required for a full org dump.");
  }
  const db = createServiceSupabase();
  return {
    exportedAt: new Date().toISOString(),
    kind: "full-org",
    org: await dumpOrg(db, orgId),
  };
}

export async function dumpSignedInOrg(): Promise<Record<string, unknown>> {
  if (!isSupabaseEnabled) {
    return dumpLocalDemo();
  }
  const db = await createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data: profile } = await db
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle<{ org_id: string }>();
  if (!profile?.org_id) throw new Error("No organization on this account");
  return {
    exportedAt: new Date().toISOString(),
    kind: "full-org",
    org: await dumpOrg(db, profile.org_id),
  };
}

async function dumpLocalDemo(): Promise<Record<string, unknown>> {
  const settings = await readSettings();
  const repo = await getRepository();
  const sales = await repo.listSales(MAX_ROWS);
  const collections: Record<string, unknown[]> = {};
  for (const name of Object.keys(COLLECTIONS)) {
    try {
      collections[name] = await listCollection(name);
    } catch {
      collections[name] = [];
    }
  }
  return {
    exportedAt: new Date().toISOString(),
    kind: "local-demo",
    settings,
    sales,
    collections,
  };
}

export function jsonDownload(filename: string, data: unknown): Response {
  return new Response(JSON.stringify({ success: true, data, error: null }, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

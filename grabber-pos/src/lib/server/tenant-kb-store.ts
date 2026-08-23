import "server-only";
import { randomUUID } from "crypto";
import { recordStore } from "./persistence/record-store";
import { readSettings } from "./settings-store";
import { readTenant } from "./tenant-store";
import { getRepository } from "./repositories";
import {
  canUseTenantKnowledge,
  normalizeArticleInput,
  scoreTenantArticle,
  tokenizeKbQuery,
  type TenantKbArticleInput,
} from "@/lib/ai/tenant-kb";

export interface TenantKbArticle {
  id: string;
  title: string;
  body: string;
  tags: string[];
  source: "manual" | "harvest" | "upload";
  createdAt: string;
  updatedAt: string;
}

const store = recordStore<TenantKbArticle>({
  collection: "tenant-knowledge",
  file: "tenant-knowledge.json",
});

export async function tenantKnowledgeAllowed(): Promise<boolean> {
  const tenant = await readTenant();
  return canUseTenantKnowledge(
    tenant.license.plan,
    tenant.license.extras ?? [],
  );
}

export async function listTenantKb(): Promise<TenantKbArticle[]> {
  return (await store.list()).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export async function getTenantKb(id: string): Promise<TenantKbArticle | null> {
  return store.get(id);
}

export async function createTenantKb(
  input: TenantKbArticleInput,
): Promise<TenantKbArticle> {
  const norm = normalizeArticleInput(input);
  if (!norm) throw new Error("Title and body are required");
  const now = new Date().toISOString();
  const article: TenantKbArticle = {
    id: "TKB-" + randomUUID().slice(0, 8),
    ...norm,
    createdAt: now,
    updatedAt: now,
  };
  return store.put(article);
}

export async function updateTenantKb(
  id: string,
  input: Partial<TenantKbArticleInput>,
): Promise<TenantKbArticle | null> {
  const current = await store.get(id);
  if (!current) return null;
  const norm = normalizeArticleInput({
    title: input.title ?? current.title,
    body: input.body ?? current.body,
    tags: input.tags ?? current.tags,
    source: input.source ?? current.source,
  });
  if (!norm) throw new Error("Title and body are required");
  return store.put({
    ...current,
    ...norm,
    updatedAt: new Date().toISOString(),
  });
}

export async function removeTenantKb(id: string): Promise<boolean> {
  return store.remove(id);
}

/**
 * Collect starter knowledge from this org: profile + categories + sample SKUs.
 * Idempotent-ish: replaces prior harvest-sourced articles only.
 */
export async function harvestTenantKbFromOrg(): Promise<{
  created: number;
  articles: TenantKbArticle[];
}> {
  const settings = await readSettings();
  const tenant = await readTenant();
  const repo = await getRepository();
  const page = await repo.queryProducts({ pageSize: 80 });

  const categories = [
    ...new Set(page.items.map((p) => p.category).filter(Boolean)),
  ].slice(0, 40);
  const sampleSkus = page.items.slice(0, 25).map(
    (p) => `${p.name} · ${p.salePrice} · stock ${p.quantity}`,
  );

  const drafts: TenantKbArticleInput[] = [
    {
      title: `${settings.businessName || tenant.brand.businessName || "Our shop"} — profile`,
      tags: ["business", "profile", "contact", "hours"],
      source: "harvest",
      body: [
        `Business: ${settings.businessName || tenant.brand.businessName || "—"}`,
        settings.address ? `Address: ${settings.address}` : null,
        settings.phone ? `Phone: ${settings.phone}` : null,
        settings.email ? `Email: ${settings.email}` : null,
        settings.currency ? `Currency: ${settings.currency}` : null,
        `Plan: ${tenant.license.plan}`,
        "Use this when customers ask who we are or how to reach us.",
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];

  if (categories.length) {
    drafts.push({
      title: "Catalogue categories",
      tags: ["products", "categories", "catalogue"],
      source: "harvest",
      body: `We sell across these categories: ${categories.join(", ")}. Prefer directing staff to /products and /categories to edit the live catalogue — never invent SKUs.`,
    });
  }

  if (sampleSkus.length) {
    drafts.push({
      title: "Sample products (snapshot)",
      tags: ["products", "stock", "sku", "sample"],
      source: "harvest",
      body: `Snapshot of catalogue lines (may be stale — tools beat this for live stock):\n${sampleSkus.join("\n")}`,
    });
  }

  drafts.push({
    title: "How we sell (MyPoz modes)",
    tags: ["pos", "verticals", "sell"],
    source: "harvest",
    body: `Counter sales: /pos. Online: Website CMS + /store. WhatsApp bot: /whatsapp. Ask Jarvis list_verticals for every sale mode we unlocked on this plan.`,
  });

  const existing = await store.list();
  for (const e of existing.filter((a) => a.source === "harvest")) {
    await store.remove(e.id);
  }

  const articles: TenantKbArticle[] = [];
  for (const d of drafts) {
    articles.push(await createTenantKb(d));
  }
  return { created: articles.length, articles };
}

export async function searchTenantKb(
  query: string,
  limit = 3,
): Promise<
  Array<{
    id: string;
    title: string;
    source: string;
    score: number;
    body: string;
    origin: "tenant";
  }>
> {
  const tokens = tokenizeKbQuery(query);
  if (!tokens.length) return [];
  const articles = await listTenantKb();
  return articles
    .map((a) => ({
      id: a.id,
      title: a.title,
      source: `tenant:${a.source}`,
      score: scoreTenantArticle(a, tokens),
      body: a.body,
      origin: "tenant" as const,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

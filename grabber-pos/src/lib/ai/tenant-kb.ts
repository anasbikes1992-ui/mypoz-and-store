/**
 * Tenant custom knowledge base — Business+ (or extras: knowledge).
 * Pure helpers stay free of server-only for Vitest.
 */
import type { PlanTier } from "@/lib/plans";

export const KNOWLEDGE_MODULE_KEY = "knowledge";

/** Business / Enterprise, or Starter with HQ extra `knowledge`. */
export function canUseTenantKnowledge(
  plan: PlanTier,
  extras: string[] = [],
): boolean {
  if (plan === "business" || plan === "enterprise") return true;
  return extras.includes(KNOWLEDGE_MODULE_KEY) || extras.includes("jarvis-kb");
}

export interface TenantKbArticleInput {
  title: string;
  body: string;
  tags?: string[];
  source?: "manual" | "harvest" | "upload";
}

export function normalizeArticleInput(input: TenantKbArticleInput): {
  title: string;
  body: string;
  tags: string[];
  source: "manual" | "harvest" | "upload";
} | null {
  const title = String(input.title ?? "").trim().slice(0, 160);
  const body = String(input.body ?? "").trim().slice(0, 8000);
  if (!title || !body) return null;
  const tags = (input.tags ?? [])
    .map((t) => String(t).trim().toLowerCase().slice(0, 40))
    .filter(Boolean)
    .slice(0, 12);
  const source =
    input.source === "harvest" || input.source === "upload"
      ? input.source
      : "manual";
  return { title, body, tags, source };
}

/** Score a tenant article against query tokens (same spirit as platform KB). */
export function scoreTenantArticle(
  article: { title: string; body: string; tags: string[] },
  tokens: string[],
): number {
  if (tokens.length === 0) return 0;
  const hay = `${article.title} ${article.tags.join(" ")} ${article.body}`.toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (article.tags.includes(t)) score += 3;
    if (article.title.toLowerCase().includes(t)) score += 2;
    if (hay.includes(t)) score += 1;
  }
  return score;
}

export function tokenizeKbQuery(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

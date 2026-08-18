import "server-only";
import { docStore } from "@/lib/server/persistence/doc-store";

export interface AiSettings {
  openaiApiKey: string;
}

const store = docStore<AiSettings>({ key: "ai", file: "ai-settings.json" });

const EMPTY: AiSettings = { openaiApiKey: "" };

export async function readAiSettings(): Promise<AiSettings> {
  const cur = await store.read(EMPTY);
  return { openaiApiKey: String(cur.openaiApiKey ?? "") };
}

export async function writeAiSettings(patch: Partial<AiSettings>): Promise<AiSettings> {
  const cur = await readAiSettings();
  const next: AiSettings = {
    openaiApiKey:
      patch.openaiApiKey !== undefined
        ? patch.openaiApiKey.trim()
        : cur.openaiApiKey,
  };
  if (!next.openaiApiKey) next.openaiApiKey = cur.openaiApiKey;
  if (patch.openaiApiKey === "") next.openaiApiKey = "";
  return store.write(next);
}

export function publicAiSettings(s: AiSettings): { openaiKeySet: boolean } {
  return { openaiKeySet: Boolean(s.openaiApiKey.trim()) };
}

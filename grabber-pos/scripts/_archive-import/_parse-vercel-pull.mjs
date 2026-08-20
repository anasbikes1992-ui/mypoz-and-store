import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pullPath = join(root, ".env.vercel.pull");
if (!existsSync(pullPath)) {
  console.error("missing .env.vercel.pull");
  process.exit(1);
}
const env = readFileSync(pullPath, "utf8");
const lines = env.split(/\r?\n/).filter((l) => l && !l.startsWith("#"));
console.log("line_count", lines.length);
for (const k of [
  "WHATSAPP_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_VERIFY_TOKEN",
  "WHATSAPP_APP_SECRET",
  "OPENAI_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
]) {
  const hit = lines.find((l) => l.startsWith(k + "="));
  console.log(k + ":", hit ? "SET" : "MISSING");
  if (k === "WHATSAPP_PHONE_NUMBER_ID" && hit) {
    let v = hit.slice(k.length + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1);
    writeFileSync(join(root, "data", ".phone-id-only.txt"), v, "utf8");
    console.log("wrote phone id file, len", v.length);
  }
}

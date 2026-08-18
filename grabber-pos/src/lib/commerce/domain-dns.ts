/** DNS helpers for custom store domains. Connected only after a matching record. */

export function normalizeHost(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
}

export function cnamePointsAtVercel(records: string[]): boolean {
  return records.some((r) => {
    const host = r.replace(/\.$/, "").toLowerCase();
    return (
      host.endsWith("vercel-dns.com") ||
      host === "mypoz-and-store.vercel.app" ||
      host.endsWith(".vercel.app")
    );
  });
}

export const VERIFY_CNAME_HINT = "cname.vercel-dns.com";

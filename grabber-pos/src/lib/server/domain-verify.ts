import "server-only";
import { promises as dns } from "dns";
import {
  cnamePointsAtVercel,
  normalizeHost,
} from "@/lib/commerce/domain-dns";

export async function verifyDomainDns(rawHost: string): Promise<{
  host: string;
  ok: boolean;
  records: string[];
  error?: string;
}> {
  const host = normalizeHost(rawHost);
  if (!host || !host.includes(".")) {
    return { host, ok: false, records: [], error: "Enter a full hostname like shop.example.lk" };
  }
  try {
    const records = await dns.resolveCname(host);
    const ok = cnamePointsAtVercel(records);
    return {
      host,
      ok,
      records,
      error: ok
        ? undefined
        : `CNAME found (${records.join(", ")}) but it must point at cname.vercel-dns.com or this Vercel app.`,
    };
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "ENODATA" || code === "ENOTFOUND") {
      return {
        host,
        ok: false,
        records: [],
        error: "No CNAME found. Add a CNAME to cname.vercel-dns.com, wait for DNS, then verify again.",
      };
    }
    return {
      host,
      ok: false,
      records: [],
      error: err instanceof Error ? err.message : "DNS lookup failed",
    };
  }
}

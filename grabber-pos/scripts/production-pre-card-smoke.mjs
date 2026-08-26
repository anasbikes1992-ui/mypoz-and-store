#!/usr/bin/env node
/**
 * Pre-WebXPay production smoke (public + storefront isolation).
 * Cards / gateway checkout intentionally NOT exercised here.
 *
 * Usage:
 *   node scripts/production-pre-card-smoke.mjs
 *   node scripts/production-pre-card-smoke.mjs https://mypoz-and-store-ui.vercel.app
 */
const BASE = (process.argv[2] || "https://mypoz-and-store-ui.vercel.app").replace(/\/$/, "");
const rand = Math.floor(Math.random() * 1e9);
const unknown = `unknown-smoke-${rand}`;

/** @type {{ name: string; ok: boolean; detail: string }[]} */
const results = [];

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail: String(detail) });
  } catch (err) {
    results.push({
      name,
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}

async function fetchStatus(path, init) {
  const url = `${BASE}${path}`;
  let lastStatus = 0;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, {
      redirect: "manual",
      ...init,
    });
    lastStatus = res.status;
    if (res.status !== 429) return res;
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  throw new Error(`rate limited (429) after retries; last=${lastStatus}`);
}

await check("health", async () => {
  const res = await fetchStatus("/api/health");
  if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  if (!body?.ready) throw new Error("ready=false");
  return `ready backend=${body.backend}`;
});

await check("unknown-store-404", async () => {
  const res = await fetchStatus(`/store/${unknown}`);
  if (res.status !== 404) throw new Error(`expected 404 got ${res.status}`);
  return "404";
});

await check("unknown-catalog-404", async () => {
  const res = await fetchStatus(`/api/store/${unknown}/catalog`);
  if (res.status !== 404) throw new Error(`expected 404 got ${res.status}`);
  return "404";
});

await check("unknown-auth-404", async () => {
  const res = await fetchStatus(`/api/store/${unknown}/auth`);
  if (res.status !== 404) throw new Error(`expected 404 got ${res.status}`);
  return "404";
});

await check("anaz-store-200", async () => {
  const res = await fetchStatus("/store/anaz-store");
  if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  if (!/Anaz/i.test(html)) throw new Error("missing Anaz branding");
  return "Anaz OK";
});

await check("pilot-02-200", async () => {
  const res = await fetchStatus("/store/pilot-02");
  if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  if (!/Pilot\s*02/i.test(html)) throw new Error("missing Pilot 02 branding");
  return "Pilot 02 OK";
});

await check("main-store-alias-308", async () => {
  const res = await fetchStatus("/store/main-store");
  if (res.status !== 308) throw new Error(`expected 308 got ${res.status}`);
  const loc = res.headers.get("location") || "";
  if (!loc.includes("/store/anaz-store")) throw new Error(`bad location ${loc}`);
  return loc;
});

await check("forgot-password-page", async () => {
  const res = await fetchStatus("/forgot-password");
  if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
  return "200";
});

await check("forgot-password-api", async () => {
  const res = await fetchStatus("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "nobody@example.com" }),
  });
  if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  if (!body?.success) throw new Error(JSON.stringify(body));
  return "200 generic success";
});

await check("login-page", async () => {
  const res = await fetchStatus("/login");
  if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
  return "200";
});

await check("health-again", async () => {
  const res = await fetchStatus("/api/health");
  if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
  return "ok";
});

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name} — ${r.detail}`);
}
console.log(`\n${results.length - failed.length}/${results.length} passed @ ${BASE}`);
if (failed.length) process.exit(1);

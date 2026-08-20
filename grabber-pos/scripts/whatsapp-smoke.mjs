/**
 * Smoke-test WhatsApp public endpoints (no Meta send required).
 *
 *   node scripts/whatsapp-smoke.mjs
 *   node scripts/whatsapp-smoke.mjs https://mypoz-and-store-ui.vercel.app
 */
const base = (process.argv[2] || "https://mypoz-and-store-ui.vercel.app").replace(
  /\/$/,
  "",
);

async function check(name, url, init) {
  try {
    const res = await fetch(url, init);
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // plain
    }
    return {
      name,
      ok: res.ok || res.status === 403 || res.status === 401,
      status: res.status,
      body: json ?? text.slice(0, 160),
    };
  } catch (e) {
    return { name, ok: false, status: 0, body: String(e.message || e) };
  }
}

const rows = [];
rows.push(await check("GET /api/whatsapp/status", `${base}/api/whatsapp/status`));
rows.push(
  await check(
    "GET webhook verify (expect 403 without token)",
    `${base}/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=test`,
  ),
);
rows.push(
  await check(
    "GET catalog CSV",
    `${base}/api/store/anaz-store/catalog?format=csv`,
  ),
);
rows.push(
  await check(
    "GET catalog JSON",
    `${base}/api/store/anaz-store/catalog?format=json`,
  ),
);

const failed = rows.filter((r) => !r.ok);
console.log(JSON.stringify({ base, rows, failed: failed.length }, null, 2));
process.exit(failed.length ? 1 : 0);

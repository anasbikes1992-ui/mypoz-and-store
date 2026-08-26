import { publicEncrypt, constants } from "node:crypto";
import { readFileSync } from "node:fs";

function normalizePem(key) {
  let trimmed = key.trim().replace(/\\n/g, "\n");
  if (!trimmed.includes("\n") && /BEGIN [\w ]+ KEY/.test(trimmed)) {
    const match = trimmed.match(
      /-----BEGIN ([\w ]+ KEY)-----(.+?)-----END \1-----/s,
    );
    if (match) {
      const kind = match[1];
      const body = match[2].replace(/\s+/g, "");
      const lines = body.match(/.{1,64}/g) ?? [body];
      trimmed = `-----BEGIN ${kind}-----\n${lines.join("\n")}\n-----END ${kind}-----`;
    }
  }
  if (trimmed.includes("BEGIN")) return trimmed;
  const body = trimmed.replace(/\s+/g, "");
  const lines = body.match(/.{1,64}/g) ?? [body];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join("\n")}\n-----END PUBLIC KEY-----`;
}

const raw = process.env.WEBXPAY_PUBLIC_KEY || "";
console.log({
  rawLen: raw.length,
  hasRealNl: raw.includes("\n"),
  hasEscapedNl: raw.includes("\\n"),
  preview: raw.slice(0, 60).replace(/\n/g, "\\n"),
});

const sample = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC9l2HykxDIDVZeyDPJU4pA0imf
3nWsvyJgb3zTsnN8B0mFX6u5squ5NQcnQ03L8uQ56b4/isHBgiyKwfMr4cpEpCTY
/t1WSdJ5EokCI/F7hCM7aSSSY85S7IYOiC6pKR4WbaOYMvAMKn5gCobEPtosmPLz
gh8Lo3b8UsjPq2W26QIDAQAB
-----END PUBLIC KEY-----`;

for (const [name, key] of [
  ["env-raw", raw],
  ["env-normalized", normalizePem(raw)],
  ["sample", sample],
]) {
  try {
    publicEncrypt(
      { key, padding: constants.RSA_PKCS1_PADDING },
      Buffer.from("WEB-TEST|300.00"),
    );
    console.log(name, "OK", "lines=", key.split("\n").length);
  } catch (e) {
    console.log(name, "FAIL", e.message, "lines=", key.split("\n").length);
  }
}

// Also try reading from AUDIT doc if present
try {
  const doc = readFileSync(
    new URL("../../../AUDIT/WEBXPAY_SECRETS_STAGING.md", import.meta.url),
    "utf8",
  );
  const m = doc.match(/-----BEGIN PUBLIC KEY-----[\s\S]+?-----END PUBLIC KEY-----/);
  if (m) {
    publicEncrypt(
      { key: m[0], padding: constants.RSA_PKCS1_PADDING },
      Buffer.from("WEB-TEST|300.00"),
    );
    console.log("audit-doc OK");
  }
} catch (e) {
  console.log("audit-doc skip", e.message);
}

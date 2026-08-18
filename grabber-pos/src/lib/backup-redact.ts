const SECRET_KEY =
  /token|secret|password|apikey|api[_-]?key|accessToken|openai|verifyToken/i;

export function redactSecrets(value: unknown, key = ""): unknown {
  if (SECRET_KEY.test(key) && typeof value === "string" && value.trim()) {
    return "[redacted]";
  }
  if (Array.isArray(value)) return value.map((item) => redactSecrets(item));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redactSecrets(v, k);
    }
    return out;
  }
  return value;
}

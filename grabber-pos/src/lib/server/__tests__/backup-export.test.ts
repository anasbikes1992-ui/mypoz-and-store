import { describe, expect, it } from "vitest";
import { redactSecrets } from "@/lib/backup-redact";

describe("backup secret redaction", () => {
  it("strips tokens and nested openai keys", () => {
    const out = redactSecrets({
      phoneNumberId: "123",
      accessToken: "secret-token",
      nested: { openaiApiKey: "sk-test", locale: "en" },
    }) as Record<string, unknown>;
    expect(out.phoneNumberId).toBe("123");
    expect(out.accessToken).toBe("[redacted]");
    expect((out.nested as { openaiApiKey: string; locale: string }).openaiApiKey).toBe(
      "[redacted]",
    );
    expect((out.nested as { locale: string }).locale).toBe("en");
  });
});

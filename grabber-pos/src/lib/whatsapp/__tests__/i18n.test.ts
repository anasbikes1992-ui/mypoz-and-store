import { describe, expect, it } from "vitest";
import { detectLocale, t } from "../i18n";

describe("whatsapp i18n", () => {
  it("detects Sinhala and Tamil script", () => {
    expect(detectLocale("ආයුබෝවන්")).toBe("si");
    expect(detectLocale("வணக்கம்")).toBe("ta");
    expect(detectLocale("hello", "en")).toBe("en");
  });

  it("translates greeting keys", () => {
    expect(t("si", "order")).toContain("ඇණවුම්");
    expect(t("ta", "talkToStaff")).toContain("ஊழியர்");
  });
});

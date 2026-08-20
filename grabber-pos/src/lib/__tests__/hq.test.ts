import { describe, it, expect } from "vitest";
import { licenceStatus } from "../hq";

describe("licenceStatus", () => {
  it("returns suspended when flag is true regardless of expiry", () => {
    const future = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    expect(licenceStatus(future, true)).toBe("suspended");
    expect(licenceStatus(null, true)).toBe("suspended");
    expect(licenceStatus("", true)).toBe("suspended");
  });

  it("returns active when not suspended and no expiry", () => {
    expect(licenceStatus(null)).toBe("active");
    expect(licenceStatus(null, false)).toBe("active");
  });

  it("returns expired when past expiry and not suspended", () => {
    expect(licenceStatus("2020-01-01")).toBe("expired");
  });
});

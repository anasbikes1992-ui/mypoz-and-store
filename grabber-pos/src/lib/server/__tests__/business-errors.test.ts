import { describe, expect, it } from "vitest";
import {
  BusinessError,
  toBusinessError,
} from "@/lib/server/business-errors";

describe("business errors", () => {
  it("maps stock and void RPC messages to typed codes", () => {
    expect(toBusinessError(new Error("STOCK: only 1 of Tea available")).code).toBe(
      "STOCK",
    );
    expect(toBusinessError(new Error("SALE_ALREADY_VOID:abc")).code).toBe(
      "ALREADY_VOID",
    );
    expect(toBusinessError(new Error("AUTH: no organization for caller")).code).toBe(
      "UNAUTHORIZED",
    );
    expect(toBusinessError(new Error("ROLE: cashiers cannot adjust stock")).code).toBe(
      "FORBIDDEN",
    );
  });

  it("preserves explicit BusinessError instances", () => {
    const err = new BusinessError("DUPLICATE", "already posted", 422);
    expect(toBusinessError(err)).toBe(err);
    expect(err.httpStatus).toBe(422);
  });
});

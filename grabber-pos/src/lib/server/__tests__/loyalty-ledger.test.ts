import { describe, it, expect, afterAll, vi } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";

vi.mock("server-only", () => ({}));
vi.mock("../persistence/backend", () => ({ resolveDb: async () => null }));

const cwd = process.cwd();
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "grabber-loyalty-"));
await fs.mkdir(path.join(tmp, "data"), { recursive: true });
process.chdir(tmp);

const ledger = await import("../loyalty-ledger");

afterAll(async () => {
  process.chdir(cwd);
  await fs.rm(tmp, { recursive: true, force: true });
});

describe("loyalty ledger", () => {
  it("appends earn and redeem entries for a customer", async () => {
    const earn = await ledger.appendEntry({
      customerId: "CUS-1",
      kind: "earn",
      points: 40,
      note: "Sale",
      saleId: "S-1",
    });
    expect(earn.id).toMatch(/^LL-/);
    expect(earn.points).toBe(40);

    await ledger.appendEntry({
      customerId: "CUS-1",
      kind: "redeem",
      points: 10,
      note: "Redeemed",
    });
    await ledger.appendEntry({
      customerId: "CUS-2",
      kind: "adjust",
      points: -5,
      note: "Correction",
    });

    const forOne = await ledger.listByCustomer("CUS-1");
    expect(forOne).toHaveLength(2);
    expect(forOne.every((e) => e.customerId === "CUS-1")).toBe(true);
    expect(forOne[0].createdAt >= forOne[1].createdAt).toBe(true);
  });

  it("floors earn points and allows signed adjust", async () => {
    const adj = await ledger.appendEntry({
      customerId: "CUS-3",
      kind: "adjust",
      points: -12.7,
    });
    expect(adj.points).toBe(-12);

    const earn = await ledger.appendEntry({
      customerId: "CUS-3",
      kind: "earn",
      points: -3,
    });
    expect(earn.points).toBe(0);
  });
});

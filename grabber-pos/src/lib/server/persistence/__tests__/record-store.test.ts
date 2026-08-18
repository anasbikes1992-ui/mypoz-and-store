import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";

// The seam under test resolves to the local JSON backend whenever Supabase is
// not configured; force that path so these run without a database.
vi.mock("server-only", () => ({}));
vi.mock("../backend", () => ({ resolveDb: async () => null }));

// The store resolves data/ from process.cwd() at module load, so the sandbox
// directory must be in place *before* the import — otherwise these tests read
// and overwrite the project's real demo data.
const cwd = process.cwd();
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "grabber-store-"));
process.chdir(tmp);

const { recordStore } = await import("../record-store");

afterAll(async () => {
  process.chdir(cwd);
  await fs.rm(tmp, { recursive: true, force: true });
});

interface Job {
  id: string;
  customer: string;
}

const store = recordStore<Job>({ collection: "jobs", file: "jobs.json" });
const file = path.join(tmp, "data", "jobs.json");

beforeEach(async () => {
  await fs.rm(file, { force: true });
});

describe("recordStore (local backend)", () => {
  it("returns an empty list when nothing has been written", async () => {
    expect(await store.list()).toEqual([]);
  });

  it("round-trips a record through put and get", async () => {
    await store.put({ id: "J1", customer: "Ravi" });
    expect(await store.get("J1")).toEqual({ id: "J1", customer: "Ravi" });
  });

  it("replaces an existing record instead of appending a duplicate", async () => {
    await store.put({ id: "J1", customer: "Ravi" });
    await store.put({ id: "J1", customer: "Sunil" });

    const items = await store.list();
    expect(items).toHaveLength(1);
    expect(items[0].customer).toBe("Sunil");
  });

  it("leaves other records untouched when one is updated", async () => {
    await store.put({ id: "J1", customer: "Ravi" });
    await store.put({ id: "J2", customer: "Nimal" });
    await store.put({ id: "J1", customer: "Updated" });

    expect(await store.get("J2")).toEqual({ id: "J2", customer: "Nimal" });
    expect(await store.list()).toHaveLength(2);
  });

  it("reports whether a remove actually deleted anything", async () => {
    await store.put({ id: "J1", customer: "Ravi" });
    expect(await store.remove("J1")).toBe(true);
    expect(await store.remove("J1")).toBe(false);
    expect(await store.get("J1")).toBeNull();
  });

  it("writes many records in one call", async () => {
    await store.putMany([
      { id: "J1", customer: "A" },
      { id: "J2", customer: "B" },
    ]);
    expect(await store.list()).toHaveLength(2);
  });

  it("reads legacy map-shaped files, keying each entry by its map key", async () => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(
      file,
      JSON.stringify({ T1: { customer: "Table one" } }),
      "utf8",
    );

    expect(await store.get("T1")).toEqual({ id: "T1", customer: "Table one" });
  });

  it("keeps every record when writes overlap", async () => {
    // Without a per-file lock these read the same snapshot and all but the last
    // write is silently lost.
    await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        store.put({ id: `J${i}`, customer: `C${i}` }),
      ),
    );
    expect(await store.list()).toHaveLength(8);
  });

  it("survives a corrupt file rather than throwing", async () => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, "{ not json", "utf8");
    expect(await store.list()).toEqual([]);
  });
});

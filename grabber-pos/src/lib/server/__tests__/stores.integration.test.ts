import { describe, it, expect, afterAll, vi } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";

/**
 * Integration coverage for the module stores after they moved onto the
 * persistence seam. Runs against the local JSON backend in a sandbox directory,
 * exercising the real store modules rather than mocks.
 */
vi.mock("server-only", () => ({}));
vi.mock("../persistence/backend", () => ({ resolveDb: async () => null }));

// The stores resolve data/ from cwd at import time — sandbox first.
const cwd = process.cwd();
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "grabber-stores-"));
await fs.mkdir(path.join(tmp, "data"), { recursive: true });
process.chdir(tmp);

const jobs = await import("../job-store");
const bookings = await import("../booking-store");
const delivery = await import("../delivery-store");
const hp = await import("../hp-store");
const play = await import("../play-store");
const reloads = await import("../reload-store");
const restaurant = await import("../restaurant-store");
const collections = await import("../collection-store");
const tenant = await import("../tenant-store");
const settings = await import("../settings-store");

afterAll(async () => {
  process.chdir(cwd);
  await fs.rm(tmp, { recursive: true, force: true });
});

describe("job store", () => {
  it("creates, updates and re-reads a repair job", async () => {
    const job = await jobs.createJob("repair");
    expect(job.id).toMatch(/^RJ-/);
    expect(job.deposit).toBe(0);
    expect(job.status).toBe("received");

    await jobs.updateMeta(job.id, {
      customer: "Ravi",
      subject: "Phone",
      status: "diagnose",
      deposit: 500,
      diagnosis: "Screen cracked",
      warrantyNote: "90 days labour",
    });
    const read = await jobs.getJob(job.id);
    expect(read?.customer).toBe("Ravi");
    expect(read?.subject).toBe("Phone");
    expect(read?.status).toBe("diagnose");
    expect(read?.deposit).toBe(500);
    expect(read?.diagnosis).toBe("Screen cracked");
    expect(read?.warrantyNote).toBe("90 days labour");
  });

  it("keeps repair and service jobs in separate boards", async () => {
    await jobs.createJob("service");
    const repair = await jobs.listJobs("repair");
    const service = await jobs.listJobs("service");
    expect(repair.every((j) => j.type === "repair")).toBe(true);
    expect(service.every((j) => j.type === "service")).toBe(true);
  });

  it("does not disturb other jobs when one is updated", async () => {
    const a = await jobs.createJob("repair");
    const b = await jobs.createJob("repair");
    await jobs.updateMeta(a.id, { customer: "Only A" });

    expect((await jobs.getJob(b.id))?.customer).toBe("");
    expect((await jobs.getJob(a.id))?.customer).toBe("Only A");
  });
});

describe("booking store", () => {
  it("bills duration x rate plus extras, excluding the deposit", async () => {
    const booking = await bookings.createBooking("room");
    await bookings.updateMeta(booking.id, {
      subject: "Room 101",
      rate: 5000,
      startDate: "2026-01-01",
      endDate: "2026-01-04",
      deposit: 10000,
    });
    const saved = await bookings.getBooking(booking.id);
    const totals = bookings.bookingTotals(saved!);

    expect(totals.duration).toBe(3);
    expect(totals.stayCharge).toBe(15000);
    expect(totals.total).toBe(15000); // deposit tracked, not billed
  });

  it("applies overdue fee and forfeited deposit to total", async () => {
    const booking = await bookings.createBooking("rent");
    await bookings.updateMeta(booking.id, {
      rate: 1000,
      startDate: "2026-01-01",
      endDate: "2026-01-03",
      deposit: 2000,
      overdueFee: 300,
      depositDisposition: "forfeited",
    });
    const totals = bookings.bookingTotals((await bookings.getBooking(booking.id))!);
    expect(totals.overdue).toBe(300);
    expect(totals.forfeit).toBe(2000);
    expect(totals.total).toBe(totals.stayCharge + 300 + 2000);
  });

  it("suggests overdue from days late × rate × 0.1", () => {
    const fee = bookings.suggestedOverdueFee(
      { endDate: "2026-01-01", rate: 1000 },
      new Date("2026-01-04T12:00:00"),
    );
    // 3 days late × 1000 × 0.1
    expect(fee).toBe(300);
  });
});

describe("delivery store", () => {
  it("persists customer and driver metadata", async () => {
    const order = await delivery.createOrder();
    await delivery.updateMeta(order.id, { customer: "Sunil", driver: "Kamal" });

    const read = await delivery.getOrder(order.id);
    expect(read?.customer).toBe("Sunil");
    expect(read?.driver).toBe("Kamal");
  });

  it("drops an order from the active board once removed", async () => {
    const order = await delivery.createOrder();
    await delivery.removeOrder(order.id);
    const active = await delivery.listActive();
    expect(active.some((o) => o.id === order.id)).toBe(false);
  });
});

describe("hire purchase store", () => {
  it("tracks payments against the balance", async () => {
    const agreement = await hp.createAgreement({
      customer: "Nimal",
      item: "Fridge",
      total: 120000,
      downPayment: 20000,
      installments: 10,
    });

    const afterPayment = await hp.addPayment(agreement.id, 10000);
    const balance = hp.hpBalance(afterPayment!);

    expect(balance.paid).toBe(30000);
    expect(balance.balance).toBe(90000);
    expect(balance.installmentAmount).toBe(10000);
  });
});

describe("play store", () => {
  it("checks a session in and lists it as active", async () => {
    const session = await play.checkIn("Kid", 600);
    const active = await play.listSessions();
    expect(active.some((s) => s.id === session.id)).toBe(true);
  });
});

describe("reload store", () => {
  it("gives concurrent reloads distinct ids", async () => {
    const entries = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        reloads.logReload({
          provider: "Dialog",
          mobile: "077000000" + i,
          amount: 500,
          saleId: "S-" + i,
        }),
      ),
    );
    expect(new Set(entries.map((e) => e.id)).size).toBe(5);
  });
});

describe("restaurant store", () => {
  it("keeps one order per table and clears it on settle", async () => {
    await restaurant.setQty("T1", "P00001", 0); // no-op on an empty table
    const open = await restaurant.listOpenOrders();
    expect(open.some((t) => t.tableId === "T1")).toBe(false);

    await restaurant.clearOrder("T1");
    expect(await restaurant.getOrder("T1")).toBeNull();
  });
});

describe("collection store", () => {
  it("round-trips create, update, list and delete", async () => {
    const created = await collections.createEntity("customers", {
      name: "Ravi",
      points: 0,
    });
    expect(created.id).toMatch(/^CUS-/);

    await collections.updateEntity("customers", created.id, { points: 50 });
    expect((await collections.getEntity("customers", created.id))?.points).toBe(50);

    expect(await collections.deleteEntity("customers", created.id)).toBe(true);
    expect(await collections.deleteEntity("customers", created.id)).toBe(false);
  });

  it("preserves createdAt across updates so ordering stays stable", async () => {
    const created = await collections.createEntity("customers", { name: "A" });
    const updated = await collections.updateEntity("customers", created.id, {
      name: "B",
    });
    expect(updated?.createdAt).toBe(created.createdAt);
  });

  it("isolates one collection from another", async () => {
    await collections.createEntity("brands", { name: "BrandOnly" });
    const customers = await collections.listCollection("customers");
    expect(customers.some((c) => c.name === "BrandOnly")).toBe(false);
  });
});

describe("tenant store", () => {
  it("defaults to the enterprise plan with no branding", async () => {
    const config = await tenant.readTenant();
    expect(config.license.plan).toBe("enterprise");
    expect(config.brand.businessName).toBe("MyPoz");
  });

  it("persists branding and licence changes", async () => {
    await tenant.writeTenant({
      brand: { businessName: "Anas Traders", accentColor: "#7c3aed" },
      license: { plan: "starter", expiry: "2027-01-01" },
    });

    const config = await tenant.readTenant();
    expect(config.brand.businessName).toBe("Anas Traders");
    expect(config.license.plan).toBe("starter");
    expect(config.license.expiry).toBe("2027-01-01");
  });

  it("ignores an unknown plan rather than corrupting the licence", async () => {
    await tenant.writeTenant({
      license: { plan: "pirate" as never, expiry: "2027-01-01" },
    });
    expect((await tenant.readTenant()).license.plan).toBe("starter");
  });
});

describe("licence enforcement", () => {
  it("blocks new sales once the licence has expired", async () => {
    const sales = await import("../sales-repo");
    await tenant.writeTenant({ license: { expiry: "2020-01-01" } });

    await expect(
      sales.createSale({
        lines: [],
        subtotal: 0,
        discountTotal: 0,
        total: 0,
        paymentMethod: "cash",
      } as never),
    ).rejects.toThrow(/Licence expired/);
  });

  it("allows sales again once the licence is renewed", async () => {
    const sales = await import("../sales-repo");
    await tenant.writeTenant({ license: { expiry: "2999-01-01" } });

    const sale = await sales.createSale({
      lines: [],
      subtotal: 0,
      discountTotal: 0,
      total: 0,
      paymentMethod: "cash",
    } as never);
    expect(sale.id).toMatch(/^S-/);
  });
});

describe("settings store", () => {
  it("round-trips business settings", async () => {
    const current = await settings.readSettings();
    const saved = await settings.writeSettings({
      ...current,
      businessName: "Seam Shop",
      taxPercent: 8,
    });
    expect(saved.businessName).toBe("Seam Shop");
    expect((await settings.readSettings()).taxPercent).toBe(8);
  });

  it("falls back to defaults when the stored document is invalid", async () => {
    await fs.writeFile(
      path.join(tmp, "data", "settings.json"),
      JSON.stringify({ taxPercent: "not-a-number" }),
      "utf8",
    );
    const result = await settings.readSettings();
    expect(typeof result.taxPercent).toBe("number");
  });
});

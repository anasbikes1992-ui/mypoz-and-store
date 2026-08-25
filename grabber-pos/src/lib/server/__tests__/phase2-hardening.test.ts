import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

function readMigration(name: string): string {
  return fs.readFileSync(path.join(MIGRATIONS_DIR, name), "utf8");
}

describe("Phase 2 migrations 0027–0029", () => {
  it("0027 defines write_audit_event and owner/manager audit_read", () => {
    const sql = readMigration("0027_audit_unification.sql");
    expect(sql).toContain("write_audit_event");
    expect(sql).toContain("actor_role");
    expect(sql).toContain("correlation_id");
    expect(sql).toMatch(/current_user_role\(\)\s+in\s+\('owner',\s*'manager'\)/);
  });

  it("0028 defines payment_intents/events with unique provider event", () => {
    const sql = readMigration("0028_payment_domain.sql");
    expect(sql).toContain("create table if not exists public.payment_intents");
    expect(sql).toContain("create table if not exists public.payment_events");
    expect(sql).toContain("unique (provider, provider_event_id)");
    expect(sql).toContain("claim_payment_event");
  });

  it("0029 defines POS pending intent, typed adjust_stock, report_sales_summary", () => {
    const sql = readMigration("0029_pos_pending_inventory_reporting.sql");
    expect(sql).toContain("create_pos_payment_intent");
    expect(sql).toContain("report_sales_summary");
    expect(sql).toContain("transfer_out");
    expect(sql).toContain("p_reason");
  });
});

describe("audit + offline production guards", () => {
  it("audit-logger does not use recordStore", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/lib/server/audit-logger.ts"),
      "utf8",
    );
    expect(src).not.toContain("recordStore");
    expect(src).toContain("writeAuditEvent");
  });

  it("audit-store does not use recordStore", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/lib/server/audit-store.ts"),
      "utf8",
    );
    expect(src).not.toContain("recordStore");
    expect(src).toContain("writeAuditEvent");
  });

  it("offline queue is gated behind NEXT_PUBLIC_ALLOW_OFFLINE_POS", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/lib/offline-queue.ts"),
      "utf8",
    );
    expect(src).toContain("NEXT_PUBLIC_ALLOW_OFFLINE_POS");
    expect(src).toContain("return null");
  });

  it("gateway payments refuse JSON when Supabase is enabled", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/lib/server/gateway-payments-store.ts"),
      "utf8",
    );
    expect(src).toContain("payment_intents");
    expect(src).toContain("claim_payment_event");
    expect(src).not.toMatch(/writeJsonFile/);
  });

  it("durable createSale supports pending via create_pos_payment_intent", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/lib/server/repositories/supabase.ts"),
      "utf8",
    );
    expect(src).toContain("create_pos_payment_intent");
    expect(src).not.toContain("PENDING card sales are not supported");
  });
});

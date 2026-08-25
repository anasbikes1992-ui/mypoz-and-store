import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

function readMigration(name: string): string {
  return fs.readFileSync(path.join(MIGRATIONS_DIR, name), "utf8");
}

describe("migration batch integrity (P0–P4)", () => {
  it("lists forward-only numbered migrations through 0026", () => {
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    expect(files[0]).toBe("0001_schema.sql");
    expect(files).toContain("0024_p0_auth_and_ops_hardening.sql");
    expect(files).toContain("0025_returns_refunds.sql");
    expect(files).toContain("0026_register_shift_summaries.sql");
  });

  it("0021 receipt counters are atomic upserts", () => {
    const sql = readMigration("0021_receipt_indexes_domain_stock.sql");
    expect(sql).toContain("receipt_counters");
    expect(sql).toMatch(/on conflict \(branch_id, day\) do update set seq/i);
  });

  it("0024 defines void_sale + stocktake/transfer tables with RLS", () => {
    const sql = readMigration("0024_p0_auth_and_ops_hardening.sql");
    expect(sql).toContain("create or replace function void_sale");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("create table if not exists stocktakes");
    expect(sql).toContain("create table if not exists stock_transfers");
    expect(sql).toContain("grant execute on function public.void_sale");
  });

  it("0025 defines returns/refunds linked to sales and sale_lines", () => {
    const sql = readMigration("0025_returns_refunds.sql");
    expect(sql).toContain("create table if not exists sale_returns");
    expect(sql).toContain("references sales(id)");
    expect(sql).toContain("references sale_lines(id)");
    expect(sql).toContain("create table if not exists refunds");
    expect(sql).toContain("enable row level security");
  });

  it("0026 defines shift_summaries with org RLS", () => {
    const sql = readMigration("0026_register_shift_summaries.sql");
    expect(sql).toContain("create table if not exists shift_summaries");
    expect(sql).toContain("references shifts(id)");
    expect(sql).toContain("enable row level security");
  });

  it("migrations are replay-safe (IF NOT EXISTS / OR REPLACE)", () => {
    for (const name of [
      "0024_p0_auth_and_ops_hardening.sql",
      "0025_returns_refunds.sql",
      "0026_register_shift_summaries.sql",
    ]) {
      const sql = readMigration(name);
      const creates = sql.match(/create table/gi) ?? [];
      const guarded = sql.match(/create table if not exists/gi) ?? [];
      expect(guarded.length).toBeGreaterThan(0);
      expect(guarded.length).toBe(creates.length);
    }
  });
});

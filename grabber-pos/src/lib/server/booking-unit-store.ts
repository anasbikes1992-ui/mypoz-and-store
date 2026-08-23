import "server-only";
import { randomUUID } from "crypto";
import { recordStore } from "./persistence/record-store";
import type { BookingType } from "@/lib/booking-types";

export type UnitHousekeeping =
  | "available"
  | "occupied"
  | "dirty"
  | "out_of_order";

export interface BookingUnit {
  id: string;
  type: BookingType;
  name: string;
  /** Default nightly/daily rate. */
  rate: number;
  status: UnitHousekeeping;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

const units = recordStore<BookingUnit>({
  collection: "booking_units",
  file: "booking-units.json",
});

export async function listUnits(type: BookingType): Promise<BookingUnit[]> {
  return (await units.list())
    .filter((u) => u.type === type)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getUnit(id: string): Promise<BookingUnit | null> {
  return units.get(id);
}

export async function createUnit(
  type: BookingType,
  input: { name: string; rate?: number },
): Promise<BookingUnit> {
  const name = input.name.trim();
  if (!name) throw new Error("Unit name is required");
  const row: BookingUnit = {
    id: (type === "room" ? "RU-" : "AU-") + randomUUID().slice(0, 8),
    type,
    name,
    rate: Math.max(0, Number(input.rate) || 0),
    status: "available",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return units.put(row);
}

export async function updateUnit(
  id: string,
  patch: Partial<Pick<BookingUnit, "name" | "rate" | "status" | "note">>,
): Promise<BookingUnit | null> {
  const current = await units.get(id);
  if (!current) return null;
  return units.put({
    ...current,
    ...patch,
    name: patch.name != null ? patch.name.trim() || current.name : current.name,
    rate: patch.rate != null ? Math.max(0, Number(patch.rate) || 0) : current.rate,
    updatedAt: new Date().toISOString(),
  });
}

export async function removeUnit(id: string): Promise<void> {
  await units.remove(id);
}

export async function setUnitStatus(
  id: string,
  status: UnitHousekeeping,
): Promise<BookingUnit | null> {
  return updateUnit(id, { status });
}

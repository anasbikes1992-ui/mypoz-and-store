import "server-only";
import { randomUUID } from "crypto";
import { recordStore } from "./persistence/record-store";
import {
  getUnit,
  setUnitStatus,
  type BookingUnit,
} from "./booking-unit-store";
import type {
  Booking,
  BookingStatus,
  BookingType,
  DepositDisposition,
  ExtraKind,
} from "@/lib/booking-types";
import {
  bookingTotals,
  datesOverlap,
  daysOverdue,
  suggestedOverdueFee,
} from "@/lib/booking-math";

export type {
  Booking,
  BookingStatus,
  BookingType,
  DepositDisposition,
  ExtraKind,
} from "@/lib/booking-types";
export type { BookingExtra } from "@/lib/booking-types";
export {
  bookingTotals,
  datesOverlap,
  daysOverdue,
  suggestedOverdueFee,
} from "@/lib/booking-math";

const store = recordStore<Booking>({
  collection: "bookings",
  file: "bookings.json",
});

export async function listBookings(type: BookingType): Promise<Booking[]> {
  return (await store.list())
    .filter((b) => b.type === type)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getBooking(id: string): Promise<Booking | null> {
  return store.get(id);
}

export async function createBooking(type: BookingType): Promise<Booking> {
  const today = new Date().toISOString().slice(0, 10);
  const booking: Booking = {
    id: (type === "room" ? "BK-" : "RN-") + randomUUID().slice(0, 8),
    type,
    customer: "",
    phone: "",
    subject: "",
    unitId: null,
    rate: 0,
    startDate: today,
    endDate: "",
    deposit: 0,
    overdueFee: 0,
    depositDisposition: "held",
    status: "booked",
    extras: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return store.put(booking);
}

async function mutate(
  id: string,
  fn: (b: Booking) => Booking | Promise<Booking>,
): Promise<Booking | null> {
  const current = await store.get(id);
  if (!current) return null;
  const next = await fn(current);
  return store.put({ ...next, updatedAt: new Date().toISOString() });
}

export async function findUnitConflicts(opts: {
  unitId: string;
  startDate: string;
  endDate: string;
  excludeBookingId?: string;
}): Promise<Booking[]> {
  if (!opts.unitId || !opts.startDate || !opts.endDate) return [];
  const all = await store.list();
  return all.filter((b) => {
    if (opts.excludeBookingId && b.id === opts.excludeBookingId) return false;
    if (b.unitId !== opts.unitId) return false;
    if (b.status === "closed") return false;
    return datesOverlap(opts.startDate, opts.endDate, b.startDate, b.endDate);
  });
}

export async function updateMeta(
  id: string,
  meta: Partial<
    Pick<
      Booking,
      | "customer"
      | "phone"
      | "subject"
      | "unitId"
      | "rate"
      | "startDate"
      | "endDate"
      | "deposit"
      | "status"
      | "overdueFee"
      | "depositDisposition"
    >
  >,
): Promise<Booking | null> {
  return mutate(id, async (b) => {
    const next: Booking = {
      ...b,
      ...meta,
      rate: meta.rate != null ? Number(meta.rate) || 0 : b.rate,
      deposit: meta.deposit != null ? Number(meta.deposit) || 0 : b.deposit,
      overdueFee:
        meta.overdueFee != null
          ? Math.max(0, Number(meta.overdueFee) || 0)
          : b.overdueFee ?? 0,
      depositDisposition:
        meta.depositDisposition ?? b.depositDisposition ?? "held",
      unitId:
        meta.unitId !== undefined
          ? meta.unitId
            ? String(meta.unitId)
            : null
          : b.unitId,
    };

    if (meta.unitId) {
      const unit = await getUnit(String(meta.unitId));
      if (unit) {
        if (!meta.subject) next.subject = unit.name;
        if (meta.rate == null && !(Number(b.rate) > 0)) next.rate = unit.rate;
      }
    }

    const unitId = next.unitId?.trim();
    if (
      unitId &&
      next.startDate &&
      next.endDate &&
      next.status !== "closed"
    ) {
      const conflicts = await findUnitConflicts({
        unitId,
        startDate: next.startDate,
        endDate: next.endDate,
        excludeBookingId: b.id,
      });
      if (conflicts.length > 0) {
        throw new Error(
          `Unit already booked (${conflicts[0]!.id}) for overlapping dates`,
        );
      }
    }

    return next;
  });
}

export async function checkIn(id: string): Promise<Booking | null> {
  return mutate(id, async (b) => {
    if (b.status === "closed") throw new Error("Booking already closed");
    if (!b.startDate || !b.endDate) {
      throw new Error("Set from/to dates before check-in");
    }
    if (b.unitId) {
      const unit = await getUnit(b.unitId);
      if (!unit) throw new Error("Linked unit not found");
      if (unit.status === "out_of_order") {
        throw new Error("Unit is out of order");
      }
      if (unit.status === "dirty") {
        throw new Error("Unit is dirty — mark clean before check-in");
      }
      const conflicts = await findUnitConflicts({
        unitId: b.unitId,
        startDate: b.startDate,
        endDate: b.endDate,
        excludeBookingId: b.id,
      });
      if (conflicts.some((c) => c.status === "active")) {
        throw new Error("Unit already has an active stay");
      }
      await setUnitStatus(b.unitId, "occupied");
    }
    return { ...b, status: "active" as const };
  });
}

export async function markClosed(id: string): Promise<Booking | null> {
  return mutate(id, (b) => ({ ...b, status: "closed" as const }));
}

export async function afterCheckoutHousekeeping(
  booking: Booking,
): Promise<BookingUnit | null> {
  if (!booking.unitId) return null;
  if (booking.type === "room") {
    return setUnitStatus(booking.unitId, "dirty");
  }
  return setUnitStatus(booking.unitId, "available");
}

export async function addExtra(
  id: string,
  description: string,
  amount: number,
  kind: ExtraKind = "folio",
): Promise<Booking | null> {
  return mutate(id, (b) => ({
    ...b,
    extras: [
      ...b.extras,
      {
        id: "X-" + randomUUID().slice(0, 6),
        description,
        amount,
        kind,
      },
    ],
  }));
}

export async function removeExtra(
  id: string,
  extraId: string,
): Promise<Booking | null> {
  return mutate(id, (b) => ({
    ...b,
    extras: b.extras.filter((e) => e.id !== extraId),
  }));
}

export async function removeBooking(id: string): Promise<void> {
  await store.remove(id);
}

export async function occupancyBoard(type: BookingType): Promise<
  {
    bookingId: string;
    unitId: string | null;
    subject: string;
    customer: string;
    startDate: string;
    endDate: string;
    status: BookingStatus;
  }[]
> {
  return (await listBookings(type))
    .filter((b) => b.status === "booked" || b.status === "active")
    .map((b) => ({
      bookingId: b.id,
      unitId: b.unitId ?? null,
      subject: b.subject,
      customer: b.customer,
      startDate: b.startDate,
      endDate: b.endDate,
      status: b.status,
    }));
}

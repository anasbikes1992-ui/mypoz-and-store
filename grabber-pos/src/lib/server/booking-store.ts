import "server-only";
import { randomUUID } from "crypto";
import { recordStore } from "./persistence/record-store";

/**
 * Booking engine shared by Rooms (hotel nights) and Rent (rental days). A
 * booking has a subject (room/item), a per-period rate, a date range, optional
 * extras and a refundable deposit. Checking out settles into a sale.
 */
export type BookingType = "room" | "rent";
export type BookingStatus = "booked" | "active" | "closed";

export interface BookingExtra {
  id: string;
  description: string;
  amount: number;
}

export interface Booking {
  id: string;
  type: BookingType;
  customer: string;
  phone: string;
  subject: string;
  rate: number;
  startDate: string;
  endDate: string;
  deposit: number;
  status: BookingStatus;
  extras: BookingExtra[];
  createdAt: string;
  updatedAt: string;
}

const store = recordStore<Booking>({
  collection: "bookings",
  file: "bookings.json",
});

export function bookingTotals(b: Booking) {
  let duration = 0;
  if (b.startDate && b.endDate) {
    const days = Math.round(
      (new Date(b.endDate).getTime() - new Date(b.startDate).getTime()) /
        86_400_000,
    );
    duration = Math.max(1, days);
  }
  const stayCharge = duration * (Number(b.rate) || 0);
  const extras = b.extras.reduce((s, e) => s + e.amount, 0);
  return { duration, stayCharge, extras, total: stayCharge + extras };
}

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
    rate: 0,
    startDate: today,
    endDate: "",
    deposit: 0,
    status: "booked",
    extras: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return store.put(booking);
}

async function mutate(
  id: string,
  fn: (b: Booking) => Booking,
): Promise<Booking | null> {
  const current = await store.get(id);
  if (!current) return null;
  return store.put({ ...fn(current), updatedAt: new Date().toISOString() });
}

export async function updateMeta(
  id: string,
  meta: Partial<
    Pick<
      Booking,
      "customer" | "phone" | "subject" | "rate" | "startDate" | "endDate" | "deposit" | "status"
    >
  >,
): Promise<Booking | null> {
  return mutate(id, (b) => ({
    ...b,
    ...meta,
    rate: meta.rate != null ? Number(meta.rate) || 0 : b.rate,
    deposit: meta.deposit != null ? Number(meta.deposit) || 0 : b.deposit,
  }));
}

export async function addExtra(
  id: string,
  description: string,
  amount: number,
): Promise<Booking | null> {
  return mutate(id, (b) => ({
    ...b,
    extras: [
      ...b.extras,
      { id: "X-" + randomUUID().slice(0, 6), description, amount },
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

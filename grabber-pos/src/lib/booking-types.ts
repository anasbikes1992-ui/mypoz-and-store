export type BookingType = "room" | "rent";
export type BookingStatus = "booked" | "active" | "closed";
export type DepositDisposition = "held" | "refunded" | "forfeited";
export type ExtraKind = "folio" | "fnb" | "other";

export interface BookingExtra {
  id: string;
  description: string;
  amount: number;
  kind?: ExtraKind;
}

export interface Booking {
  id: string;
  type: BookingType;
  customer: string;
  phone: string;
  subject: string;
  unitId?: string | null;
  rate: number;
  startDate: string;
  endDate: string;
  deposit: number;
  overdueFee: number;
  depositDisposition: DepositDisposition;
  status: BookingStatus;
  extras: BookingExtra[];
  createdAt: string;
  updatedAt: string;
}

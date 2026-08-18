export type BookingType = "room" | "rent";

export interface BookingConfig {
  title: string;
  subjectLabel: string;
  rateLabel: string;
  unit: string;
  basePath: string;
  newVerb: string;
  icon: string;
}

export const BOOKING_CONFIG: Record<BookingType, BookingConfig> = {
  room: {
    title: "Rooms",
    subjectLabel: "Room",
    rateLabel: "Rate / night",
    unit: "nights",
    basePath: "/rooms",
    newVerb: "New booking",
    icon: "🏨",
  },
  rent: {
    title: "Rent",
    subjectLabel: "Item",
    rateLabel: "Rate / day",
    unit: "days",
    basePath: "/rent",
    newVerb: "New rental",
    icon: "🔑",
  },
};

export const BOOKING_STATUSES = ["booked", "active", "closed"] as const;

export const BOOKING_STATUS_TONE: Record<string, string> = {
  booked: "bg-info/15 text-info",
  active: "bg-accent/15 text-accent",
  closed: "bg-surface-3 text-text-dim",
};

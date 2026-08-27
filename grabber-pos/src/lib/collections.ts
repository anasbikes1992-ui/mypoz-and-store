import { z } from "zod";

export type FieldType =
  | "text"
  | "number"
  | "textarea"
  | "date"
  | "email"
  | "tel"
  | "select";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  /** Show as a column/detail in the list. */
  inList?: boolean;
  /** Render the value as money. */
  money?: boolean;
  full?: boolean;
  /** Options for a select field. */
  options?: string[];
}

export interface CollectionConfig {
  name: string;
  singular: string;
  plural: string;
  icon: string;
  subtitle: string;
  fields: FieldDef[];
  schema: z.ZodType;
}

const text = (max = 200) => z.string().max(max);
const optionalText = (max = 200) => z.string().max(max).optional().default("");

export const COLLECTIONS: Record<string, CollectionConfig> = {
  categories: {
    name: "categories",
    singular: "Category",
    plural: "Categories",
    icon: "🗂️",
    subtitle: "Group your products",
    fields: [
      { key: "name", label: "Name", type: "text", required: true, inList: true },
      { key: "description", label: "Description", type: "textarea", full: true },
    ],
    schema: z.object({
      name: text().min(1, "Name is required"),
      description: optionalText(500),
    }),
  },
  brands: {
    name: "brands",
    singular: "Brand",
    plural: "Brands",
    icon: "🔖",
    subtitle: "Product brands",
    fields: [
      { key: "name", label: "Name", type: "text", required: true, inList: true },
      { key: "note", label: "Note", type: "textarea", full: true },
    ],
    schema: z.object({
      name: text().min(1, "Name is required"),
      note: optionalText(500),
    }),
  },
  suppliers: {
    name: "suppliers",
    singular: "Supplier",
    plural: "Suppliers",
    icon: "🚚",
    subtitle: "Who you buy from",
    fields: [
      { key: "name", label: "Name", type: "text", required: true, inList: true },
      { key: "phone", label: "Phone", type: "text", inList: true },
      { key: "email", label: "Email", type: "email" },
      { key: "address", label: "Address", type: "textarea", full: true },
    ],
    schema: z.object({
      name: text().min(1, "Name is required"),
      phone: optionalText(40),
      email: optionalText(120),
      address: optionalText(300),
    }),
  },
  customers: {
    name: "customers",
    singular: "Customer",
    plural: "Customers",
    icon: "👥",
    subtitle: "Credit & loyalty",
    fields: [
      { key: "name", label: "Name", type: "text", required: true, inList: true },
      { key: "mobile", label: "Mobile", type: "text", inList: true },
      { key: "email", label: "Email", type: "email" },
      { key: "creditLimit", label: "Credit limit", type: "number", money: true, inList: true },
      {
        key: "priceTier",
        label: "Price tier",
        type: "select",
        options: ["retail", "wholesale", "vip"],
        inList: true,
      },
      { key: "points", label: "Loyalty points", type: "number", inList: true },
      { key: "address", label: "Address", type: "textarea", full: true },
    ],
    schema: z.object({
      name: text().min(1, "Name is required"),
      mobile: optionalText(40),
      email: optionalText(120),
      creditLimit: z.coerce.number().min(0).default(0),
      priceTier: z.enum(["retail", "wholesale", "vip"]).default("retail"),
      points: z.coerce.number().min(0).default(0),
      address: optionalText(300),
    }),
  },
  expenses: {
    name: "expenses",
    singular: "Expense",
    plural: "Expenses",
    icon: "💸",
    subtitle: "Track spending",
    fields: [
      { key: "title", label: "Title", type: "text", required: true, inList: true },
      { key: "category", label: "Category", type: "text", inList: true },
      { key: "amount", label: "Amount", type: "number", required: true, money: true, inList: true },
      { key: "date", label: "Date", type: "date", inList: true },
      { key: "note", label: "Note", type: "textarea", full: true },
    ],
    schema: z.object({
      title: text().min(1, "Title is required"),
      category: optionalText(120),
      amount: z.coerce.number().min(0, "Amount is required"),
      date: optionalText(20),
      note: optionalText(500),
    }),
  },
  discount_codes: {
    name: "discount_codes",
    singular: "Discount code",
    plural: "Discount codes",
    icon: "🏷️",
    subtitle: "Store + POS coupons",
    fields: [
      { key: "code", label: "Code", type: "text", required: true, inList: true },
      {
        key: "kind",
        label: "Kind",
        type: "select",
        inList: true,
        options: ["fixed", "percent"],
      },
      { key: "amount", label: "Amount", type: "number", required: true, inList: true },
      { key: "minSubtotal", label: "Min subtotal", type: "number", money: true },
      { key: "maxUses", label: "Max uses", type: "number" },
      { key: "usedCount", label: "Used", type: "number", inList: true },
      { key: "startsAt", label: "Starts", type: "date", inList: true },
      { key: "expiry", label: "Expiry", type: "date", inList: true },
      { key: "description", label: "Description", type: "textarea", full: true },
      { key: "status", label: "Status", type: "select", inList: true, options: ["active", "paused"] },
    ],
    schema: z.object({
      code: text(40).min(1, "Code is required"),
      kind: z.enum(["fixed", "percent"]).default("fixed"),
      amount: z.coerce.number().min(0, "Amount is required"),
      minSubtotal: z.coerce.number().min(0).default(0),
      maxUses: z.coerce.number().min(0).default(0),
      usedCount: z.coerce.number().min(0).default(0),
      startsAt: optionalText(20),
      expiry: optionalText(20),
      description: optionalText(500),
      status: z.enum(["active", "paused"]).default("active"),
    }),
  },
  vouchers: {
    name: "vouchers",
    singular: "Gift voucher",
    plural: "Gift vouchers",
    icon: "🎁",
    subtitle: "Issue & redeem",
    fields: [
      { key: "code", label: "Code", type: "text", required: true, inList: true },
      { key: "amount", label: "Amount", type: "number", required: true, money: true, inList: true },
      { key: "expiry", label: "Expiry", type: "date", inList: true },
      { key: "status", label: "Status", type: "text", inList: true },
    ],
    schema: z.object({
      code: text(40).min(1, "Code is required"),
      amount: z.coerce.number().min(0, "Amount is required"),
      expiry: optionalText(20),
      status: optionalText(20),
    }),
  },
  employees: {
    name: "employees",
    singular: "Employee",
    plural: "Employees",
    icon: "🧑‍💼",
    subtitle: "Your staff",
    fields: [
      { key: "name", label: "Name", type: "text", required: true, inList: true },
      { key: "role", label: "Role", type: "text", inList: true },
      { key: "phone", label: "Phone", type: "text", inList: true },
      { key: "salary", label: "Monthly salary", type: "number", money: true, inList: true },
      { key: "joinDate", label: "Joined", type: "date" },
    ],
    schema: z.object({
      name: text().min(1, "Name is required"),
      role: optionalText(80),
      phone: optionalText(40),
      salary: z.coerce.number().min(0).default(0),
      joinDate: optionalText(20),
    }),
  },
  attendance: {
    name: "attendance",
    singular: "Attendance record",
    plural: "Attendance",
    icon: "🕒",
    subtitle: "Clock in / out",
    fields: [
      { key: "employee", label: "Employee", type: "text", required: true, inList: true },
      { key: "date", label: "Date", type: "date", inList: true },
      { key: "status", label: "Status", type: "text", inList: true },
      { key: "checkIn", label: "Check in", type: "text" },
      { key: "checkOut", label: "Check out", type: "text" },
    ],
    schema: z.object({
      employee: text().min(1, "Employee is required"),
      date: optionalText(20),
      status: optionalText(20),
      checkIn: optionalText(20),
      checkOut: optionalText(20),
    }),
  },
  salaries: {
    name: "salaries",
    singular: "Salary payment",
    plural: "Salaries",
    icon: "💵",
    subtitle: "Payroll runs",
    fields: [
      { key: "employee", label: "Employee", type: "text", required: true, inList: true },
      { key: "month", label: "Month", type: "text", inList: true },
      { key: "amount", label: "Amount", type: "number", required: true, money: true, inList: true },
      { key: "status", label: "Status", type: "text", inList: true },
    ],
    schema: z.object({
      employee: text().min(1, "Employee is required"),
      month: optionalText(20),
      amount: z.coerce.number().min(0, "Amount is required"),
      status: optionalText(20),
    }),
  },
  cashin: {
    name: "cashin",
    singular: "Cash in",
    plural: "Cash in",
    icon: "📥",
    subtitle: "Money into the drawer",
    fields: [
      { key: "title", label: "Reason", type: "text", required: true, inList: true },
      { key: "amount", label: "Amount", type: "number", required: true, money: true, inList: true },
      { key: "date", label: "Date", type: "date", inList: true },
      { key: "note", label: "Note", type: "textarea", full: true },
    ],
    schema: z.object({
      title: text().min(1, "Reason is required"),
      amount: z.coerce.number().min(0, "Amount is required"),
      date: optionalText(20),
      note: optionalText(500),
    }),
  },
  cashout: {
    name: "cashout",
    singular: "Cash out",
    plural: "Cash out",
    icon: "📤",
    subtitle: "Money out of the drawer",
    fields: [
      { key: "title", label: "Reason", type: "text", required: true, inList: true },
      { key: "amount", label: "Amount", type: "number", required: true, money: true, inList: true },
      { key: "date", label: "Date", type: "date", inList: true },
      { key: "note", label: "Note", type: "textarea", full: true },
    ],
    schema: z.object({
      title: text().min(1, "Reason is required"),
      amount: z.coerce.number().min(0, "Amount is required"),
      date: optionalText(20),
      note: optionalText(500),
    }),
  },
  income: {
    name: "income",
    singular: "Income entry",
    plural: "Income",
    icon: "🏦",
    subtitle: "Other income",
    fields: [
      { key: "title", label: "Source", type: "text", required: true, inList: true },
      { key: "category", label: "Category", type: "text", inList: true },
      { key: "amount", label: "Amount", type: "number", required: true, money: true, inList: true },
      { key: "date", label: "Date", type: "date", inList: true },
    ],
    schema: z.object({
      title: text().min(1, "Source is required"),
      category: optionalText(120),
      amount: z.coerce.number().min(0, "Amount is required"),
      date: optionalText(20),
    }),
  },
  currency: {
    name: "currency",
    singular: "Currency rate",
    plural: "Currency rates",
    icon: "💱",
    subtitle: "Multi-currency",
    fields: [
      { key: "code", label: "Code", type: "text", required: true, inList: true },
      { key: "name", label: "Name", type: "text", inList: true },
      { key: "rate", label: "Rate (to LKR)", type: "number", required: true, inList: true },
    ],
    schema: z.object({
      code: text(10).min(1, "Code is required"),
      name: optionalText(80),
      rate: z.coerce.number().min(0, "Rate is required"),
    }),
  },
  packages: {
    name: "packages",
    singular: "Package",
    plural: "Packages",
    icon: "📦",
    subtitle: "Product packs & variants",
    fields: [
      { key: "name", label: "Name", type: "text", required: true, inList: true },
      { key: "productId", label: "Product ID", type: "text", inList: true },
      { key: "qty", label: "Qty per pack", type: "number", inList: true },
      { key: "price", label: "Pack price", type: "number", required: true, money: true, inList: true },
      {
        key: "items",
        label: "Items JSON (optional multi)",
        type: "textarea",
        full: true,
      },
    ],
    schema: z
      .object({
        name: text().min(1, "Name is required"),
        productId: optionalText(80),
        qty: z.coerce.number().min(1).optional().default(1),
        price: z.coerce.number().min(0, "Price is required"),
        items: z.preprocess((v) => {
          if (v == null || v === "") return undefined;
          if (typeof v === "string") {
            const trimmed = v.trim();
            if (!trimmed) return undefined;
            try {
              return JSON.parse(trimmed);
            } catch {
              return v;
            }
          }
          return v;
        }, z
          .array(
            z.object({
              productId: z.string().min(1),
              qty: z.coerce.number().min(1),
            }),
          )
          .optional()),
      })
      .refine(
        (d) =>
          (Array.isArray(d.items) && d.items.length > 0) ||
          Boolean(d.productId?.trim()),
        { message: "Provide productId+qty or items JSON", path: ["productId"] },
      ),
  },
  digital_goods: {
    name: "digital_goods",
    singular: "Digital good",
    plural: "Digital goods",
    icon: "💾",
    subtitle: "Non-inventory digital products",
    fields: [
      { key: "name", label: "Name", type: "text", required: true, inList: true },
      { key: "sku", label: "SKU", type: "text", inList: true },
      { key: "price", label: "Price", type: "number", required: true, money: true, inList: true },
      {
        key: "deliveryChannel",
        label: "Delivery",
        type: "select",
        options: ["email", "whatsapp"],
        inList: true,
      },
      { key: "bodyTemplate", label: "Delivery message", type: "textarea", full: true },
    ],
    schema: z.object({
      name: text().min(1, "Name is required"),
      sku: optionalText(80),
      price: z.coerce.number().min(0, "Price is required"),
      deliveryChannel: z.enum(["email", "whatsapp"]).default("whatsapp"),
      bodyTemplate: optionalText(2000),
    }),
  },
  memberships: {
    name: "memberships",
    singular: "Membership",
    plural: "Memberships",
    icon: "🎖️",
    subtitle: "Member plans & pricing",
    fields: [
      { key: "name", label: "Name", type: "text", required: true, inList: true },
      { key: "customerId", label: "Customer ID", type: "text", required: true, inList: true },
      { key: "planName", label: "Plan", type: "text", required: true, inList: true },
      { key: "price", label: "Price", type: "number", required: true, money: true, inList: true },
      { key: "periodDays", label: "Period (days)", type: "number", required: true, inList: true },
      { key: "startDate", label: "Start", type: "date", inList: true },
      { key: "endDate", label: "End", type: "date", inList: true },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["active", "expired", "paused"],
        inList: true,
      },
      { key: "memberPricePercent", label: "Member discount %", type: "number", inList: true },
    ],
    schema: z.object({
      name: text().min(1, "Name is required"),
      customerId: text(80).min(1, "Customer ID is required"),
      planName: text(120).min(1, "Plan is required"),
      price: z.coerce.number().min(0, "Price is required"),
      periodDays: z.coerce.number().min(1).default(30),
      startDate: optionalText(20),
      endDate: optionalText(20),
      status: z.enum(["active", "expired", "paused"]).default("active"),
      memberPricePercent: z.coerce.number().min(0).max(100).default(0),
    }),
  },
  variants: {
    name: "variants",
    singular: "Variant",
    plural: "Product variants",
    icon: "🧬",
    subtitle: "SKU matrix (size, colour, etc.)",
    fields: [
      { key: "productId", label: "Parent product ID", type: "text", required: true, inList: true },
      { key: "name", label: "Variant name", type: "text", required: true, inList: true },
      { key: "sku", label: "SKU", type: "text", required: true, inList: true },
      { key: "price", label: "Price", type: "number", required: true, money: true, inList: true },
      { key: "quantity", label: "Qty", type: "number", required: true, inList: true },
      { key: "barcode", label: "Barcode", type: "text", inList: true },
    ],
    schema: z.object({
      productId: text(80).min(1, "Parent product ID is required"),
      name: text().min(1, "Name is required"),
      sku: text(80).min(1, "SKU is required"),
      price: z.coerce.number().min(0, "Price is required"),
      quantity: z.coerce.number().min(0).default(0),
      barcode: optionalText(80),
    }),
  },
  clients: {
    name: "clients",
    singular: "Client",
    plural: "Client organizations",
    icon: "🏢",
    subtitle: "Reseller clients",
    fields: [
      { key: "name", label: "Business name", type: "text", required: true, inList: true },
      { key: "contact", label: "Contact", type: "text", inList: true },
      {
        key: "plan",
        label: "Plan",
        type: "select",
        options: ["starter", "business", "enterprise"],
        inList: true,
      },
      { key: "expiry", label: "License expiry", type: "date", inList: true },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["active", "suspended"],
        inList: true,
      },
    ],
    schema: z.object({
      name: text(160).min(1, "Name is required"),
      contact: optionalText(120),
      plan: z.enum(["starter", "business", "enterprise"]).default("starter"),
      expiry: optionalText(20),
      status: z.enum(["active", "suspended"]).default("active"),
    }),
  },
  drivers: {
    name: "drivers",
    singular: "Driver",
    plural: "Delivery drivers",
    icon: "🛵",
    subtitle: "Delivery fleet",
    fields: [
      { key: "name", label: "Name", type: "text", required: true, inList: true },
      { key: "phone", label: "Phone", type: "text", inList: true },
      { key: "vehicle", label: "Vehicle", type: "text", inList: true },
    ],
    schema: z.object({
      name: text().min(1, "Name is required"),
      phone: optionalText(40),
      vehicle: optionalText(80),
    }),
  },
  tables: {
    name: "tables",
    singular: "Table",
    plural: "Tables",
    icon: "🍽️",
    subtitle: "Restaurant floor",
    fields: [
      { key: "name", label: "Table name / no.", type: "text", required: true, inList: true },
      { key: "area", label: "Area", type: "text", inList: true },
      { key: "seats", label: "Seats", type: "number", inList: true },
    ],
    schema: z.object({
      name: text(60).min(1, "Name is required"),
      area: optionalText(60),
      seats: z.coerce.number().min(0).default(0),
    }),
  },
  users: {
    name: "users",
    singular: "User",
    plural: "Users & admins",
    icon: "🛡️",
    subtitle: "Staff logins & roles",
    fields: [
      { key: "name", label: "Full name", type: "text", required: true, inList: true },
      { key: "email", label: "Email / username", type: "text", required: true, inList: true },
      {
        key: "role",
        label: "Role",
        type: "select",
        options: ["owner", "manager", "cashier"],
        inList: true,
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["active", "disabled"],
        inList: true,
      },
    ],
    schema: z.object({
      name: text().min(1, "Name is required"),
      email: text(160).min(1, "Email is required"),
      role: z.enum(["owner", "manager", "cashier"]).default("cashier"),
      status: z.enum(["active", "disabled"]).default("active"),
    }),
  },
  quotations: {
    name: "quotations",
    singular: "Quotation",
    plural: "Quotations",
    icon: "📝",
    subtitle: "Quote → convert to sale",
    fields: [
      { key: "customer", label: "Customer", type: "text", required: true, inList: true },
      { key: "date", label: "Date", type: "date", inList: true },
      { key: "amount", label: "Amount", type: "number", required: true, money: true, inList: true },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["draft", "sent", "accepted", "rejected"],
        inList: true,
      },
      { key: "note", label: "Note", type: "textarea", full: true },
    ],
    schema: z.object({
      customer: text().min(1, "Customer is required"),
      date: optionalText(20),
      amount: z.coerce.number().min(0, "Amount is required"),
      status: z.enum(["draft", "sent", "accepted", "rejected"]).default("draft"),
      note: optionalText(500),
    }),
  },
  appointments: {
    name: "appointments",
    singular: "Appointment",
    plural: "Appointments",
    icon: "📅",
    subtitle: "Bookings calendar",
    fields: [
      { key: "customer", label: "Customer", type: "text", required: true, inList: true },
      { key: "date", label: "Date", type: "date", inList: true },
      { key: "time", label: "Time", type: "text", inList: true },
      { key: "service", label: "Service", type: "text", inList: true },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["booked", "completed", "cancelled"],
        inList: true,
      },
    ],
    schema: z.object({
      customer: text().min(1, "Customer is required"),
      date: optionalText(20),
      time: optionalText(20),
      service: optionalText(120),
      status: z.enum(["booked", "completed", "cancelled"]).default("booked"),
    }),
  },
  manualpayments: {
    name: "manualpayments",
    singular: "Manual payment",
    plural: "Manual payments",
    icon: "🧾",
    subtitle: "Record off-system payments",
    fields: [
      { key: "reference", label: "Reference", type: "text", required: true, inList: true },
      {
        key: "method",
        label: "Method",
        type: "select",
        options: ["cash", "card", "bank", "wallet"],
        inList: true,
      },
      { key: "amount", label: "Amount", type: "number", required: true, money: true, inList: true },
      { key: "date", label: "Date", type: "date", inList: true },
      { key: "note", label: "Note", type: "textarea", full: true },
    ],
    schema: z.object({
      reference: text(120).min(1, "Reference is required"),
      method: z.enum(["cash", "card", "bank", "wallet"]).default("cash"),
      amount: z.coerce.number().min(0, "Amount is required"),
      date: optionalText(20),
      note: optionalText(500),
    }),
  },
  sms: {
    name: "sms",
    singular: "SMS template",
    plural: "SMS templates",
    icon: "✉️",
    subtitle: "Message templates",
    fields: [
      { key: "name", label: "Template name", type: "text", required: true, inList: true },
      { key: "message", label: "Message", type: "textarea", required: true, full: true, inList: true },
    ],
    schema: z.object({
      name: text(80).min(1, "Name is required"),
      message: text(500).min(1, "Message is required"),
    }),
  },
  jobs: {
    name: "jobs",
    singular: "Job",
    plural: "Jobs",
    icon: "🧰",
    subtitle: "Assign employee jobs",
    fields: [
      { key: "employee", label: "Employee", type: "text", required: true, inList: true },
      { key: "title", label: "Job", type: "text", required: true, inList: true },
      { key: "date", label: "Date", type: "date", inList: true },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["pending", "in progress", "done"],
        inList: true,
      },
      { key: "note", label: "Note", type: "textarea", full: true },
    ],
    schema: z.object({
      employee: text().min(1, "Employee is required"),
      title: text(160).min(1, "Job is required"),
      date: optionalText(20),
      status: z.enum(["pending", "in progress", "done"]).default("pending"),
      note: optionalText(500),
    }),
  },
  help: {
    name: "help",
    singular: "Guide",
    plural: "Guides",
    icon: "📣",
    subtitle: "Release notes & training videos",
    fields: [
      { key: "title", label: "Title", type: "text", required: true, inList: true },
      {
        key: "kind",
        label: "Type",
        type: "select",
        options: ["update", "video", "notice"],
        inList: true,
      },
      { key: "date", label: "Date", type: "date", inList: true },
      { key: "link", label: "Link", type: "text", inList: true },
      { key: "body", label: "Details", type: "textarea", full: true },
    ],
    schema: z.object({
      title: text(160).min(1, "Title is required"),
      kind: z.enum(["update", "video", "notice"]).default("update"),
      date: optionalText(20),
      link: optionalText(500),
      body: optionalText(2000),
    }),
  },
};

export function getCollection(name: string): CollectionConfig | undefined {
  return COLLECTIONS[name];
}

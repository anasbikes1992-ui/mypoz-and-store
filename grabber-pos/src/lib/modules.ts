export interface ModuleTile {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  href?: string;
  status: "active" | "soon";
}

export interface ModuleGroup {
  label: string;
  tiles: ModuleTile[];
}

/**
 * The tile-launcher catalog. Active tiles link to a live screen; "soon" tiles
 * are shown so clients see the full roadmap, and light up as verticals ship.
 */
export const MODULE_GROUPS: ModuleGroup[] = [
  {
    label: "Sale modes",
    tiles: [
      { key: "retail", title: "Retail", subtitle: "Barcode retail billing", icon: "🛍️", href: "/pos", status: "active" },
      { key: "wholesale", title: "Wholesale", subtitle: "Wholesale pricing", icon: "📦", href: "/pos?mode=wholesale", status: "active" },
      { key: "category", title: "Category", subtitle: "Sell by category grid", icon: "🗂️", href: "/pos?mode=category", status: "active" },
      { key: "restaurant", title: "Restaurant", subtitle: "Tables · KOT / BOT", icon: "🍽️", href: "/restaurant", status: "active" },
      { key: "kds", title: "Kitchen display", subtitle: "Live KOT tickets", icon: "🍳", href: "/kds", status: "active" },
      { key: "delivery", title: "Delivery", subtitle: "Orders + drivers", icon: "🛵", href: "/delivery", status: "active" },
      { key: "repair", title: "Repair", subtitle: "Item repair jobs", icon: "🔧", href: "/repair", status: "soon" },
      { key: "service", title: "Vehicle service", subtitle: "Parts + labour", icon: "🚗", href: "/service", status: "active" },
      { key: "reloads", title: "Reloads", subtitle: "Mobile top-ups", icon: "📱", href: "/reloads", status: "active" },
      { key: "rooms", title: "Rooms", subtitle: "Hotel booking", icon: "🏨", href: "/rooms", status: "soon" },
      { key: "rent", title: "Rent", subtitle: "Rentals + deposits", icon: "🔑", href: "/rent", status: "soon" },
      { key: "hire", title: "Hire purchase", subtitle: "Installments", icon: "📆", href: "/hire-purchase", status: "soon" },
      { key: "play", title: "Play area", subtitle: "Time-based billing", icon: "🎠", href: "/play", status: "active" },
      { key: "layaway", title: "Layaway", subtitle: "Deposits & holds", icon: "🧾", href: "/layaway", status: "active" },
      { key: "click-collect", title: "Click & collect", subtitle: "Pick list", icon: "🧺", href: "/click-collect", status: "active" },
      { key: "digital", title: "Digital", subtitle: "Non-inventory goods", icon: "💾", href: "/digital", status: "active" },
    ],
  },
  {
    label: "Business",
    tiles: [
      { key: "products", title: "Products", subtitle: "Manage your products", icon: "🏷️", href: "/products", status: "active" },
      { key: "packages", title: "Packages", subtitle: "Packs & variants", icon: "📦", href: "/packages", status: "active" },
      { key: "variants", title: "Variants", subtitle: "SKU matrix", icon: "🧬", href: "/variants", status: "active" },
      { key: "categories", title: "Categories", subtitle: "Group products", icon: "🗂️", href: "/categories", status: "active" },
      { key: "brands", title: "Brands", subtitle: "Product brands", icon: "🔖", href: "/brands", status: "active" },
      { key: "inventory", title: "Inventory", subtitle: "Stock & expiry", icon: "📊", href: "/inventory", status: "active" },
      { key: "stocktake", title: "Stocktake", subtitle: "Count & post variances", icon: "🔢", href: "/stocktake", status: "active" },
      { key: "transfers", title: "Transfers", subtitle: "Branch stock moves", icon: "🔀", href: "/transfers", status: "active" },
      { key: "customers", title: "Customers", subtitle: "Credit · loyalty", icon: "👥", href: "/customers", status: "active" },
      { key: "loyalty", title: "Loyalty ledger", subtitle: "Points history", icon: "⭐", href: "/loyalty", status: "active" },
      { key: "memberships", title: "Memberships", subtitle: "Plans & member pricing", icon: "🎖️", href: "/memberships", status: "active" },
      { key: "crm", title: "CRM lite", subtitle: "Segments & outreach", icon: "📇", href: "/crm", status: "active" },
      { key: "suppliers", title: "Suppliers", subtitle: "Manage suppliers", icon: "🚚", href: "/suppliers", status: "active" },
      { key: "purchases", title: "Purchase orders", subtitle: "Order → receive", icon: "📋", href: "/purchase-orders", status: "active" },
      { key: "grn", title: "Goods Received", subtitle: "Receive stock (GRN)", icon: "🧾", href: "/grn", status: "active" },
      { key: "returns", title: "Returns", subtitle: "Restock returns", icon: "↩️", href: "/returns", status: "active" },
      { key: "damages", title: "Damages", subtitle: "Write off stock", icon: "🛠️", href: "/damages", status: "active" },
      { key: "barcode", title: "Barcode labels", subtitle: "Print labels", icon: "🏭", href: "/barcode", status: "active" },
      { key: "vouchers", title: "Gift vouchers", subtitle: "Issue & redeem", icon: "🎁", href: "/vouchers", status: "active" },
    ],
  },
  {
    label: "Staff & money",
    tiles: [
      { key: "users", title: "Users & admins", subtitle: "Logins & roles", icon: "🛡️", href: "/users", status: "active" },
      { key: "permissions", title: "Permissions", subtitle: "PIN · idle lock", icon: "🔐", href: "/permissions", status: "active" },
      { key: "register", title: "Register", subtitle: "Open / close · Z-report", icon: "💵", href: "/register", status: "active" },
      { key: "employees", title: "Employees", subtitle: "Your staff", icon: "🧑‍💼", href: "/employees", status: "active" },
      { key: "attendance", title: "Attendance", subtitle: "Clock in / out", icon: "🕒", href: "/attendance", status: "active" },
      { key: "salaries", title: "Salary", subtitle: "Payroll", icon: "💵", href: "/salaries", status: "active" },
      { key: "expenses", title: "Expenses", subtitle: "Track spending", icon: "💸", href: "/expenses", status: "active" },
      { key: "cashin", title: "Cash in", subtitle: "Into the drawer", icon: "📥", href: "/cash-in", status: "active" },
      { key: "cashout", title: "Cash out", subtitle: "Out of the drawer", icon: "📤", href: "/cash-out", status: "active" },
      { key: "income", title: "Income", subtitle: "Other income", icon: "🏦", href: "/income", status: "active" },
      { key: "currency", title: "Currency", subtitle: "Exchange rates", icon: "💱", href: "/currency", status: "active" },
      { key: "jobs", title: "Jobs", subtitle: "Assign employee jobs", icon: "🧰", href: "/jobs", status: "active" },
    ],
  },
  {
    label: "Sales & comms",
    tiles: [
      { key: "quotations", title: "Quotations", subtitle: "Quote → sale", icon: "📝", href: "/quotations", status: "active" },
      { key: "manualpayments", title: "Manual payments", subtitle: "Off-system payments", icon: "🧾", href: "/manual-payments", status: "active" },
      { key: "appointments", title: "Appointments", subtitle: "Bookings", icon: "📅", href: "/appointments", status: "active" },
      { key: "tables", title: "Tables", subtitle: "Restaurant floor", icon: "🪑", href: "/tables", status: "active" },
      { key: "drivers", title: "Delivery drivers", subtitle: "Fleet", icon: "🛵", href: "/drivers", status: "active" },
      { key: "sms", title: "SMS templates", subtitle: "Message templates", icon: "✉️", href: "/sms", status: "active" },
      { key: "whatsapp", title: "WhatsApp", subtitle: "Cloud API inbox + bot", icon: "WA", href: "/whatsapp", status: "active" },
    ],
  },
  {
    label: "Online store",
    tiles: [
      { key: "commerce-onboarding", title: "Launch store", subtitle: "Products → theme → COD → publish", icon: "🚀", href: "/commerce/onboarding", status: "active" },
      { key: "commerce", title: "Store overview", subtitle: "Sales, orders, live stock", icon: "🛍️", href: "/commerce", status: "active" },
      { key: "commerce-builder", title: "Store builder", subtitle: "Pages · sections · publish", icon: "🧩", href: "/commerce/builder", status: "active" },
      { key: "commerce-themes", title: "Theme marketplace", subtitle: "Official MyPoz looks", icon: "🎨", href: "/commerce/themes", status: "active" },
      { key: "commerce-orders", title: "Online orders", subtitle: "Same inventory as POS", icon: "📦", href: "/commerce/orders", status: "active" },
      { key: "commerce-analytics", title: "Store analytics", subtitle: "Visitors to purchase", icon: "📉", href: "/commerce/analytics", status: "active" },
      { key: "commerce-collections", title: "Collections", subtitle: "Smart rules from POS stock", icon: "🗂️", href: "/commerce/collections", status: "active" },
      { key: "commerce-discounts", title: "Discount codes", subtitle: "Same codes on POS + store", icon: "🏷️", href: "/commerce/discounts", status: "active" },
      { key: "commerce-media", title: "Media library", subtitle: "Product and theme images", icon: "🖼", href: "/commerce/media", status: "active" },
      { key: "commerce-domains", title: "Domains", subtitle: "Connected after DNS verifies", icon: "🔗", href: "/commerce/domains", status: "active" },
      { key: "website", title: "Website settings", subtitle: "Payments · fulfilment · SEO", icon: "🌐", href: "/website", status: "active" },
    ],
  },
  {
    label: "Insights",
    tiles: [
      { key: "dashboard", title: "Dashboard", subtitle: "Today at a glance", icon: "📈", href: "/dashboard", status: "active" },
      { key: "sales", title: "Sales", subtitle: "History & receipts", icon: "🧮", href: "/sales", status: "active" },
      { key: "reports", title: "Reports", subtitle: "Analytics & export", icon: "📑", href: "/reports", status: "active" },
      { key: "alerts", title: "Alerts", subtitle: "Low stock & expiry", icon: "🔔", href: "/alerts", status: "active" },
      { key: "audit", title: "Audit log", subtitle: "Sensitive actions", icon: "📜", href: "/audit", status: "active" },
      { key: "settings", title: "Settings", subtitle: "Business & receipt", icon: "⚙️", href: "/settings", status: "active" },
      { key: "assistant", title: "Jarvis", subtitle: "Shop AI agents", icon: "✦", href: "/assistant", status: "active" },
      { key: "knowledge", title: "Shop knowledge", subtitle: "Train Jarvis (Business+)", icon: "📚", href: "/knowledge", status: "active" },
      { key: "approvals", title: "Approvals", subtitle: "Approve Jarvis drafts", icon: "✓", href: "/approvals", status: "active" },
      { key: "display", title: "Customer display", subtitle: "Second screen total", icon: "🖥️", href: "/display", status: "active" },
      { key: "privacy", title: "Privacy purge", subtitle: "PII retention", icon: "🧹", href: "/privacy", status: "active" },
      { key: "billing", title: "Billing", subtitle: "Plan, expiry, upgrade", icon: "💳", href: "/billing", status: "active" },
      { key: "observability", title: "Session replay", subtitle: "Errors and rage clicks", icon: "🎬", href: "/observability", status: "active" },
      { key: "backup", title: "Backup", subtitle: "Download tenant JSON", icon: "💾", href: "/api/backup", status: "active" },
      { key: "help", title: "Help & guides", subtitle: "Notes & videos", icon: "📣", href: "/help", status: "active" },
    ],
  },
  {
    label: "Reselling",
    tiles: [
      { key: "admin", title: "Super-admin", subtitle: "Branding & licensing", icon: "🛡️", href: "/admin", status: "active" },
      { key: "clients", title: "Clients", subtitle: "Client organizations", icon: "🏢", href: "/admin", status: "active" },
    ],
  },
];

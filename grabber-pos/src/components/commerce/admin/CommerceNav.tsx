"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/commerce", label: "Overview" },
  { href: "/commerce/onboarding", label: "Launch store" },
  { href: "/commerce/builder", label: "Store builder" },
  { href: "/commerce/themes", label: "Themes" },
  { href: "/commerce/orders", label: "Orders" },
  { href: "/commerce/pages", label: "Pages" },
  { href: "/commerce/navigation", label: "Navigation" },
  { href: "/commerce/delivery", label: "Delivery" },
  { href: "/commerce/domains", label: "Domains" },
  { href: "/commerce/analytics", label: "Analytics" },
  { href: "/products", label: "Products (POS)" },
  { href: "/customers", label: "Customers (POS)" },
  { href: "/website", label: "Legacy website" },
];

export function CommerceNav() {
  const path = usePathname();
  return (
    <nav aria-label="Commerce" className="flex gap-1 overflow-x-auto pb-1">
      {LINKS.map((l) => {
        const active = path === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
              active
                ? "bg-accent text-accent-ink"
                : "border border-line text-text-dim hover:border-accent hover:text-accent"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

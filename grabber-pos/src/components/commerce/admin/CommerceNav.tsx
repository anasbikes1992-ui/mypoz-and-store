"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBrand } from "@/components/brand/BrandProvider";

const LINKS = [
  { href: "/commerce", label: "Overview", key: "commerce" },
  { href: "/commerce/onboarding", label: "Launch", key: "commerce-onboarding" },
  { href: "/commerce/builder", label: "Builder", key: "commerce-builder" },
  { href: "/commerce/themes", label: "Themes", key: "commerce-themes" },
  { href: "/commerce/orders", label: "Orders", key: "commerce-orders" },
  { href: "/commerce/collections", label: "Collections", key: "commerce-collections" },
  { href: "/commerce/discounts", label: "Discounts", key: "commerce-discounts" },
  { href: "/commerce/media", label: "Media", key: "commerce-media" },
  { href: "/commerce/delivery", label: "Delivery", key: "delivery" },
  { href: "/commerce/domains", label: "Domains", key: "commerce-domains" },
  { href: "/commerce/analytics", label: "Analytics", key: "commerce-analytics" },
  { href: "/products", label: "Products", key: "products" },
] as const;

function linkAllowed(
  key: string,
  enabledKeys: Set<string>,
  loading: boolean,
): boolean {
  if (loading) return key !== "delivery";
  if (key === "delivery") return enabledKeys.has("delivery");
  if (key === "products") return enabledKeys.has("products");
  return (
    enabledKeys.has(key) ||
    enabledKeys.has("commerce") ||
    enabledKeys.has("commerce-onboarding")
  );
}

export function CommerceNav() {
  const path = usePathname();
  const { enabledKeys, loading } = useBrand();

  const links = LINKS.filter((l) => linkAllowed(l.key, enabledKeys, loading));

  return (
    <nav
      aria-label="Commerce"
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]"
    >
      {links.map((l) => {
        const active = path === l.href || path.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition duration-150 ${
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

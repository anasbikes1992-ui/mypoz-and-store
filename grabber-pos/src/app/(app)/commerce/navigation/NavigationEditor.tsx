"use client";

import { NavigationBuilder } from "@/components/commerce/builder/NavigationBuilder";
import type { NavItem } from "@/lib/commerce/schema";

export function NavigationEditor({
  navigation,
  footerLinks,
}: {
  navigation: NavItem[];
  footerLinks: NavItem[];
}) {
  async function onSave(nav: NavItem[], footer: NavItem[]) {
    const res = await fetch("/api/commerce", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ navigation: nav, footerLinks: footer }),
    });
    if (!res.ok) throw new Error("Save failed");
  }

  return (
    <NavigationBuilder
      initial={{ navigation, footerLinks }}
      onSave={onSave}
    />
  );
}

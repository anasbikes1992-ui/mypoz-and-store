"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CollectionManager } from "@/components/collections/CollectionManager";
import { ModuleHeader } from "@/components/shell/ModuleHeader";

interface DeliveryOrder {
  id: string;
  driver: string;
  status: string;
}

export default function DriversPage() {
  const [activeByDriver, setActiveByDriver] = useState<Record<string, number>>(
    {},
  );

  useEffect(() => {
    fetch("/api/delivery/orders")
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) return;
        const map: Record<string, number> = {};
        for (const o of j.data as DeliveryOrder[]) {
          if (!o.driver || o.status === "delivered") continue;
          map[o.driver] = (map[o.driver] ?? 0) + 1;
        }
        setActiveByDriver(map);
      })
      .catch(() => undefined);
  }, []);

  const activeTotal = Object.values(activeByDriver).reduce((s, n) => s + n, 0);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <ModuleHeader
        title="Delivery drivers"
        subtitle={`Fleet roster · ${activeTotal} active assignment(s)`}
        actions={
          <Link
            href="/delivery"
            className="rounded-lg border border-line px-4 py-2 text-sm text-text-dim transition hover:border-accent hover:text-accent"
          >
            Delivery hub
          </Link>
        }
      />

      {Object.keys(activeByDriver).length > 0 && (
        <div className="mt-4 rounded-xl border border-line bg-surface-1 p-4">
          <p className="text-sm font-medium text-text-strong">Active loads</p>
          <ul className="mt-2 space-y-1 text-sm text-text-body">
            {Object.entries(activeByDriver).map(([name, count]) => (
              <li key={name}>
                🛵 {name} — {count} order{count === 1 ? "" : "s"} out
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        <CollectionManager name="drivers" />
      </div>
    </div>
  );
}

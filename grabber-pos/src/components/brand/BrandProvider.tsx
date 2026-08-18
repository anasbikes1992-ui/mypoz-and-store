"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  DEFAULT_TENANT,
  planEnabledKeys,
  type Brand,
  type License,
} from "@/lib/plans";
import { MODULE_GROUPS } from "@/lib/modules";

const ALL_MODULE_KEYS = MODULE_GROUPS.flatMap((g) =>
  g.tiles.map((t) => t.key),
);

function defaultEnabledKeys(): Set<string> {
  return planEnabledKeys(
    DEFAULT_TENANT.license.plan,
    ALL_MODULE_KEYS,
    DEFAULT_TENANT.license.extras,
  );
}

interface BrandState {
  brand: Brand;
  license: License;
  enabledKeys: Set<string>;
  expired: boolean;
  loading: boolean;
  refresh: () => void;
}

const BrandCtx = createContext<BrandState>({
  brand: DEFAULT_TENANT.brand,
  license: DEFAULT_TENANT.license,
  enabledKeys: new Set(ALL_MODULE_KEYS),
  expired: false,
  loading: true,
  refresh: () => undefined,
});

export function useBrand() {
  return useContext(BrandCtx);
}

/** Applies the accent colour to the design tokens live. */
function applyAccent(color: string) {
  const root = document.documentElement;
  if (color) {
    root.style.setProperty("--accent", color);
    root.style.setProperty("--accent-strong", color);
  } else {
    root.style.removeProperty("--accent");
    root.style.removeProperty("--accent-strong");
  }
}

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Omit<BrandState, "refresh">>({
    brand: DEFAULT_TENANT.brand,
    license: DEFAULT_TENANT.license,
    enabledKeys: defaultEnabledKeys(),
    expired: false,
    loading: true,
  });

  const refresh = useCallback(() => {
    fetch("/api/tenant")
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) {
          // Auth flake / chunked cookie miss — keep enterprise defaults unlocked
          setState({
            brand: DEFAULT_TENANT.brand,
            license: DEFAULT_TENANT.license,
            enabledKeys: defaultEnabledKeys(),
            expired: false,
            loading: false,
          });
          return;
        }
        applyAccent(j.data.brand.accentColor);
        setState({
          brand: j.data.brand,
          license: j.data.license,
          enabledKeys: new Set<string>(j.data.enabledKeys),
          expired: !!j.data.expired,
          loading: false,
        });
      })
      .catch(() =>
        setState({
          brand: DEFAULT_TENANT.brand,
          license: DEFAULT_TENANT.license,
          enabledKeys: defaultEnabledKeys(),
          expired: false,
          loading: false,
        }),
      );
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <BrandCtx.Provider value={{ ...state, refresh }}>
      {children}
    </BrandCtx.Provider>
  );
}

/** Shared permission keys — keep in sync with permissions-store. */
export type PermissionKey =
  | "void_sale"
  | "discount_override"
  | "price_override"
  | "view_reports"
  | "open_register"
  | "close_register"
  | "stock_adjust"
  | "manage_users";

export type UserOverrides = Record<
  string,
  Partial<Record<PermissionKey, boolean>>
>;

export interface PermissionsSnapshot {
  roleDefaults: Record<string, PermissionKey[]>;
  userOverrides?: UserOverrides;
}

/** Map users-collection roles onto roleDefaults keys. */
export function normalizeRole(role: string | undefined | null): string {
  const r = (role ?? "").trim().toLowerCase();
  if (r === "owner") return "admin";
  if (r === "admin" || r === "manager" || r === "cashier") return r;
  return "cashier";
}

/**
 * Resolve a permission: user override → role default → false.
 */
export function resolvePermission(
  cfg: PermissionsSnapshot,
  key: PermissionKey,
  opts?: { userId?: string | null; role?: string | null },
): boolean {
  const userId = opts?.userId?.trim();
  if (userId && cfg.userOverrides?.[userId]) {
    const override = cfg.userOverrides[userId][key];
    if (typeof override === "boolean") return override;
  }
  const role = normalizeRole(opts?.role);
  const list = cfg.roleDefaults[role] ?? [];
  return list.includes(key);
}

import "server-only";
import { docStore } from "./persistence/doc-store";
import {
  resolvePermission as resolvePermissionShared,
  type PermissionKey,
  type UserOverrides,
} from "@/lib/permissions";

export type { PermissionKey, UserOverrides };

export interface PermissionsConfig {
  managerPin: string;
  roleDefaults: Record<string, PermissionKey[]>;
  /** Per-user allow/deny on top of roleDefaults. */
  userOverrides: UserOverrides;
  idleLockMinutes: number;
}

const DEFAULTS: PermissionsConfig = {
  managerPin: "1234",
  idleLockMinutes: 10,
  userOverrides: {},
  roleDefaults: {
    cashier: [],
    manager: [
      "void_sale",
      "discount_override",
      "price_override",
      "view_reports",
      "open_register",
      "close_register",
      "stock_adjust",
    ],
    admin: [
      "void_sale",
      "discount_override",
      "price_override",
      "view_reports",
      "open_register",
      "close_register",
      "stock_adjust",
      "manage_users",
    ],
  },
};

const store = docStore<PermissionsConfig>({
  key: "permissions",
  file: "permissions.json",
});

export async function getPermissions(): Promise<PermissionsConfig> {
  const current = await store.read(DEFAULTS);
  return {
    ...DEFAULTS,
    ...current,
    roleDefaults: { ...DEFAULTS.roleDefaults, ...current.roleDefaults },
    userOverrides: { ...(current.userOverrides ?? {}) },
  };
}

export async function savePermissions(
  patch: Partial<PermissionsConfig>,
): Promise<PermissionsConfig> {
  const current = await getPermissions();
  const next: PermissionsConfig = {
    ...current,
    ...patch,
    roleDefaults: patch.roleDefaults
      ? { ...current.roleDefaults, ...patch.roleDefaults }
      : current.roleDefaults,
    userOverrides:
      patch.userOverrides !== undefined
        ? patch.userOverrides
        : current.userOverrides,
  };
  await store.write(next);
  return next;
}

export async function verifyManagerPin(pin: string): Promise<boolean> {
  const cfg = await getPermissions();
  return String(pin) === String(cfg.managerPin);
}

/** Server helper: user override → role default → false. */
export async function resolvePermission(
  key: PermissionKey,
  opts?: { userId?: string | null; role?: string | null },
): Promise<boolean> {
  const cfg = await getPermissions();
  return resolvePermissionShared(cfg, key, opts);
}

export { resolvePermissionShared };

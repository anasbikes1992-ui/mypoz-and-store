import "server-only";
import { docStore } from "./persistence/doc-store";
import {
  resolvePermission as resolvePermissionShared,
  type PermissionKey,
  type UserOverrides,
} from "@/lib/permissions";
import {
  hashManagerPin,
  isHashedManagerPin,
  verifyManagerPinValue,
} from "./manager-pin";

export type { PermissionKey, UserOverrides };

export interface PermissionsConfig {
  /**
   * Stored manager PIN. Prefer scrypt hash (`scrypt$salt$hash`).
   * Empty string = not configured (manager PIN gates unavailable).
   * Legacy plaintext may exist until next save.
   */
  managerPin: string;
  roleDefaults: Record<string, PermissionKey[]>;
  /** Per-user allow/deny on top of roleDefaults. */
  userOverrides: UserOverrides;
  idleLockMinutes: number;
}

const DEFAULTS: PermissionsConfig = {
  // Empty — never default to a known PIN like "1234".
  managerPin: "",
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
    owner: [
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
  const current = await store.read({
    ...DEFAULTS,
    // Avoid merging a phantom default PIN from DEFAULTS over empty storage.
    managerPin: "",
  });
  const pin =
    typeof current.managerPin === "string" ? current.managerPin.trim() : "";
  return {
    ...DEFAULTS,
    ...current,
    managerPin: pin,
    roleDefaults: { ...DEFAULTS.roleDefaults, ...current.roleDefaults },
    userOverrides: { ...(current.userOverrides ?? {}) },
  };
}

export function permissionsHasPin(cfg: PermissionsConfig): boolean {
  return Boolean(cfg.managerPin && cfg.managerPin.length > 0);
}

export async function savePermissions(
  patch: Partial<PermissionsConfig>,
): Promise<PermissionsConfig> {
  const current = await getPermissions();
  let nextPin = current.managerPin;
  if (patch.managerPin !== undefined) {
    const raw = String(patch.managerPin).trim();
    if (!raw) {
      // Empty means keep existing (callers should delete the key to clear).
      nextPin = current.managerPin;
    } else if (isHashedManagerPin(raw)) {
      nextPin = raw;
    } else {
      nextPin = hashManagerPin(raw);
    }
  }

  const next: PermissionsConfig = {
    ...current,
    ...patch,
    managerPin: nextPin,
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

/**
 * Verify manager PIN. Returns false when no PIN is configured
 * (authorization unavailable until owner sets one).
 */
export async function verifyManagerPin(pin: string): Promise<boolean> {
  const cfg = await getPermissions();
  if (!permissionsHasPin(cfg)) return false;
  const ok = verifyManagerPinValue(pin, cfg.managerPin);
  // Lazy upgrade: plaintext → hash after successful verify.
  if (ok && cfg.managerPin && !isHashedManagerPin(cfg.managerPin)) {
    try {
      await savePermissions({ managerPin: pin });
    } catch {
      // Non-fatal — verification already succeeded.
    }
  }
  return ok;
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

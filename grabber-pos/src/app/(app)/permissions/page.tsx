"use client";

import { useEffect, useMemo, useState } from "react";
import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { Button } from "@/components/ui/Button";
import { SkeletonRows } from "@/components/ui/EmptyState";
import {
  normalizeRole,
  resolvePermission,
  type PermissionKey,
  type UserOverrides,
} from "@/lib/permissions";

const PERMISSION_KEYS = [
  "void_sale",
  "discount_override",
  "price_override",
  "view_reports",
  "open_register",
  "close_register",
  "stock_adjust",
  "manage_users",
] as const satisfies readonly PermissionKey[];

const ROLES = ["cashier", "manager", "admin"] as const;

type Role = (typeof ROLES)[number];
type RoleDefaults = Record<string, PermissionKey[]>;
type OverrideMode = "inherit" | "allow" | "deny";

interface UserRow {
  id: string;
  name: string;
  email?: string;
  role?: string;
  status?: string;
}

const LABELS: Record<PermissionKey, string> = {
  void_sale: "Void sale",
  discount_override: "Discount override",
  price_override: "Price override",
  view_reports: "View reports",
  open_register: "Open register",
  close_register: "Close register",
  stock_adjust: "Stock adjust",
  manage_users: "Manage users",
};

export default function PermissionsPage() {
  const [managerPin, setManagerPin] = useState("");
  const [idleLockMinutes, setIdleLockMinutes] = useState("10");
  const [hasPin, setHasPin] = useState(false);
  const [roleDefaults, setRoleDefaults] = useState<RoleDefaults>({
    cashier: [],
    manager: [],
    admin: [],
  });
  const [userOverrides, setUserOverrides] = useState<UserOverrides>({});
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/permissions").then((r) => r.json()),
      fetch("/api/collections/users").then((r) => r.json()),
    ])
      .then(([perm, usersJson]) => {
        if (perm.success) {
          setHasPin(!!perm.data.hasPin);
          setIdleLockMinutes(String(perm.data.idleLockMinutes ?? 10));
          if (perm.data.roleDefaults) {
            setRoleDefaults({
              cashier: perm.data.roleDefaults.cashier ?? [],
              manager: perm.data.roleDefaults.manager ?? [],
              admin: perm.data.roleDefaults.admin ?? [],
            });
          }
          setUserOverrides(perm.data.userOverrides ?? {});
        }
        if (usersJson.success && Array.isArray(usersJson.data)) {
          const list = usersJson.data as UserRow[];
          setUsers(list);
          if (list[0]?.id) setSelectedUserId(list[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId],
  );

  function toggle(role: Role, key: PermissionKey) {
    setRoleDefaults((prev) => {
      const list = new Set(prev[role] ?? []);
      if (list.has(key)) list.delete(key);
      else list.add(key);
      return { ...prev, [role]: Array.from(list) };
    });
  }

  function has(role: Role, key: PermissionKey) {
    return (roleDefaults[role] ?? []).includes(key);
  }

  function overrideMode(userId: string, key: PermissionKey): OverrideMode {
    const o = userOverrides[userId]?.[key];
    if (o === true) return "allow";
    if (o === false) return "deny";
    return "inherit";
  }

  function setOverride(userId: string, key: PermissionKey, mode: OverrideMode) {
    setUserOverrides((prev) => {
      const nextUser = { ...(prev[userId] ?? {}) };
      if (mode === "inherit") {
        delete nextUser[key];
      } else {
        nextUser[key] = mode === "allow";
      }
      const next = { ...prev };
      if (Object.keys(nextUser).length === 0) delete next[userId];
      else next[userId] = nextUser;
      return next;
    });
  }

  function effectiveForSelected(key: PermissionKey): boolean {
    if (!selectedUser) return false;
    return resolvePermission(
      { roleDefaults, userOverrides },
      key,
      { userId: selectedUser.id, role: selectedUser.role },
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const body: {
        idleLockMinutes: number;
        managerPin?: string;
        roleDefaults: RoleDefaults;
        userOverrides: UserOverrides;
      } = {
        idleLockMinutes: Number(idleLockMinutes) || 10,
        roleDefaults,
        userOverrides,
      };
      if (managerPin.trim()) body.managerPin = managerPin.trim();

      const res = await fetch("/api/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (j.success) {
        setHasPin(!!j.data.hasPin);
        if (j.data.roleDefaults) setRoleDefaults(j.data.roleDefaults);
        if (j.data.userOverrides) setUserOverrides(j.data.userOverrides);
        setManagerPin("");
        setMsg({ ok: true, text: "Permissions saved." });
      } else {
        setMsg({ ok: false, text: j.error ?? "Save failed" });
      }
    } catch {
      setMsg({ ok: false, text: "Could not reach the server" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <ModuleHeader
          title="Permissions"
          subtitle="Manager PIN, idle lock, role matrix, and per-user overrides"
        />
        <SkeletonRows count={5} />
      </div>
    );
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <ModuleHeader
        title="Permissions"
        subtitle="Manager PIN, idle lock, role matrix, and per-user overrides"
        actions={
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        }
      />

      {msg && (
        <p
          className={`mt-6 rounded-xl border px-4 py-2 text-sm ${
            msg.ok
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          {msg.text}
        </p>
      )}

      <div className="mt-6 space-y-4 rounded-2xl border border-line bg-surface-1 p-5">
        <label className="block text-sm">
          <span className="mb-1 block text-text-dim">
            Manager PIN{hasPin ? " (set — leave blank to keep)" : ""}
          </span>
          <input
            type="password"
            value={managerPin}
            onChange={(e) => setManagerPin(e.target.value)}
            autoComplete="off"
            placeholder={hasPin ? "••••" : "Set a PIN"}
            className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-text-strong outline-none transition duration-150 focus:border-accent"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-text-dim">Idle lock (minutes)</span>
          <input
            type="number"
            min={1}
            max={120}
            value={idleLockMinutes}
            onChange={(e) => setIdleLockMinutes(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-text-strong outline-none transition duration-150 focus:border-accent"
          />
        </label>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-surface-1">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-[0.12em] text-text-dim">
              <th className="px-4 py-3 font-medium">Permission</th>
              {ROLES.map((r) => (
                <th key={r} className="px-3 py-3 text-center font-medium capitalize">
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_KEYS.map((key) => (
              <tr
                key={key}
                className="border-b border-line transition duration-150 last:border-0 hover:bg-surface-2/50"
              >
                <td className="px-4 py-2.5 text-text-strong">{LABELS[key]}</td>
                {ROLES.map((role) => (
                  <td key={role} className="px-3 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={has(role, key)}
                      onChange={() => toggle(role, key)}
                      aria-label={`${role} ${LABELS[key]}`}
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-surface-1 p-5">
        <h2 className="text-sm font-semibold text-text-strong">
          Per-user overrides
        </h2>
        <p className="mt-1 text-xs text-text-dim">
          Override role defaults for a specific user. Inherit falls back to the
          role matrix (owner maps to admin).
        </p>

        {users.length === 0 ? (
          <p className="mt-4 text-sm text-text-dim">
            No users yet — add staff under Users &amp; admins.
          </p>
        ) : (
          <>
            <label className="mt-4 block text-sm">
              <span className="mb-1 block text-text-dim">User</span>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-text-strong outline-none transition duration-150 focus:border-accent"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                    {u.role ? ` (${u.role})` : ""}
                    {u.email ? ` — ${u.email}` : ""}
                  </option>
                ))}
              </select>
            </label>

            {selectedUser && (
              <p className="mt-2 text-xs text-text-dim">
                Role default bucket:{" "}
                <span className="text-text-body">
                  {normalizeRole(selectedUser.role)}
                </span>
              </p>
            )}

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-[0.12em] text-text-dim">
                    <th className="px-2 py-2 font-medium">Permission</th>
                    <th className="px-2 py-2 font-medium">Override</th>
                    <th className="px-2 py-2 font-medium">Effective</th>
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_KEYS.map((key) => (
                    <tr
                      key={key}
                      className="border-b border-line transition duration-150 last:border-0 hover:bg-surface-2/40"
                    >
                      <td className="px-2 py-2 text-text-strong">
                        {LABELS[key]}
                      </td>
                      <td className="px-2 py-2">
                        <select
                          value={
                            selectedUser
                              ? overrideMode(selectedUser.id, key)
                              : "inherit"
                          }
                          disabled={!selectedUser}
                          onChange={(e) => {
                            if (!selectedUser) return;
                            setOverride(
                              selectedUser.id,
                              key,
                              e.target.value as OverrideMode,
                            );
                          }}
                          aria-label={`Override ${LABELS[key]}`}
                          className="rounded-xl border border-line bg-surface-2 px-2 py-1.5 text-xs text-text-strong outline-none transition duration-150 focus:border-accent"
                        >
                          <option value="inherit">Inherit</option>
                          <option value="allow">Allow</option>
                          <option value="deny">Deny</option>
                        </select>
                      </td>
                      <td className="px-2 py-2 text-xs">
                        {effectiveForSelected(key) ? (
                          <span className="text-accent">Allowed</span>
                        ) : (
                          <span className="text-text-dim">Denied</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </form>
  );
}

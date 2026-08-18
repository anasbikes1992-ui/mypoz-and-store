"use client";

import { useCallback, useState } from "react";
import { newId, type NavItem, type StoreConfig } from "@/lib/commerce/schema";
import { Button } from "@/components/ui/Button";

function emptyNav(label: string, href: string): NavItem {
  return { id: newId("nav"), label, href, children: [] };
}

export function NavigationBuilder({
  initial,
  onSave,
}: {
  initial: Pick<StoreConfig, "navigation" | "footerLinks">;
  onSave: (nav: NavItem[], footer: NavItem[]) => Promise<void>;
}) {
  const [header, setHeader] = useState<NavItem[]>(initial.navigation);
  const [footer, setFooter] = useState<NavItem[]>(initial.footerLinks);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function patchItem(
    list: NavItem[],
    id: string,
    patch: Partial<NavItem>,
  ): NavItem[] {
    return list.map((n) => (n.id === id ? { ...n, ...patch } : n));
  }

  function addChild(parentId: string) {
    setHeader((prev) =>
      prev.map((n) =>
        n.id === parentId
          ? {
              ...n,
              children: [
                ...n.children,
                { id: newId("sub"), label: "New link", href: "", children: [] },
              ],
            }
          : n,
      ),
    );
  }

  const save = useCallback(async () => {
    setSaving(true);
    setMsg(null);
    try {
      await onSave(header, footer);
      setMsg("Navigation saved");
    } catch {
      setMsg("Could not save navigation");
    } finally {
      setSaving(false);
    }
  }, [header, footer, onSave]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-line bg-surface-1 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Header menu</h2>
          <button
            type="button"
            onClick={() => setHeader((h) => [...h, emptyNav("New link", "")])}
            className="text-xs font-semibold text-accent"
          >
            + Add link
          </button>
        </div>
        <ul className="mt-4 space-y-3">
          {header.map((item) => (
            <li key={item.id} className="rounded-2xl border border-line bg-surface-2/50 p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={item.label}
                  onChange={(e) =>
                    setHeader(patchItem(header, item.id, { label: e.target.value }))
                  }
                  placeholder="Label"
                  className="rounded-xl border border-line bg-surface-1 px-3 py-2 text-sm"
                />
                <input
                  value={item.href}
                  onChange={(e) =>
                    setHeader(patchItem(header, item.id, { href: e.target.value }))
                  }
                  placeholder="/products or https://…"
                  className="rounded-xl border border-line bg-surface-1 px-3 py-2 text-sm"
                />
              </div>
              {item.children.length > 0 && (
                <ul className="mt-2 space-y-2 border-l-2 border-accent/30 pl-3">
                  {item.children.map((child) => (
                    <li key={child.id} className="grid gap-2 sm:grid-cols-2">
                      <input
                        value={child.label}
                        onChange={(e) =>
                          setHeader(
                            header.map((n) =>
                              n.id === item.id
                                ? {
                                    ...n,
                                    children: n.children.map((c) =>
                                      c.id === child.id
                                        ? { ...c, label: e.target.value }
                                        : c,
                                    ),
                                  }
                                : n,
                            ),
                          )
                        }
                        placeholder="Submenu label"
                        className="rounded-xl border border-line bg-surface-1 px-3 py-2 text-sm"
                      />
                      <input
                        value={child.href}
                        onChange={(e) =>
                          setHeader(
                            header.map((n) =>
                              n.id === item.id
                                ? {
                                    ...n,
                                    children: n.children.map((c) =>
                                      c.id === child.id
                                        ? { ...c, href: e.target.value }
                                        : c,
                                    ),
                                  }
                                : n,
                            ),
                          )
                        }
                        placeholder="Submenu URL"
                        className="rounded-xl border border-line bg-surface-1 px-3 py-2 text-sm"
                      />
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => addChild(item.id)}
                  className="text-xs text-text-dim hover:text-accent"
                >
                  + Submenu
                </button>
                <button
                  type="button"
                  onClick={() => setHeader(header.filter((n) => n.id !== item.id))}
                  className="text-xs text-danger"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-line bg-surface-1 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Footer links</h2>
          <button
            type="button"
            onClick={() => setFooter((f) => [...f, emptyNav("New link", "")])}
            className="text-xs font-semibold text-accent"
          >
            + Add link
          </button>
        </div>
        <ul className="mt-4 space-y-3">
          {footer.map((item) => (
            <li key={item.id} className="grid gap-2 sm:grid-cols-2">
              <input
                value={item.label}
                onChange={(e) =>
                  setFooter(patchItem(footer, item.id, { label: e.target.value }))
                }
                className="rounded-xl border border-line bg-surface-2/50 px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <input
                  value={item.href}
                  onChange={(e) =>
                    setFooter(patchItem(footer, item.id, { href: e.target.value }))
                  }
                  className="min-w-0 flex-1 rounded-xl border border-line bg-surface-2/50 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setFooter(footer.filter((n) => n.id !== item.id))}
                  className="text-xs text-danger"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save navigation"}
        </Button>
        {msg && <span className="text-sm text-text-dim">{msg}</span>}
      </div>
    </div>
  );
}

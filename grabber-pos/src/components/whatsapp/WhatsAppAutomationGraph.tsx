"use client";

import { useMemo, useState } from "react";
import {
  automationGraphBlueprint,
  enabledPathList,
  greetingMenuFromGraph,
  normalizeEnabledPaths,
  pathReadyStatus,
  type AutomationPathEnabled,
  type AutomationPathId,
} from "@/lib/whatsapp/automation-graph";
import type { Locale } from "@/lib/whatsapp/i18n";
import { Button } from "@/components/ui/Button";

export interface AutomationGraphDraft {
  greeting: string;
  locationText: string;
  offersText: string;
  staffNotify: boolean;
  enabledPaths: AutomationPathEnabled;
  locale: Locale;
  orgName: string;
}

interface Props {
  value: AutomationGraphDraft;
  onChange: (next: AutomationGraphDraft) => void;
  onSave: () => void;
  busy?: boolean;
}

const PATH_LABEL: Record<AutomationPathId, string> = {
  order: "Order",
  menu: "View menu",
  offers: "Offers",
  location: "Location",
  track: "Track order",
  staff: "Talk to staff",
};

function statusTone(status: "ready" | "needs_setup" | "off"): string {
  if (status === "ready") return "border-accent/40 bg-accent/10 text-accent";
  if (status === "needs_setup") return "border-warn/40 bg-warn/10 text-warn";
  return "border-line bg-surface-2 text-text-dim opacity-60";
}

export function WhatsAppAutomationGraph({
  value,
  onChange,
  onSave,
  busy,
}: Props) {
  const [selected, setSelected] = useState<string>("greeting");
  const blueprint = useMemo(() => automationGraphBlueprint(), []);
  const enabled = normalizeEnabledPaths(value.enabledPaths);
  const preview = greetingMenuFromGraph(value.orgName || "Your store", value.locale, {
    greeting: value.greeting,
    enabled,
  });
  const numbered = enabledPathList(enabled);

  const selectedNode = blueprint.nodes.find((n) => n.id === selected);

  function togglePath(pathId: AutomationPathId) {
    onChange({
      ...value,
      enabledPaths: { ...enabled, [pathId]: !enabled[pathId] },
    });
  }

  return (
    <section className="rounded-2xl border border-line bg-surface-1 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-text-strong">
            Automation graph
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-text-dim">
            Same flow every shop gets out of the box: greeting menu → order /
            catalog / offers / location / track / staff → POS sales ledger.
            Click a node to edit. Turn paths on or off without coding.
          </p>
        </div>
        <Button disabled={busy} onClick={onSave}>
          {busy ? "Saving…" : "Save automations"}
        </Button>
      </div>

      {/* Graph canvas */}
      <div className="mt-5 overflow-x-auto rounded-xl border border-line bg-surface-2/40 p-4">
        <div className="mx-auto flex min-w-[40rem] flex-col items-center gap-3">
          <NodeChip
            title="Customer: hi / hello / menu"
            subtitle="Trigger"
            active={selected === "hi"}
            tone="border-line bg-surface-1 text-text-body"
            onClick={() => setSelected("hi")}
          />
          <Arrow />
          <NodeChip
            title="Greeting menu"
            subtitle={
              value.greeting.trim()
                ? "Custom welcome line set"
                : "Default welcome + numbered paths"
            }
            active={selected === "greeting"}
            tone="border-accent/50 bg-accent/10 text-text-strong"
            onClick={() => setSelected("greeting")}
          />
          <Arrow label="reply with a number" />
          <div className="grid w-full max-w-4xl grid-cols-2 gap-2 sm:grid-cols-3">
            {(
              [
                "order",
                "menu",
                "offers",
                "location",
                "track",
                "staff",
              ] as AutomationPathId[]
            ).map((pathId) => {
              const status = pathReadyStatus(pathId, {
                greeting: value.greeting,
                enabled,
                locationText: value.locationText,
                offersText: value.offersText,
                staffNotify: value.staffNotify,
              });
              const idx = numbered.indexOf(pathId);
              const title =
                idx >= 0
                  ? `${idx + 1} · ${PATH_LABEL[pathId]}`
                  : `Off · ${PATH_LABEL[pathId]}`;
              return (
                <NodeChip
                  key={pathId}
                  title={title}
                  subtitle={
                    status === "needs_setup"
                      ? "Needs your text"
                      : status === "off"
                        ? "Hidden from menu"
                        : "Live"
                  }
                  active={selected === pathId}
                  tone={statusTone(status)}
                  onClick={() => setSelected(pathId)}
                />
              );
            })}
          </div>
          <div className="mt-2 grid w-full max-w-4xl grid-cols-1 gap-2 sm:grid-cols-2">
            <NodeChip
              title="Checkout → POS sale"
              subtitle="source = WHATSAPP · COD"
              active={selected === "checkout"}
              tone="border-accent/30 bg-surface-1 text-text-strong"
              onClick={() => setSelected("checkout")}
            />
            <NodeChip
              title="Merchant inbox"
              subtitle={
                value.staffNotify
                  ? "Staff handoff flags inbox"
                  : "Staff path on · inbox flag off"
              }
              active={selected === "inbox"}
              tone="border-line bg-surface-1 text-text-strong"
              onClick={() => setSelected("inbox")}
            />
          </div>
        </div>
      </div>

      {/* Editor + preview */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface-2/30 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-dim">
            Edit node
          </h3>
          <p className="mt-1 text-sm font-medium text-text-strong">
            {selectedNode?.title ?? selected}
          </p>
          <p className="mt-0.5 text-xs text-text-dim">
            {selectedNode?.description}
          </p>

          {selected === "greeting" || selected === "hi" ? (
            <label className="mt-3 block text-sm">
              <span className="mb-1 block text-text-dim">
                Extra welcome line (hours, slogan)
              </span>
              <textarea
                value={value.greeting}
                onChange={(e) =>
                  onChange({ ...value, greeting: e.target.value })
                }
                rows={2}
                maxLength={400}
                className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
                placeholder="Open 8am–8pm · Free delivery over Rs 3000"
              />
            </label>
          ) : null}

          {selected === "offers" ? (
            <>
              <PathToggle
                checked={enabled.offers}
                onChange={() => togglePath("offers")}
                label="Show Offers in greeting menu"
              />
              <label className="mt-3 block text-sm">
                <span className="mb-1 block text-text-dim">Offers reply</span>
                <textarea
                  value={value.offersText}
                  onChange={(e) =>
                    onChange({ ...value, offersText: e.target.value })
                  }
                  rows={3}
                  maxLength={400}
                  className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
                  placeholder="Today: 10% off rice packs…"
                />
              </label>
            </>
          ) : null}

          {selected === "location" ? (
            <>
              <PathToggle
                checked={enabled.location}
                onChange={() => togglePath("location")}
                label="Show Location in greeting menu"
              />
              <label className="mt-3 block text-sm">
                <span className="mb-1 block text-text-dim">Location reply</span>
                <textarea
                  value={value.locationText}
                  onChange={(e) =>
                    onChange({ ...value, locationText: e.target.value })
                  }
                  rows={3}
                  maxLength={400}
                  className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
                  placeholder="42 Galle Road, Colombo · Maps link…"
                />
              </label>
            </>
          ) : null}

          {(
            ["order", "menu", "track", "staff"] as AutomationPathId[]
          ).includes(selected as AutomationPathId) ? (
            <PathToggle
              checked={enabled[selected as AutomationPathId]}
              onChange={() => togglePath(selected as AutomationPathId)}
              label={`Show “${PATH_LABEL[selected as AutomationPathId]}” in greeting menu`}
            />
          ) : null}

          {selected === "staff" || selected === "inbox" ? (
            <label className="mt-3 flex items-center gap-2 text-sm text-text-body">
              <input
                type="checkbox"
                checked={value.staffNotify}
                onChange={(e) =>
                  onChange({ ...value, staffNotify: e.target.checked })
                }
                className="rounded border-line"
              />
              Flag inbox when customer asks for staff
            </label>
          ) : null}

          {selected === "order" || selected === "checkout" ? (
            <p className="mt-3 text-xs text-text-dim">
              Order uses live POS catalog and stock. Checkout creates a sale with{" "}
              <code className="text-text-body">source=WHATSAPP</code> (COD /
              unpaid) — same ledger as the counter.
            </p>
          ) : null}

          {selected === "menu" ? (
            <p className="mt-3 text-xs text-text-dim">
              Browse-only list from your published products. Meta Commerce
              catalog sync is separate (CSV / items_batch) and does not replace
              this bot menu.
            </p>
          ) : null}

          {selected === "track" ? (
            <p className="mt-3 text-xs text-text-dim">
              Customer sends a receipt / sale id; bot looks it up in this shop’s
              sales.
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-line bg-surface-2/30 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-dim">
            Live menu preview
          </h3>
          <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-line bg-surface-1 p-3 text-xs leading-relaxed text-text-body">
            {preview}
          </pre>
          <p className="mt-2 text-[11px] text-text-dim">
            Numbers renumber automatically when you turn paths off. Language
            follows Bot language in Connection.
          </p>
        </div>
      </div>
    </section>
  );
}

function Arrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center text-text-dim">
      <span className="text-lg leading-none">↓</span>
      {label ? (
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      ) : null}
    </div>
  );
}

function NodeChip({
  title,
  subtitle,
  active,
  tone,
  onClick,
}: {
  title: string;
  subtitle: string;
  active: boolean;
  tone: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2.5 text-left transition ${tone} ${
        active ? "ring-2 ring-accent" : "hover:brightness-110"
      }`}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-0.5 text-[11px] opacity-80">{subtitle}</p>
    </button>
  );
}

function PathToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="mt-3 flex items-center gap-2 text-sm text-text-body">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="rounded border-line"
      />
      {label}
    </label>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatMoney } from "@/lib/format";
import {
  PAYMENT_LABELS,
  FULFILMENT_LABELS,
  type PaymentMode,
  type FulfilmentMode,
} from "@/lib/website";

interface Customer {
  id: string;
  email: string;
  name: string;
  mobile: string;
}

interface WebOrder {
  id: string;
  receiptNo: string;
  total: number;
  paymentMethod: PaymentMode;
  fulfilment: FulfilmentMode;
  createdAt: string;
  lines: { name: string; quantity: number; unitPrice: number }[];
  boardKind: string | null;
}

type Mode = "login" | "register" | "magic";

export default function StoreAccountPage() {
  const params = useParams();
  const slug = String(params?.slug || "main-store");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<WebOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const authRes = await fetch(`/api/store/${slug}/auth`);
      const authJson = await authRes.json();
      const c = authJson.data?.customer ?? null;
      setCustomer(c);
      if (c) {
        const ordRes = await fetch(`/api/store/${slug}/orders`);
        const ordJson = await ordRes.json();
        if (ordJson.success) setOrders(ordJson.data);
      } else {
        setOrders([]);
      }
    } catch {
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submitAuth(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const body =
        mode === "magic"
          ? { action: "magic", email }
          : mode === "register"
            ? { action: "register", email, password, name, mobile }
            : { action: "login", email, password };

      const res = await fetch(`/api/store/${slug}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Auth failed");
      if (json.data?.message) setMsg(json.data.message);
      if (json.data?.customer) {
        setCustomer(json.data.customer);
        await refresh();
      }
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch(`/api/store/${slug}/auth`, { method: "DELETE" });
    setCustomer(null);
    setOrders([]);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-text-dim">
        Loading account…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-10 lg:px-8">
      <div>
        <Link
          href={`/store/${slug}`}
          className="text-xs font-semibold text-accent hover:underline"
        >
          ← Back to store
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-text-strong">
          My account
        </h1>
        <p className="mt-1 text-sm text-text-dim">
          Sign in with email/password, or request a magic link. Guest checkout
          still works without an account.
        </p>
      </div>

      {customer ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-surface-1 p-5">
            <p className="font-semibold text-text-strong">{customer.name}</p>
            <p className="text-sm text-text-dim">{customer.email}</p>
            {customer.mobile ? (
              <p className="text-sm text-text-dim">{customer.mobile}</p>
            ) : null}
            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-4 rounded-xl border border-line px-3 py-2 text-xs font-semibold text-text-dim hover:border-accent hover:text-accent"
            >
              Sign out
            </button>
          </div>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-text-strong">
              Order history
            </h2>
            {orders.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-text-dim">
                No orders yet.{" "}
                <Link href={`/store/${slug}`} className="text-accent underline">
                  Start shopping
                </Link>
              </p>
            ) : (
              <ul className="space-y-3">
                {orders.map((o) => (
                  <li
                    key={o.id}
                    className="rounded-2xl border border-line bg-surface-1 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-sm font-semibold text-accent">
                          {o.receiptNo}
                        </p>
                        <p className="text-xs text-text-dim">
                          {new Date(o.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <p className="font-bold text-[var(--tint-green)]">
                        {formatMoney(o.total)}
                      </p>
                    </div>
                    <p className="mt-2 text-xs text-text-dim">
                      {PAYMENT_LABELS[o.paymentMethod]} ·{" "}
                      {FULFILMENT_LABELS[o.fulfilment]}
                      {o.boardKind ? ` · ${o.boardKind}` : ""}
                    </p>
                    <ul className="mt-2 space-y-0.5 text-xs text-text-body">
                      {o.lines.map((l, i) => (
                        <li key={i}>
                          {l.name} × {l.quantity}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : (
        <form
          onSubmit={submitAuth}
          className="space-y-3 rounded-2xl border border-line bg-surface-1 p-5"
        >
          <div className="flex gap-2">
            {(["login", "register", "magic"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                  mode === m
                    ? "bg-accent text-accent-ink"
                    : "border border-line text-text-dim"
                }`}
              >
                {m === "magic" ? "Magic link" : m}
              </button>
            ))}
          </div>

          {mode === "register" && (
            <>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-accent"
              />
              <input
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Mobile (optional)"
                className="w-full rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-accent"
              />
            </>
          )}

          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-accent"
          />

          {mode !== "magic" && (
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              minLength={6}
              className="w-full rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-accent"
            />
          )}

          {err && <p className="text-sm text-danger">{err}</p>}
          {msg && <p className="text-sm text-[var(--tint-green)]">{msg}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-ink disabled:opacity-50"
          >
            {busy
              ? "Please wait…"
              : mode === "magic"
                ? "Send magic link"
                : mode === "register"
                  ? "Create account"
                  : "Sign in"}
          </button>
        </form>
      )}
    </div>
  );
}

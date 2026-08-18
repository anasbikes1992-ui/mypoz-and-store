"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessInner() {
  const params = useParams<{ slug: string }>();
  const search = useSearchParams();
  const ref = search.get("ref") ?? "";
  const slug = params.slug;

  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-text-strong">Payment submitted</h1>
      <p className="mt-3 text-sm text-text-dim">
        {ref
          ? `Order ${ref} — we confirm payment when the gateway webhook verifies.`
          : "We confirm payment when the gateway webhook verifies."}
      </p>
      <Link href={`/store/${slug}`} className="mt-6 inline-block text-sm underline">
        Back to store
      </Link>
    </main>
  );
}

export default function StorePaySuccessPage() {
  return (
    <Suspense>
      <SuccessInner />
    </Suspense>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { HQ_DOC_PAGES } from "@/lib/hq";

export function generateStaticParams() {
  return HQ_DOC_PAGES.map((d) => ({ slug: d.slug }));
}

export default async function HqDocStubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = HQ_DOC_PAGES.find((d) => d.slug === slug);
  if (!doc) notFound();

  return (
    <div className="max-w-2xl">
      <Link
        href="/hq/docs"
        className="text-sm text-text-dim transition hover:text-accent"
      >
        ← Docs hub
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-text-strong">
        {doc.title}
      </h1>
      <p className="mt-2 text-sm text-text-body">{doc.blurb}</p>

      <div className="mt-6 rounded-2xl border border-line bg-surface-1 p-5">
        <p className="text-sm font-medium text-text-strong">Full guide in repo</p>
        <p className="mt-1 text-sm text-text-dim">
          Read{" "}
          <code className="text-text-body">{doc.docPath}</code> in the project
          checkout (or your deployment docs mirror). This page is a pointer so
          HQ operators know which file to open.
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          <li className="text-text-dim">
            Repo path:{" "}
            <code className="text-text-body">{doc.docPath}</code>
          </li>
          <li>
            <Link href="/help" className="text-accent hover:underline">
              In-app Help &amp; guides
            </Link>
          </li>
          {doc.slug === "reseller" && (
            <li>
              <Link href="/admin" className="text-accent hover:underline">
                Tenant super-admin (/admin)
              </Link>
            </li>
          )}
          {doc.slug === "gms-operations" && (
            <li>
              <Link href="/hq" className="text-accent hover:underline">
                GMS command center (/hq)
              </Link>
            </li>
          )}
          {doc.slug === "customer-storefront" && (
            <li>
              <Link href="/website" className="text-accent hover:underline">
                Website CMS (/website)
              </Link>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

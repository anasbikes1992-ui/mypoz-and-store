import Link from "next/link";
import { HQ_DOC_PAGES } from "@/lib/hq";

export default function HqDocsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-strong">Docs hub</h1>
      <p className="mt-1 text-sm text-text-dim">
        In-app index of the repo guides under{" "}
        <code className="text-text-body">docs/</code>. Open a card for the
        matching filename and related links.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {HQ_DOC_PAGES.map((doc) => (
          <Link
            key={doc.slug}
            href={`/hq/docs/${doc.slug}`}
            className="block rounded-2xl border border-line bg-surface-1 p-5 transition hover:border-accent/50"
          >
            <p className="text-sm font-semibold text-text-strong">{doc.title}</p>
            <p className="mt-1 text-sm text-text-dim">{doc.blurb}</p>
            <p className="mt-3 font-mono text-[11px] text-text-dim">
              {doc.docPath}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getGmsAdmin } from "@/lib/server/gms-auth";
import { HqShell } from "@/components/hq/HqShell";

export const metadata: Metadata = {
  title: "GMS HQ",
  description: "Grabber Mobility Solutions fleet portal",
  robots: { index: false, follow: false },
};

export default async function HqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const identity = await getGmsAdmin();
  if (!identity) {
    redirect("/login?next=/hq");
  }

  return (
    <HqShell identityLabel={`${identity.id} · ${identity.role}`}>
      {children}
    </HqShell>
  );
}

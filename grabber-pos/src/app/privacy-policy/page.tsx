import type { Metadata } from "next";
import { LegalDoc } from "@/components/marketing/LegalDoc";

export const metadata: Metadata = {
  title: "Privacy policy",
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalDoc title="Privacy policy">
      <p>
        Grabber Mobility Solutions (Pvt) Ltd (“MyPoz”) operates the MyPoz POS,
        online store, and WhatsApp ordering service at{" "}
        <a className="text-accent hover:underline" href="https://mypoz-and-store.vercel.app/welcome">
          mypoz-and-store.vercel.app
        </a>
        .
      </p>
      <h2 className="text-base font-semibold text-text-strong">What we collect</h2>
      <p>
        Shop owners provide account details (name, email, phone) to sign in.
        Sales, inventory, and customer names or mobile numbers entered at the
        till or in WhatsApp orders are stored for that shop only.
      </p>
      <p>
        If a shop connects WhatsApp Business, Meta sends us inbound messages so
        we can reply and create orders. We store message text, WhatsApp user id,
        and order details needed to fulfil the sale.
      </p>
      <h2 className="text-base font-semibold text-text-strong">How we use it</h2>
      <p>
        We use this data to run the shop’s POS, storefront, and WhatsApp bot —
        not to sell personal data. Platform operators may see tenant metadata
        for support and licensing.
      </p>
      <h2 className="text-base font-semibold text-text-strong">Sharing</h2>
      <p>
        Payment gateways, hosting (Vercel), and database hosting (Supabase)
        process data as processors. WhatsApp / Meta receive outbound messages
        the shop sends through the Cloud API.
      </p>
      <h2 className="text-base font-semibold text-text-strong">Retention and rights</h2>
      <p>
        Shop owners can export or delete their tenant data from MyPoz HQ or by
        emailing support. End customers of a shop should contact that shop, or
        use our{" "}
        <a className="text-accent hover:underline" href="/data-deletion">
          data deletion
        </a>{" "}
        instructions.
      </p>
      <p>
        Contact:{" "}
        <a className="text-accent hover:underline" href="mailto:anasazeez1992@gmail.com">
          anasazeez1992@gmail.com
        </a>
      </p>
    </LegalDoc>
  );
}

import type { Metadata } from "next";
import { LegalDoc } from "@/components/marketing/LegalDoc";

export const metadata: Metadata = {
  title: "Terms of service",
  robots: { index: true, follow: true },
};

export default function TermsOfServicePage() {
  return (
    <LegalDoc title="Terms of service">
      <p>
        These terms apply to the MyPoz Commerce Cloud service at{" "}
        <a className="text-accent hover:underline" href="https://mypoz-and-store.vercel.app/welcome">
          mypoz-and-store.vercel.app
        </a>
        , operated by Grabber Mobility Solutions (Pvt) Ltd.
      </p>
      <h2 className="text-base font-semibold text-text-strong">The service</h2>
      <p>
        MyPoz provides point-of-sale, inventory, an online store, and optional
        WhatsApp Cloud API ordering. You must keep login credentials secret and
        use only official Meta WhatsApp Business APIs — unofficial WhatsApp
        libraries are not permitted.
      </p>
      <h2 className="text-base font-semibold text-text-strong">Your shop data</h2>
      <p>
        You own your catalogue, sales, and customer records. You are responsible
        for tax, receipts, and how you message customers on WhatsApp.
      </p>
      <h2 className="text-base font-semibold text-text-strong">Acceptable use</h2>
      <p>
        Do not use MyPoz to spam, send unlawful content, or process payments you
        are not authorised to take. We may suspend accounts that abuse Meta or
        payment networks.
      </p>
      <h2 className="text-base font-semibold text-text-strong">Liability</h2>
      <p>
        The service is provided as available. We are not liable for lost sales
        caused by network, Meta, or payment-gateway outages beyond our control.
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

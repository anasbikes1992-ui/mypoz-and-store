import type { Metadata } from "next";
import { LegalDoc } from "@/components/marketing/LegalDoc";

export const metadata: Metadata = {
  title: "User data deletion",
  robots: { index: true, follow: true },
};

export default function DataDeletionPage() {
  return (
    <LegalDoc title="User data deletion">
      <p>
        This page is the data-deletion instructions URL for the MyPoz / GRABBER
        Meta app. It covers Facebook Login (if used) and WhatsApp Cloud API
        data stored in MyPoz.
      </p>
      <h2 className="text-base font-semibold text-text-strong">Shop owners</h2>
      <ol className="list-decimal space-y-2 pl-5">
        <li>Sign in at /login with the owner account.</li>
        <li>
          Ask HQ support to delete the organisation, or email{" "}
          <a className="text-accent hover:underline" href="mailto:anasazeez1992@gmail.com">
            anasazeez1992@gmail.com
          </a>{" "}
          from the same address used on the account. Include the shop name.
        </li>
        <li>
          We will delete or anonymise Auth users, sales, catalogue, WhatsApp
          inbox rows, and storefront data for that organisation, typically
          within 30 days.
        </li>
      </ol>
      <h2 className="text-base font-semibold text-text-strong">WhatsApp customers</h2>
      <p>
        Message the shop “delete my data”, or email us with the WhatsApp number
        used to chat. We remove that conversation and unlink it from orders
        where the law requires.
      </p>
      <h2 className="text-base font-semibold text-text-strong">Facebook / Meta</h2>
      <p>
        Removing the app from your Facebook settings stops new Login data. It
        does not by itself erase POS history a shop already stored. Follow the
        steps above for MyPoz-held copies.
      </p>
    </LegalDoc>
  );
}

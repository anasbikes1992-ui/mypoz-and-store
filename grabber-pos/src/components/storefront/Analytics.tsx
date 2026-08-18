import Script from "next/script";
import { safeAdId } from "@/lib/storefront";

/**
 * Marketing tags for a client storefront.
 *
 * IDs come from tenant-editable settings and are rendered into a public page, so
 * each is matched against its vendor's exact format first (`safeAdId`). A value
 * that doesn't match is dropped rather than escaped — the tag simply doesn't
 * load, so a malformed or hostile setting can never break out into script.
 */
interface Props {
  ga4Id: string | null;
  googleAdsId: string | null;
  metaPixelId: string | null;
}

export function StorefrontAnalytics({ ga4Id, googleAdsId, metaPixelId }: Props) {
  const ga4 = safeAdId("ga4", ga4Id);
  const ads = safeAdId("googleAds", googleAdsId);
  const pixel = safeAdId("metaPixel", metaPixelId);
  const gtagId = ga4 ?? ads;

  return (
    <>
      {gtagId && (
        <>
          <Script
            id="gtag-src"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${gtagId}`}
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());${
              ga4 ? `gtag('config','${ga4}');` : ""
            }${ads ? `gtag('config','${ads}');` : ""}`}
          </Script>
        </>
      )}

      {pixel && (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              alt=""
              src={`https://www.facebook.com/tr?id=${pixel}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      )}
    </>
  );
}

import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://mypoz-and-store-ui.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/store/", "/welcome", "/privacy-policy", "/terms-of-service"],
      disallow: ["/api/", "/admin", "/hq", "/pos", "/login", "/commerce"],
    },
    sitemap: `${SITE.replace(/\/$/, "")}/sitemap.xml`,
  };
}

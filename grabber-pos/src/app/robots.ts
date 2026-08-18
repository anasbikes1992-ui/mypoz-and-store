import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/store/",
      disallow: ["/api/", "/admin", "/hq", "/pos", "/login"],
    },
    sitemap: "https://grabber-pos.vercel.app/sitemap.xml",
  };
}

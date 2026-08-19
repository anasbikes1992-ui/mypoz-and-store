import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  async redirects() {
    return [
      // Previous concatenated paths → Grabber product routes
      { source: "/cashin", destination: "/cash-in", permanent: true },
      { source: "/cashout", destination: "/cash-out", permanent: true },
      { source: "/updates", destination: "/help", permanent: true },
    ];
  },
  async rewrites() {
    return [
      // Fail-closed WAF: Next may serve dotfiles directly before middleware,
      // so we hard-deny /.env at the edge.
      { source: "/.env", destination: "/api/waf-deny" },
    ];
  },
};

export default nextConfig;

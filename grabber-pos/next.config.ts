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
};

export default nextConfig;

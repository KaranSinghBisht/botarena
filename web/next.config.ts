import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // old showcase deep links (/?hand=7) predate the landing page
      {
        source: "/",
        has: [{ type: "query", key: "hand" }],
        destination: "/live?hand=:hand",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

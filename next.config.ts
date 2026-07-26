import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/baneplan/efteraar-foraar",
        destination: "/legacy/efteraar-foraar.html",
      },
      {
        source: "/baneplan/vinter",
        destination: "/legacy/vinter.html",
      },
    ];
  },
};

export default nextConfig;

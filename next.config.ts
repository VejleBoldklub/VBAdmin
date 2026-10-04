import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Billeder til infoskærmen sendes gennem en server action. Browseren
      // skalerer dem ned først, så de normalt er under 1 MB, men standarden på
      // 1 MB er for tæt på. Grænsen holdes under Vercels egen på 4,5 MB, så det
      // er handlingen og ikke Vercel, der afviser et for stort billede.
      bodySizeLimit: "4mb",
    },
  },
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

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.imgflip.com", pathname: "/**" },
      { protocol: "https", hostname: "imgflip.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;

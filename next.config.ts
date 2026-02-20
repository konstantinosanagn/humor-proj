import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.imgflip.com", pathname: "/**" },
      { protocol: "https", hostname: "imgflip.com", pathname: "/**" },
      { protocol: "https", hostname: "images.almostcrackd.ai", pathname: "/**" },
    ],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['lottie.host'], // Add the domain for your Lottie animations
  },
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
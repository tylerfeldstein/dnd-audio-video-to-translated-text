import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb', // Increase the body size limit for server actions
    },
  },
  images: {
    domains: ['images.unsplash.com'],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // Increase the body size limit for server actions
    },
  },
};

export default nextConfig;

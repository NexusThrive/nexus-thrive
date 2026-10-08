import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "gymcarlos.lvh.me",
    "gymcarlos.lvh.me:3000",
    "*.lvh.me",
    "*.lvh.me:3000",
    "lvh.me",
    "lvh.me:3000",
    "localhost:3000",
  ],
  // Los packs APU reales superan los límites por defecto (Server Actions 1 MB,
  // proxy 10 MB) — el MASTER PACK pesa ~16 MB.
  experimental: {
    serverActions: { bodySizeLimit: "20mb" },
    proxyClientMaxBodySize: "20mb",
  },
};

export default nextConfig;
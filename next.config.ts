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
};

export default nextConfig;

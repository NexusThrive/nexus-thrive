import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Acceso al dev server desde el móvil (bluetooth-free): sin estos Hosts,
  // Next dev bloquea los recursos y la página queda en blanco.
  allowedDevOrigins: [
    "gymcarlos.lvh.me",
    "gymcarlos.lvh.me:3000",
    "*.lvh.me",
    "*.lvh.me:3000",
    "lvh.me",
    "lvh.me:3000",
    "localhost:3000",
    "archlinux-2026-08-08.tail07d332.ts.net",
    "archlinux-2026-08-08.tail07d332.ts.net:3000",
    "*.tail07d332.ts.net",
    "*.tail07d332.ts.net:3000",
    "100.96.105.83",
    "100.96.105.83:3000",
    "192.168.1.114",
    "192.168.1.114:3000",
  ],
  // Los packs APU reales superan los límites por defecto (Server Actions 1 MB,
  // proxy 10 MB) — el MASTER PACK pesa ~16 MB.
  experimental: {
    serverActions: { bodySizeLimit: "20mb" },
    proxyClientMaxBodySize: "20mb",
  },
};

export default nextConfig;
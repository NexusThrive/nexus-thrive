import type { NextConfig } from "next";

/** Cada host se acepta con y sin el puerto 3000 del dev server. */
function devOriginsFromEnv(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean)
    .flatMap((host) => [host, `${host}:3000`]);
}

const nextConfig: NextConfig = {
  // Hosts extra del dev server (acceso desde el móvil por Tailscale/LAN):
  // sin ellos, Next dev bloquea los recursos y la página queda en blanco.
  // Los propios de cada máquina van en `.env` (no versionado), separados por
  // coma: DEV_ALLOWED_ORIGINS="mi-host.ts.net,192.168.1.10".
  allowedDevOrigins: [
    "*.lvh.me",
    "*.lvh.me:3000",
    "lvh.me",
    "lvh.me:3000",
    "localhost:3000",
    "localhost:3001",
    ...devOriginsFromEnv(process.env.DEV_ALLOWED_ORIGINS),
  ],
  // Los packs APU reales superan los límites por defecto (Server Actions 1 MB,
  // proxy 10 MB) — el MASTER PACK pesa ~16 MB.
  experimental: {
    serverActions: { bodySizeLimit: "20mb" },
    proxyClientMaxBodySize: "20mb",
  },
};

export default nextConfig;
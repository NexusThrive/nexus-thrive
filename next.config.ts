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
  // El service worker nunca se sirve desde caché HTTP: si no, una versión
  // nueva tardaría hasta 24 h en detectarse.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  // Rutas anteriores a la reorganización de construcción (obras, carpetas de
  // cotizaciones y catálogo APU separados).
  async redirects() {
    return [
      { source: "/:tenant/quotes/projects", destination: "/:tenant/projects", permanent: false },
      { source: "/:tenant/quotes/projects/:path*", destination: "/:tenant/projects/:path*", permanent: false },
      { source: "/:tenant/quotes/import", destination: "/:tenant/catalog/import", permanent: false },
      { source: "/:tenant/quotes/new", destination: "/:tenant/projects", permanent: false },
      { source: "/:tenant/quotes/:id/explosion", destination: "/:tenant/quotes/:id", permanent: false },
    ];
  },
  // Los packs APU reales superan los límites por defecto (Server Actions 1 MB,
  // proxy 10 MB) — el MASTER PACK pesa ~16 MB.
  experimental: {
    serverActions: { bodySizeLimit: "20mb" },
    proxyClientMaxBodySize: "20mb",
  },
};

export default nextConfig;
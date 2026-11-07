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
      // Ficha de contacto: antes vivía en /crm/<id>; /crm ahora es el embudo comercial.
      { source: "/:tenant/crm/:id([0-9a-f-]{36})", destination: "/:tenant/contactos/:id", permanent: true },
      { source: "/:tenant/crm/:id([0-9a-f-]{36})/:path*", destination: "/:tenant/contactos/:id/:path*", permanent: true },
      { source: "/:tenant/inicio", destination: "/:tenant", permanent: true },
      { source: "/:tenant/quotes/projects", destination: "/:tenant/proyectos", permanent: true },
      { source: "/:tenant/quotes/projects/:path*", destination: "/:tenant/proyectos/:path*", permanent: true },
      { source: "/:tenant/quotes/import", destination: "/:tenant/inventario/productos/import", permanent: true },
      { source: "/:tenant/quotes/new", destination: "/:tenant/proyectos", permanent: true },
      { source: "/:tenant/quotes/:id/explosion", destination: "/:tenant/ventas/cotizaciones/anteriores/:id", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/oportunidades", destination: "/:tenant/crm", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/oportunidades/:path*", destination: "/:tenant/crm/:path*", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/tareas", destination: "/:tenant/crm/tareas", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/tareas/:path*", destination: "/:tenant/crm/tareas/:path*", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/formularios", destination: "/:tenant/crm/formularios", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/formularios/:path*", destination: "/:tenant/crm/formularios/:path*", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/entregables", destination: "/:tenant/proyectos/entregables", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/entregables/:path*", destination: "/:tenant/proyectos/entregables/:path*", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/orders", destination: "/:tenant/ventas/pedidos", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/orders/:path*", destination: "/:tenant/ventas/pedidos/:path*", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/pos", destination: "/:tenant/ventas/pos", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/pos/:path*", destination: "/:tenant/ventas/pos/:path*", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/cobros", destination: "/:tenant/ventas/cobros", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/cobros/:path*", destination: "/:tenant/ventas/cobros/:path*", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/cotizaciones", destination: "/:tenant/ventas/cotizaciones", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/cotizaciones/:path*", destination: "/:tenant/ventas/cotizaciones/:path*", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/quotes", destination: "/:tenant/ventas/cotizaciones/anteriores", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/quotes/:path*", destination: "/:tenant/ventas/cotizaciones/anteriores/:path*", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/finance", destination: "/:tenant/finanzas", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/finance/:path*", destination: "/:tenant/finanzas/:path*", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/dinero", destination: "/:tenant/finanzas/dinero", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/dinero/:path*", destination: "/:tenant/finanzas/dinero/:path*", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/cartera", destination: "/:tenant/finanzas/cartera", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/cartera/:path*", destination: "/:tenant/finanzas/cartera/:path*", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/billing", destination: "/:tenant/finanzas/facturacion", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/billing/:path*", destination: "/:tenant/finanzas/facturacion/:path*", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/factura-electronica", destination: "/:tenant/finanzas/facturacion-electronica", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/factura-electronica/:path*", destination: "/:tenant/finanzas/facturacion-electronica/:path*", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/contabilidad", destination: "/:tenant/finanzas/contabilidad", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/contabilidad/:path*", destination: "/:tenant/finanzas/contabilidad/:path*", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/taxes", destination: "/:tenant/finanzas/impuestos", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/taxes/:path*", destination: "/:tenant/finanzas/impuestos/:path*", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/purchases", destination: "/:tenant/compras", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/purchases/:path*", destination: "/:tenant/compras/:path*", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/stock", destination: "/:tenant/inventario/existencias", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/stock/:path*", destination: "/:tenant/inventario/existencias/:path*", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/inventory", destination: "/:tenant/inventario/productos", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/inventory/:path*", destination: "/:tenant/inventario/productos/:path*", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/catalog", destination: "/:tenant/proyectos/catalogo-apu", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/catalog/:path*", destination: "/:tenant/proyectos/catalogo-apu/:path*", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/projects", destination: "/:tenant/proyectos", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/projects/:path*", destination: "/:tenant/proyectos/:path*", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/sitio", destination: "/:tenant/presencia/sitio", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/sitio/:path*", destination: "/:tenant/presencia/sitio/:path*", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/google", destination: "/:tenant/presencia/google", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/google/:path*", destination: "/:tenant/presencia/google/:path*", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/crecimiento", destination: "/:tenant/presencia/crecimiento", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/crecimiento/:path*", destination: "/:tenant/presencia/crecimiento/:path*", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/whatsapp", destination: "/:tenant/canales/whatsapp", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/whatsapp/:path*", destination: "/:tenant/canales/whatsapp/:path*", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/conversaciones", destination: "/:tenant/canales/conversaciones", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/conversaciones/:path*", destination: "/:tenant/canales/conversaciones/:path*", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/avisos", destination: "/:tenant/canales/avisos", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/avisos/:path*", destination: "/:tenant/canales/avisos/:path*", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/pedidos-tienda", destination: "/:tenant/ventas/pedidos", permanent: true },
      { source: "/:tenant((?!(?:api|admin|auth|c|encuesta|entregable|invitacion|l|onboarding|pay|pricing|r|registro|s|fonts|styles|_next|sign-in|sign-up)$)[^/]+)/pedidos-tienda/:path*", destination: "/:tenant/ventas/pedidos/:path*", permanent: true },
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
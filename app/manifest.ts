import type { MetadataRoute } from "next";

/**
 * Manifiesto de la app instalable. `start_url` es la raíz: allí `proxy.ts`
 * decide según la sesión (acceso, onboarding o el negocio de la persona), así
 * que sirve a cualquier cuenta sin conocer su slug.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "NEXUS THRIVE",
    short_name: "NEXUS",
    description: "Gestión de tu negocio: clientes, cobros, agenda e inventario.",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#000000",
    theme_color: "#000000",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

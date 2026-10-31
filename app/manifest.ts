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
    // Un solo icono: el SVG de la marca (`app/icon.svg`, sin fondo). Sin PNG ni `favicon.ico`.
    // iOS no admite SVG y usa `apple-touch-icon.png` (declarado en `app/layout.tsx`).
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}

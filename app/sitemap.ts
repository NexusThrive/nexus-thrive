import type { MetadataRoute } from "next";

/**
 * Sitemap de las páginas públicas de esta aplicación.
 *
 * Solo incluye rutas estáticas reales. Las páginas por negocio y las rutas con
 * token (recibos, encuestas, pagos, invitaciones) no se listan: son privadas y
 * robots.txt las excluye.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.nexusthrive.com.co").replace(/\/+$/, "");
  return [
    {
      url: `${base}/`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${base}/pricing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}

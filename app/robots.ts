import type { MetadataRoute } from "next";

/**
 * robots.txt de la aplicación.
 *
 * La landing pública vive en otro repositorio (`nexusthrive.com.co`); aquí solo
 * se indexan las páginas públicas reales de este proyecto. El panel CEO, la app
 * multiempresa, el onboarding, la autenticación y las rutas con token no se
 * indexan: exponen datos de negocios o enlaces de un solo uso.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/admin",
        "/api/",
        "/onboarding",
        "/sign-in",
        "/sign-up",
        "/r/",
        "/c/",
        "/pay/",
        "/encuesta/",
        "/invitacion/",
      ],
    },
    sitemap: `${(process.env.NEXT_PUBLIC_APP_URL ?? "https://app.nexusthrive.com.co").replace(/\/+$/, "")}/sitemap.xml`,
  };
}

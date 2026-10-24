/**
 * Mini-sitio del negocio (reglas puras): plantillas, textos por defecto, validación y SEO técnico
 * (título, descripción, datos estructurados, sitemap y robots). Sin base de datos: se prueba aparte.
 */
export const TEMPLATES = {
  clasica: { label: "Clásica", bg: "#FFFFFF", fg: "#0B0B0C", muted: "#5E5D63", card: "#F7F6F3" },
  moderna: { label: "Moderna", bg: "#F4F1EA", fg: "#111111", muted: "#55534E", card: "#FFFFFF" },
  oscura: { label: "Oscura", bg: "#0B0B0C", fg: "#F7F6F3", muted: "#B5B3AE", card: "#18181A" },
  minimal: { label: "Minimal", bg: "#FFFFFF", fg: "#1A1A1A", muted: "#6B6B6B", card: "#FFFFFF" },
} as const;
export type TemplateKey = keyof typeof TEMPLATES;
export const isTemplate = (v: string): v is TemplateKey => v in TEMPLATES;

export type SiteProduct = { id: string; name: string; description: string | null; price: number; category: string | null; imageUrl: string | null };
export type SiteData = {
  slug: string;
  business: { name: string; city: string | null; address: string | null; phone: string | null; whatsapp: string | null; latitude: number | null; longitude: number | null; instagram: string | null };
  template: TemplateKey;
  title: string;
  description: string;
  heroTitle: string;
  heroSubtitle: string;
  about: string;
  accent: string;
  showCatalog: boolean;
  showMap: boolean;
  products: SiteProduct[];
};

/** Textos por defecto cuando el negocio aún no escribió los suyos (para que el sitio nunca salga vacío). */
export function defaultCopy(name: string, city: string | null) {
  const where = city ? ` en ${city}` : "";
  return {
    title: `${name}${where}`,
    description: `Conoce ${name}${where}: productos, servicios y cómo contactarnos por WhatsApp.`,
    heroTitle: name,
    heroSubtitle: city ? `Te esperamos en ${city}.` : "Escríbenos y te atendemos.",
    about: "",
  };
}

const SLUG = /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/;
const RESERVED = new Set(["admin", "api", "app", "auth", "sign-in", "sign-up", "onboarding", "pay", "pricing", "www", "s", "r", "c", "encuesta", "invitacion"]);

/** Dirección pública del sitio: 3–40 caracteres, minúsculas, números y guiones; sin nombres reservados. */
export function validateSiteSlug(raw: string): { ok: true; slug: string } | { ok: false; message: string } {
  const slug = raw.trim().toLowerCase();
  if (!SLUG.test(slug) || slug.includes("--")) return { ok: false, message: "La dirección usa de 3 a 40 minúsculas, números y guiones (sin empezar ni terminar en guion)." };
  if (RESERVED.has(slug)) return { ok: false, message: "Esa dirección está reservada. Prueba con otra." };
  return { ok: true, slug };
}

export const isHexColor = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);

/** Texto de color legible sobre el acento (negro o blanco, el que dé más contraste). */
export function onAccent(hex: string): "#000000" | "#FFFFFF" {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  return lum > 0.4 ? "#000000" : "#FFFFFF";
}

export const whatsappUrl = (number: string | null | undefined, text: string) => {
  const d = (number ?? "").replace(/\D/g, "");
  return d.length >= 10 ? `https://wa.me/${d}?text=${encodeURIComponent(text)}` : null;
};

export const mapUrl = (b: SiteData["business"]) =>
  b.latitude != null && b.longitude != null ? `https://www.openstreetmap.org/?mlat=${b.latitude}&mlon=${b.longitude}#map=17/${b.latitude}/${b.longitude}` : b.address ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${b.address} ${b.city ?? ""}`.trim())}` : null;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Datos estructurados (JSON-LD) para buscadores: negocio local y su catálogo. */
export function jsonLd(site: SiteData, baseUrl: string): object {
  const url = `${baseUrl}/s/${site.slug}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        "@id": `${url}#negocio`,
        name: site.business.name,
        url,
        description: site.description,
        ...(site.business.phone ? { telephone: site.business.phone } : {}),
        ...(site.business.address ? { address: { "@type": "PostalAddress", streetAddress: site.business.address, addressLocality: site.business.city ?? undefined, addressCountry: "CO" } } : {}),
        ...(site.business.latitude != null && site.business.longitude != null ? { geo: { "@type": "GeoCoordinates", latitude: site.business.latitude, longitude: site.business.longitude } } : {}),
      },
      ...(site.showCatalog ? site.products.slice(0, 50).map((p) => ({ "@type": "Product", "@id": `${url}/p/${p.id}#producto`, name: p.name, ...(p.description ? { description: p.description } : {}), ...(p.imageUrl ? { image: p.imageUrl } : {}), offers: { "@type": "Offer", price: p.price.toFixed(2), priceCurrency: "COP", availability: "https://schema.org/InStock", url: `${url}/p/${p.id}` } })) : []),
    ],
  };
}

export function sitemapXml(baseUrl: string, slug: string, productIds: readonly string[], lastmod: string): string {
  const urls = [`${baseUrl}/s/${slug}`, ...productIds.map((id) => `${baseUrl}/s/${slug}/p/${id}`)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${esc(u)}</loc><lastmod>${lastmod}</lastmod></url>`).join("\n")}\n</urlset>\n`;
}

export const robotsTxt = (baseUrl: string, slug: string, indexable: boolean) =>
  indexable ? `User-agent: *\nAllow: /s/${slug}\nSitemap: ${baseUrl}/s/${slug}/sitemap.xml\n` : `User-agent: *\nDisallow: /s/${slug}\n`;

/** Problemas de SEO que el negocio puede corregir (el editor los muestra). */
export function seoChecklist(site: Pick<SiteData, "title" | "description" | "products" | "business" | "showCatalog">): { ok: boolean; text: string }[] {
  return [
    { ok: site.title.length >= 10 && site.title.length <= 60, text: "El título tiene entre 10 y 60 caracteres." },
    { ok: site.description.length >= 70 && site.description.length <= 160, text: "La descripción tiene entre 70 y 160 caracteres." },
    { ok: Boolean(site.business.address || site.business.city), text: "Hay dirección o ciudad (negocio local)." },
    { ok: Boolean(site.business.whatsapp), text: "Hay un WhatsApp para escribirte." },
    { ok: !site.showCatalog || site.products.length > 0, text: "El catálogo mostrado tiene al menos un producto." },
  ];
}

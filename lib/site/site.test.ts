import { describe, expect, it } from "vitest";
import { defaultCopy, jsonLd, onAccent, robotsTxt, seoChecklist, sitemapXml, validateSiteSlug, whatsappUrl, mapUrl, type SiteData } from "./site";

const site: SiteData = {
  slug: "simplapp", template: "clasica", title: "Simplapp Gym en Bogotá", description: "Gimnasio con clases grupales, entrenamiento personalizado y planes mensuales para todos los niveles en el norte de Bogotá.",
  heroTitle: "Simplapp", heroSubtitle: "Entrena con nosotros", about: "", accent: "#D4AF37", showCatalog: true, showMap: true,
  business: { name: "Simplapp Gym", city: "Bogotá", address: "Calle 80 # 12-34", phone: "+57 300 123 4567", whatsapp: "+57 300 123 4567", latitude: 4.7, longitude: -74.05, instagram: "simplapp" },
  products: [{ id: "p1", name: "Plan mensual", description: "Acceso total", price: 120_000, category: "Planes", imageUrl: null }],
};

describe("mini-sitio", () => {
  it("valida la dirección del sitio", () => {
    expect(validateSiteSlug(" Mi-Gimnasio ")).toEqual({ ok: true, slug: "mi-gimnasio" });
    for (const bad of ["ab", "-malo", "malo-", "con espacio", "dos--guiones", "admin", "pay", "ñandú"]) expect(validateSiteSlug(bad).ok).toBe(false);
  });
  it("textos por defecto con ciudad o sin ella", () => {
    expect(defaultCopy("Café Sol", "Cali").title).toBe("Café Sol en Cali");
    expect(defaultCopy("Café Sol", null).heroSubtitle).toContain("Escríbenos");
  });
  it("el color del texto sobre el acento siempre es legible", () => {
    expect(onAccent("#D4AF37")).toBe("#000000");
    expect(onAccent("#111111")).toBe("#FFFFFF");
    expect(onAccent("#FFFFFF")).toBe("#000000");
  });
  it("enlaces de WhatsApp y mapa", () => {
    expect(whatsappUrl("+57 300 123 4567", "Hola & más")).toBe("https://wa.me/573001234567?text=Hola%20%26%20m%C3%A1s");
    expect(whatsappUrl("123", "x")).toBeNull();
    expect(mapUrl(site.business)).toContain("mlat=4.7");
    expect(mapUrl({ ...site.business, latitude: null, longitude: null })).toContain("search?query=Calle%2080");
  });
  it("datos estructurados: negocio local y producto con oferta", () => {
    const ld = jsonLd(site, "https://app.nexus.co") as { "@graph": Record<string, unknown>[] };
    expect(ld["@graph"][0]).toMatchObject({ "@type": "LocalBusiness", name: "Simplapp Gym", geo: { latitude: 4.7 } });
    expect(ld["@graph"][1]).toMatchObject({ "@type": "Product", offers: { price: "120000.00", priceCurrency: "COP" } });
    expect(jsonLd({ ...site, showCatalog: false }, "https://x.co")["@graph" as never]).toHaveLength(1);
  });
  it("sitemap y robots", () => {
    const xml = sitemapXml("https://app.nexus.co", "simplapp", ["p1", "p2"], "2026-10-24");
    expect(xml).toContain("<loc>https://app.nexus.co/s/simplapp</loc>");
    expect(xml).toContain("<loc>https://app.nexus.co/s/simplapp/p/p2</loc>");
    expect(robotsTxt("https://app.nexus.co", "simplapp", true)).toContain("Sitemap: https://app.nexus.co/s/simplapp/sitemap.xml");
    expect(robotsTxt("https://app.nexus.co", "simplapp", false)).toContain("Disallow: /s/simplapp");
  });
  it("lista de SEO marca lo que falta", () => {
    expect(seoChecklist(site).every((c) => c.ok)).toBe(true);
    const bad = seoChecklist({ ...site, title: "Corto", description: "x", products: [], business: { ...site.business, whatsapp: null, address: null, city: null } });
    expect(bad.filter((c) => !c.ok)).toHaveLength(5);
  });
});

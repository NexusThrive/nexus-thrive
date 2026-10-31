import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

/**
 * Los archivos `app/robots.ts` y `app/sitemap.ts` son route handlers de
 * metadata: se pueden ejecutar como funciones. Estas pruebas fijan el contrato
 * que hoy no tiene cobertura: rutas privadas excluidas y solo páginas públicas
 * reales en el sitemap.
 */
describe("metadata routes", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("robots excluye panel, API y rutas con token", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.nexusthrive.com.co/");
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    const disallow = rules.disallow ?? [];

    expect(result.sitemap).toBe("https://app.nexusthrive.com.co/sitemap.xml");
    for (const path of [
      "/admin",
      "/admin/",
      "/api/",
      "/onboarding",
      "/r/",
      "/c/",
      "/invitacion/",
    ]) {
      expect(disallow).toContain(path);
    }
  });

  it("sitemap solo lista páginas públicas reales", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.nexusthrive.com.co");
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toEqual([
      "https://app.nexusthrive.com.co/",
      "https://app.nexusthrive.com.co/pricing",
    ]);
    // Ninguna ruta con token o de operación puede terminar en el sitemap.
    expect(urls.some((url) => /\/(admin|api|r|c|pay|encuesta|invitacion)\//.test(url))).toBe(false);
  });
});
